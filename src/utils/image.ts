// Returns true if the first bytes of the file match the JPEG magic number (FF D8 FF).
// Used to short-circuit HEIC detection when iOS gives us a JPEG with a .heic name/empty type.
async function hasJpegMagicBytes(file: File): Promise<boolean> {
  try {
    const slice = await file.slice(0, 3).arrayBuffer();
    const bytes = new Uint8Array(slice);
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  } catch {
    return false;
  }
}

export async function compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<File> {
  // HEIC/HEIF detection: trust an explicit HEIC MIME type, otherwise fall back to the
  // filename extension only when the MIME type is missing/unknown. iOS sometimes
  // auto-converts HEIC photos to JPEG on upload while keeping the .heic extension —
  // in that case file.type is 'image/jpeg' and heic2any would throw
  // "ERR_USER Image is already browser readable: image/jpeg".
  // When the MIME type is absent entirely (empty string), check the magic bytes so we
  // don't call heic2any on a JPEG that just happens to have a .heic filename.
  const hasHeicExt = /\.(heic|heif)$/i.test(file.name);
  const mimeUnknown = !file.type || file.type === 'application/octet-stream';
  let isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    (hasHeicExt && mimeUnknown);

  // Magic bytes check: if extension/type says HEIC but bytes are JPEG, treat as JPEG.
  if (isHeic && mimeUnknown && await hasJpegMagicBytes(file)) {
    isHeic = false;
  }

  // Non-image, non-HEIC files pass through unchanged.
  // Exception: files with an unknown/empty MIME type that turn out to be JPEG
  // (magic bytes FF D8 FF) still get run through canvas compression so the upload
  // receives a properly-typed image/jpeg File.
  if (!file.type.startsWith('image/') && !isHeic) {
    if (mimeUnknown && await hasJpegMagicBytes(file)) {
      // Fall through to canvas compression — the output File will have type: 'image/jpeg'.
    } else {
      return file;
    }
  }

  let processedFile = file;
  if (isHeic) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    const jpegName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    processedFile = new File([blob], jpegName, { type: 'image/jpeg', lastModified: Date.now() });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Output as JPEG for universal compatibility (DOCX, PDF, browsers)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const jpgName = processedFile.name.replace(/\.[^/.]+$/, '.jpg');
              resolve(new File([blob], jpgName, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
}
