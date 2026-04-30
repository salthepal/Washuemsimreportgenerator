export async function compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<File> {
  // HEIC/HEIF detection: trust an explicit HEIC MIME type, otherwise fall back to the
  // filename extension only when the MIME type is missing/unknown. iOS sometimes
  // auto-converts HEIC photos to JPEG on upload while keeping the .heic extension —
  // in that case file.type is 'image/jpeg' and heic2any would throw
  // "ERR_USER Image is already browser readable: image/jpeg".
  const hasHeicExt = /\.(heic|heif)$/i.test(file.name);
  const mimeUnknown = !file.type || file.type === 'application/octet-stream';
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    (hasHeicExt && mimeUnknown);

  if (!file.type.startsWith('image/') && !isHeic) {
    return file;
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
