import { useEffect, useRef } from 'react';
type Widget = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Widget;
  }
}
let loading: Promise<void> | null = null;
function load() {
  if (window.turnstile) return Promise.resolve();
  if (!loading)
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error('Không tải được xác minh bảo mật.'));
      };
      document.head.appendChild(s);
    });
  return loading;
}
export default function Turnstile({
  action,
  onToken,
  resetKey = 0,
}: {
  action: 'location' | 'apply';
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const el = useRef<HTMLDivElement>(null),
    callback = useRef(onToken);
  callback.current = onToken;
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey) return;
    let disposed = false,
      id: string | undefined;
    load()
      .then(() => {
        if (!disposed && el.current && window.turnstile)
          id = window.turnstile.render(el.current, {
            sitekey: siteKey,
            action,
            theme: 'dark',
            callback: (t: string) => callback.current(t),
            'expired-callback': () => callback.current(''),
            'error-callback': () => callback.current(''),
          });
      })
      .catch(() => callback.current(''));
    return () => {
      disposed = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [action, siteKey, resetKey]);
  return siteKey ? (
    <div ref={el} className="turnstile" />
  ) : (
    <p className="form-notice">
      Kênh tiếp nhận đang được thiết lập. Biểu mẫu sẽ mở khi xác minh bảo mật được cấu hình.
    </p>
  );
}
