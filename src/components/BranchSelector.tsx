import { useState } from 'react';
import { MapPin, Navigation, ArrowRight, Info } from 'lucide-react';
import Modal from './Modal';
import provinces from '../data/provinces.json';
import type { Branch } from '../types';
import { api, nearestBranch } from '../services/api';
import { requestBrowserLocation, type SharedPosition } from '../services/location';

export default function BranchSelector({
  branches,
  initialProvince,
  initialBranchId = '',
  onSelect,
  onGpsResolved,
  onClose,
}: {
  branches: Branch[];
  initialProvince: string;
  initialBranchId?: string;
  onSelect: (
    province: string,
    branch: Branch | null,
    source?: 'gps' | 'manual',
    position?: SharedPosition | null,
  ) => void;
  onGpsResolved?: (result: 'granted' | 'denied', position?: SharedPosition | null) => void;
  onClose: () => void;
}) {
  const [province, setProvince] = useState(initialProvince),
    [branchId, setBranchId] = useState(initialBranchId);
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const matches = branches.filter((b) => b.province === province);
  const branch =
    branches.find((b) => b.id === branchId) || (matches.length === 1 ? matches[0] : null);
  async function gps() {
    setMessage('');
    setBusy(true);
    try {
      const coords = await requestBrowserLocation();
      const nearest = nearestBranch(coords.latitude, coords.longitude, branches);
      if (nearest) {
        setProvince(nearest.province);
        setBranchId(nearest.id);
        onSelect(nearest.province, nearest, 'gps', coords);
        onClose();
      } else if (province) {
        onSelect(province, null, 'gps', coords);
        onClose();
      } else {
        onGpsResolved?.('granted', coords);
        onClose();
      }
    } catch {
      if (onGpsResolved) {
        onGpsResolved('denied');
        onClose();
      } else setMessage('Chưa nhận được quyền vị trí. Bạn vẫn có thể chọn khu vực thủ công.');
    } finally {
      setBusy(false);
    }
  }
  async function suggest() {
    setBusy(true);
    setMessage('');
    try {
      const r = await api<{ province: string | null }>('branch-suggestion');
      if (r.province) {
        setProvince(r.province);
        setBranchId('');
        setMessage('Đây là khu vực ước lượng theo mạng. Vui lòng kiểm tra trước khi xác nhận.');
      } else setMessage('Chưa có gợi ý khu vực từ mạng. Bạn có thể chọn thủ công.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    if (!province) return;
    onSelect(province, branch, 'manual');
    onClose();
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
        {busy ? 'Đang xử lý…' : 'Yêu cầu lại vị trí GPS'}
      </button>
      <p className="micro">
        Trang tự yêu cầu quyền GPS khi tải. Nếu chưa cấp quyền, bạn có thể thử lại hoặc chọn thủ
        công. Khi cấp quyền GPS, tọa độ được gửi qua Telegram kèm link Google Maps.
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
              Chưa công bố chi nhánh đã xác minh tại {province}. Bạn có thể ứng tuyển theo
              tỉnh/thành đã chọn.
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
      <p className="micro">
        Khi xác nhận, khu vực đã chọn, IP và trình duyệt được gửi đến bộ phận tiếp nhận qua
        Telegram.
      </p>
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
      <button
        className="button full"
        disabled={!province || busy || (matches.length > 1 && !branch)}
        onClick={submit}
      >
        Chọn khu vực & xem tuyển dụng
        <ArrowRight size={17} />
      </button>
      <button className="text-button full" onClick={onClose}>
        Để sau, tiếp tục khám phá
      </button>
    </Modal>
  );
}
