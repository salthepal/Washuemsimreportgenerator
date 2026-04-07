import { useEffect, useRef } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  siteKey?: string;
}

export function Turnstile({ onVerify, siteKey }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Default sitekey for WashU EM Sim Intelligence (Cloudflare managed)
  const defaultSiteKey = '0x4AAAAAAAx_6_o_p_q_r_s_t_u'; // Placeholder - replace with actual if known

  useEffect(() => {
    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const renderWidget = () => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey || defaultSiteKey,
          callback: (token: string) => {
            onVerify(token);
          },
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.body.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      // Cleanup widget on unmount if possible
      if (widgetIdRef.current && window.turnstile) {
        // window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify, siteKey]);

  return <div ref={containerRef} className="my-4" />;
}

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: any) => string;
      remove: (id: string) => void;
    };
  }
}
