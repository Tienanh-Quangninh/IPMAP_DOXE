import { useState } from 'react';
import { MapPin, Navigation, ArrowRight, Info } from 'lucide-react';
import Modal from './Modal';
import Turnstile from './Turnstile';
import provinces from '../data/provinces.json';
import type { Branch } from '../types';
import { api, ApiError, nearestBranch } from '../services/api';
import { eventIdFor } from '../services/events';

export default function BranchSelector({
  branches,
  initialProvince,
  onSelect,
  onClose,
}: {
  branches: Branch[];
  initialProvince: string;
  onSelect: (province: string, branch: Branch | null) => void;
  onClose: () => void;
}) {
  const [province, setProvince] = useState(initialProvince),
    [branchId, setBranchId] = useState(''),
    [sharing, setSharing] = useState(false),
    [source, setSource] = useState<'gps' | 'manual'>('manual');
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(''),
    [reset, setReset] = useState(0),
    [uncertain, setUncertain] = useState(false);
  const matches = branches.filter((b) => b.province === province);
  const branch =
    branches.find((b) => b.id === branchId) || (matches.length === 1 ? matches[0] : null);
  async function gps() {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('Trình duyệt không hỗ trợ định vị. Bạn có thể chọn khu vực bên dưới.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = nearestBranch(pos.coords.latitude, pos.coords.longitude, branches);
        if (nearest) {
          setProvince(nearest.province);
          setBranchId(nearest.id);
          setSource('gps');
          setMessage(
            'Đã tìm cơ sở gần nhất trong danh sách đã xác minh. Tọa độ chỉ xử lý trên thiết bị của bạn.',
          );
        } else
          setMessage(
            'Chưa có dữ liệu cơ sở được xác minh để đối chiếu GPS. Vui lòng chọn tỉnh/thành bên dưới.',
          );
        setBusy(false);
      },
      () => {
        setBusy(false);
        setMessage('Chưa nhận được quyền vị trí. Bạn vẫn có thể chọn khu vực thủ công.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  async function suggest() {
    setBusy(true);
    setMessage('');
    try {
      const r = await api<{ province: string | null }>('branch-suggestion');
      if (r.province) {
        setProvince(r.province);
        setBranchId('');
        setSource('manual');
        setMessage('Đây là khu vực ước lượng theo mạng. Vui lòng kiểm tra trước khi xác nhận.');
      } else setMessage('Chưa có gợi ý khu vực từ mạng. Bạn có thể chọn thủ công.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!province) return;
    setMessage('');
    if (sharing && branch) {
      if (uncertain) return;
      if (!token) {
        setMessage('Vui lòng hoàn thành xác minh bảo mật.');
        return;
      }
      setBusy(true);
      try {
        const payload = { province, branchId: branch.id, source, consent: true };
        const eventId = await eventIdFor('location', payload);
        await api('location-consent', { ...payload, eventId, turnstileToken: token });
        onSelect(province, branch);
        onClose();
      } catch (e) {
        if (e instanceof ApiError && e.code === 'DELIVERY_UNKNOWN') setUncertain(true);
        setMessage((e as Error).message);
        setToken('');
        setReset((n) => n + 1);
      } finally {
        setBusy(false);
      }
    } else {
      onSelect(province, branch);
      onClose();
    }
  }
  return (
    <Modal title="Chọn chi nhánh" onClose={onClose}>
      <div className="modal-symbol">
        <MapPin size={25} />
      </div>
      <h2>
        ĐAM MÊ KHÔNG
        <br />
        KHOẢNG CÁCH.
      </h2>
      <p className="muted">Chọn khu vực để tìm dịch vụ và cơ hội nghề nghiệp phù hợp với bạn.</p>
      <button className="button button-outline full" disabled={busy} onClick={gps}>
        <Navigation size={17} />
        {busy ? 'Đang xử lý…' : 'Đồng ý dùng GPS trên thiết bị'}
      </button>
      <p className="micro">
        GPS chỉ được yêu cầu khi bạn nhấn nút. Tọa độ không gửi đến máy chủ hoặc Telegram.
      </p>
      <button className="text-button full" onClick={suggest} disabled={busy}>
        Gợi ý tỉnh/thành theo mạng (ước lượng)
      </button>
      <div className="or">
        <span>HOẶC CHỌN THỦ CÔNG</span>
      </div>
      <label className="field">
        Tỉnh / thành phố
        <select
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setBranchId('');
            setSource('manual');
            setMessage('');
          }}
        >
          <option value="">Chọn tỉnh / thành phố</option>
          {provinces.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.aliases.length ? ` (${p.aliases.join(', ')})` : ''}
            </option>
          ))}
        </select>
      </label>
      {matches.length > 1 && (
        <label className="field">
          Chi nhánh
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Chọn cơ sở</option>
            {matches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        </label>
      )}
      {province &&
        (!matches.length ? (
          <div className="info-box">
            <Info size={18} />
            <span>
              Chưa công bố chi nhánh đã xác minh tại {province}. Khu vực bạn chọn chỉ lưu trên thiết
              bị này.
            </span>
          </div>
        ) : (
          branch && (
            <div className="info-box">
              <MapPin size={18} />
              <span>
                <strong>{branch.name}</strong>
                <br />
                {branch.address}
              </span>
            </div>
          )
        ))}
      {branch && (
        <>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={sharing}
              onChange={(e) => setSharing(e.target.checked)}
            />
            <span>
              Tôi đồng ý gửi tên khu vực, chi nhánh và nguồn chọn đến bộ phận vận hành qua Telegram.
              Không gửi tọa độ chính xác hoặc IP.
            </span>
          </label>
          {sharing && <Turnstile action="location" onToken={setToken} resetKey={reset} />}
        </>
      )}
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      <button
        className="button full"
        disabled={!province || busy || (sharing && uncertain) || (matches.length > 1 && !branch)}
        onClick={submit}
      >
        {sharing && branch ? 'Xác nhận & chia sẻ khu vực' : 'Xác nhận khu vực'}
        <ArrowRight size={17} />
      </button>
      <button className="text-button full" onClick={onClose}>
        Để sau, tiếp tục khám phá
      </button>
    </Modal>
  );
}
