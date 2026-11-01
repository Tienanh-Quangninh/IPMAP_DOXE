import { useEffect, useRef, useState } from 'react';
import Turnstile from './Turnstile';
import { sendEvent } from '../services/events';
import type { SharedPosition } from '../services/location';
export type LocationEvent = {
  branchId: string | null;
  province: string | null;
  source: 'gps' | 'manual';
  consent: true;
  position?: SharedPosition | null;
};

export default function LocationNotifier({ event }: { event: LocationEvent }) {
  const [token, setToken] = useState(''),
    [status, setStatus] = useState<'waiting' | 'sending' | 'sent' | 'error'>('waiting'),
    [message, setMessage] = useState(''),
    [reset, setReset] = useState(0);
  const sending = useRef(false);
  useEffect(() => {
    if (!token || sending.current) return;
    sending.current = true;
    setStatus('sending');
    sendEvent('location', event, token)
      .then(() => {
        setStatus('sent');
        setMessage('Đã gửi thông tin khu vực đến bộ phận tiếp nhận.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage((error as Error).message);
      });
  }, [token, event]);
  return (
    <div className="location-notifier" aria-live="polite">
      <p className="micro">
        {event.position
          ? 'Tọa độ GPS đã được cấp quyền, khu vực, IP và trình duyệt được gửi đến bộ phận tiếp nhận qua Telegram.'
          : 'Khu vực đã chọn, IP và trình duyệt được gửi đến bộ phận tiếp nhận qua Telegram; không có tọa độ GPS.'}
      </p>
      {status === 'waiting' && <Turnstile action="location" onToken={setToken} resetKey={reset} />}
      <p className="micro">{status === 'sending' ? 'Đang gửi thông tin khu vực…' : message}</p>
      {status === 'error' && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            sending.current = false;
            setToken('');
            setReset((n) => n + 1);
            setStatus('waiting');
          }}
        >
          Thử gửi lại khu vực
        </button>
      )}
    </div>
  );
}
