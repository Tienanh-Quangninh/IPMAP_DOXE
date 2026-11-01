import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import Turnstile from './Turnstile';
import type { Branch, Job } from '../types';
import { ApiError } from '../services/api';
import { eventIdFor, sendEvent } from '../services/events';
import provinces from '../data/provinces.json';
import LocationNotifier, { type LocationEvent } from './LocationNotifier';
export default function ApplicationForm({
  branch,
  job: initialJob,
  availableJobs = [],
  locationEvent,
  initialProvince = '',
  onClose,
}: {
  branch: Branch | null;
  job: Job | null;
  availableJobs?: Job[];
  locationEvent?: LocationEvent | null;
  initialProvince?: string;
  onClose: () => void;
}) {
  const [jobId, setJobId] = useState(initialJob?.id || availableJobs[0]?.id || '');
  const job = availableJobs.find((j) => j.id === jobId) || initialJob;
  const [province, setProvince] = useState(branch?.province || initialProvince);
  useEffect(() => {
    if (!province && (branch?.province || initialProvince))
      setProvince(branch?.province || initialProvince);
  }, [branch?.province, initialProvince, province]);
  const canApply = !!job && (job.scope === 'national' || !!branch);
  const [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(false),
    [reset, setReset] = useState(0),
    [eventId, setEventId] = useState(''),
    [uncertain, setUncertain] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canApply || !job || !province || !token || uncertain) return;
    setBusy(true);
    setError('');
    const d = new FormData(e.currentTarget);
    const payload = {
      branchId: branch?.id || null,
      province,
      jobId: job.id,
      name: d.get('name'),
      birthYear: Number(d.get('birthYear')),
      phone: d.get('phone'),
      education: d.get('education'),
      experience: Number(d.get('experience')),
      skills: d.get('skills'),
      vehicle: job.vehicle === 'any' ? d.get('vehicle') : job.vehicle,
      submitted: true,
      website: d.get('website'),
    };
    let id = '';
    try {
      id = await eventIdFor('apply', payload);
      setEventId(id);
      await sendEvent('apply', payload, token);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DELIVERY_UNKNOWN') setUncertain(true);
      setError(`${(err as Error).message}${id ? ' Mã hồ sơ: ' + id : ''}`);
      setToken('');
      setReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Thông tin ứng tuyển" onClose={onClose} wide>
      {success ? (
        <div className="success">
          <CheckCircle2 size={52} />
          <h2>ĐÃ TIẾP NHẬN HỒ SƠ.</h2>
          <p>Bộ phận tuyển dụng đã nhận thông tin qua Telegram.</p>
          <p className="micro">Mã hồ sơ: {eventId}</p>
          <button className="button" onClick={onClose}>
            Hoàn tất
          </button>
        </div>
      ) : (
        <>
          <span className="eyebrow orange">BUILD YOUR NEXT CHAPTER</span>
          <h2>
            ĐAM MÊ CỦA BẠN.
            <br />
            ĐỘI NGŨ CỦA CHÚNG TÔI.
          </h2>
          <p className="muted">
            {job && canApply
              ? `${job.title} · ${branch?.name || 'Tiếp nhận toàn quốc'}`
              : 'Xem trước biểu mẫu. Chưa có vị trí tuyển dụng được xác minh, hiện chưa tiếp nhận hồ sơ.'}
          </p>
          {locationEvent && <LocationNotifier event={locationEvent} />}
          <form onSubmit={submit}>
            {availableJobs.length > 1 && (
              <label className="field">
                Vị trí ứng tuyển *
                <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              Tỉnh / thành phố mong muốn *
              <select
                name="province"
                value={province}
                required
                disabled={!!branch}
                onChange={(e) => setProvince(e.target.value)}
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
            <div className="form-grid">
              <label className="field">
                Họ và tên *
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="field">
                Năm sinh *
                <input
                  name="birthYear"
                  inputMode="numeric"
                  type="number"
                  min={new Date().getFullYear() - 100}
                  max={new Date().getFullYear() - 16}
                  required
                  placeholder="2000"
                />
              </label>
              <label className="field">
                Số điện thoại *
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  pattern="(0[0-9]{9}|\+84[0-9]{9})"
                  placeholder="09xxxxxxxx"
                />
              </label>
              <label className="field">
                Trình độ học vấn
                <select name="education">
                  <option value="none">Không có</option>
                  <option value="THCS">THCS</option>
                  <option value="THPT">THPT</option>
                  <option value="college">Cao đẳng / Trung cấp</option>
                  <option value="university">Đại học</option>
                </select>
              </label>
              <label className="field">
                Số năm kinh nghiệm *
                <input
                  name="experience"
                  type="number"
                  required
                  min="0"
                  max="60"
                  step="1"
                  defaultValue="0"
                />
              </label>
              <label className="field">
                Nhóm xe chuyên môn
                <select
                  name="vehicle"
                  disabled={!!job && job.vehicle !== 'any'}
                  defaultValue={job?.vehicle === 'car' ? 'car' : 'motorcycle'}
                >
                  <option value="motorcycle">Xe máy</option>
                  <option value="car">Ô tô</option>
                </select>
              </label>
            </div>
            <label className="field">
              Kỹ năng chuyên môn *
              <textarea
                name="skills"
                required
                minLength={10}
                maxLength={1200}
                rows={3}
                placeholder="Chia sẻ những công việc và kỹ năng bạn tự tin nhất…"
              />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            {canApply && <Turnstile action="apply" onToken={setToken} resetKey={reset} />}
            <p className="micro">
              Hồ sơ gửi đến bộ phận tuyển dụng qua Telegram, kèm thời gian, IP và thông tin trình
              duyệt.
            </p>
            {error && (
              <p className="status-message" role="alert">
                {error}
              </p>
            )}
            <button
              className="button full"
              disabled={!canApply || !province || !token || busy || uncertain}
            >
              {busy
                ? 'Đang gửi hồ sơ…'
                : uncertain
                  ? 'Đang chờ đối soát'
                  : job
                    ? 'Gửi đơn ứng tuyển'
                    : 'Chưa mở tiếp nhận hồ sơ'}
              <ArrowUpRight size={17} />
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
