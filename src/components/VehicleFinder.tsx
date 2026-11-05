import { useId, useState } from 'react';
import { MapPin, Search, ArrowUpRight } from 'lucide-react';
import { brandsFor, searchRadii, type VehicleKind } from '../../shared/vehicle-search';
import photoData from '../data/vehicle-photos.json';
import type { VehicleFinderController } from '../services/vehicle-finder';
import Turnstile from './Turnstile';

type Photo = { image: string; source: string; author: string; license: string; licenseUrl: string };
const photos = photoData as Record<string, Photo>;
function VehiclePhoto({
  brand,
  model,
  kind,
  id,
}: {
  brand: string;
  model: string;
  kind: string;
  id: string;
}) {
  const key = `${brand} ${model}`;
  const fallback = Object.keys(photos).filter((name) => {
    const motorcycles = [
      'Honda Vision',
      'Honda SH Mode',
      'Honda Super Cub',
      'Yamaha',
      'Suzuki Satria',
      'Piaggio',
      'Vespa',
      'Kawasaki',
      'Benelli',
      'VinFast',
      'Yadea',
    ];
    const motorcycle = motorcycles.some((prefix) => name.startsWith(prefix));
    return kind === 'motorcycle' ? motorcycle : !motorcycle;
  });
  const selected = photos[key]
    ? key
    : fallback.find((name) => name.startsWith(brand + ' ')) ||
      fallback[Number(id.replace('demo-', '')) % fallback.length];
  const photo = photos[selected];
  return (
    <figure className="vehicle-photo">
      {photo && (
        <img
          src={photo.image}
          alt={`Ảnh tham khảo ${selected}`}
          loading="lazy"
          width="640"
          height="420"
        />
      )}
      <span className="vehicle-demo-badge">DỮ LIỆU MẪU</span>
      {photo && (
        <figcaption>
          <a href={photo.source} target="_blank" rel="noreferrer">
            Ảnh tham khảo: {selected}
          </a>
          <span>
            {photo.author} ·{' '}
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
              {photo.license}
            </a>
          </span>
        </figcaption>
      )}
    </figure>
  );
}

const prices = Array.from({ length: 200 }, (_, index) => index + 1);
export function VehicleSearchForm({
  finder,
  onSearch,
  compact = false,
  hasPosition,
}: {
  finder: VehicleFinderController;
  onSearch: () => void;
  compact?: boolean;
  hasPosition: boolean;
}) {
  const id = useId(),
    { filters, update, busy } = finder;
  return (
    <form
      className={`vehicle-search-form ${compact ? 'vehicle-search-compact' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      aria-label={compact ? 'Tìm xe đầu trang' : 'Bộ lọc tìm xe'}
    >
      <div className="vehicle-search-heading">
        <span>
          <MapPin size={16} /> TÌM CHIẾC XE CỦA BẠN
        </span>
        <small>XE MÁY & Ô TÔ</small>
      </div>
      <div className="vehicle-search-fields">
        <label className="field" htmlFor={`${id}-kind`}>
          Loại xe
          <select
            id={`${id}-kind`}
            value={filters.kind}
            onChange={(e) => update({ kind: e.target.value as VehicleKind })}
          >
            <option value="all">Tất cả loại xe</option>
            <option value="motorcycle">Xe máy / xe điện</option>
            <option value="car">Ô tô</option>
          </select>
        </label>
        <label className="field" htmlFor={`${id}-brand`}>
          Hãng xe
          <select
            id={`${id}-brand`}
            value={filters.brand}
            onChange={(e) => update({ brand: e.target.value })}
          >
            <option value="all">Tất cả hãng</option>
            {brandsFor(filters.kind).map((brand) => (
              <option key={brand}>{brand}</option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-min`}>
          Giá từ
          <select
            id={`${id}-min`}
            value={filters.minPrice}
            onChange={(e) => update({ minPrice: Number(e.target.value) })}
          >
            {prices.map((price) => (
              <option key={price} value={price}>
                {price} triệu
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-max`}>
          Giá đến
          <select
            id={`${id}-max`}
            value={filters.maxPrice}
            onChange={(e) => update({ maxPrice: Number(e.target.value) })}
          >
            {prices.map((price) => (
              <option key={price} value={price}>
                {price} triệu
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-radius`}>
          Bán kính
          <select
            id={`${id}-radius`}
            value={filters.radiusKm}
            onChange={(e) => update({ radiusKm: Number(e.target.value) })}
          >
            {searchRadii.map((radius) => (
              <option key={radius} value={radius}>
                Trong {radius} km
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button vehicle-search-submit" disabled={busy}>
          <Search size={18} />
          {busy ? 'Đang xử lý…' : 'Tìm kiếm'}
        </button>
      </div>
      <p className="vehicle-search-note">
        Khi bấm tìm kiếm, trình duyệt sẽ yêu cầu quyền vị trí để tìm xe quanh bạn. Tiêu chí và vị
        trí được chuyển đến bộ phận tư vấn để hỗ trợ nhu cầu mua xe.
      </p>
      {finder.error && (
        <p className="form-notice" role="alert">
          {finder.error}
        </p>
      )}
    </form>
  );
}

export default function VehicleFinder({
  finder,
  hasPosition,
  onSearch,
}: {
  finder: VehicleFinderController;
  hasPosition: boolean;
  onSearch: () => void;
}) {
  const [limit, setLimit] = useState(12);
  const shown = finder.results.slice(0, limit);
  return (
    <div className="vehicle-finder">
      <p className="eyebrow orange">CHIẾC XE PHÙ HỢP / NGAY QUANH BẠN</p>
      <h2>
        TÌM XE.
        <br />
        <span className="orange">ĐÚNG TẦM GIÁ.</span>
      </h2>
      <p className="muted">
        Chọn xe máy hoặc ô tô, đặt ngân sách và khám phá lựa chọn theo khu vực.
      </p>
      <VehicleSearchForm
        finder={finder}
        hasPosition={hasPosition}
        onSearch={() => {
          setLimit(12);
          onSearch();
        }}
      />
      <div className="vehicle-demo-notice">
        <strong>Dữ liệu mẫu · 50 lựa chọn</strong>
        <p>
          Danh sách dùng để trải nghiệm tìm xe, chưa xác minh tin bán hoặc vị trí người bán. Giá và
          khoảng cách chỉ để tham khảo; chưa nhận đặt cọc hay thanh toán.
        </p>
      </div>
      {finder.busy && !finder.locating && (
        <div className="vehicle-search-verification">
          <p className="micro" role="status">
            Đang xác minh và tiếp nhận nhu cầu…
          </p>
          <Turnstile action="search" onToken={finder.setToken} resetKey={finder.reset} />
        </div>
      )}
      {finder.locating && (
        <p className="micro" role="status">
          Đang yêu cầu quyền truy cập vị trí…
        </p>
      )}
      {finder.searched && (
        <section className="vehicle-results" aria-label="Kết quả tìm xe">
          <div className="vehicle-results-heading">
            <div>
              <p className="eyebrow orange">LỰA CHỌN DÀNH CHO BẠN</p>
              <h3 role="status">Đã tìm thấy {finder.results.length} kết quả</h3>
              <p>
                {finder.searched.province || 'Quanh vị trí đã chia sẻ'} · {finder.searched.minPrice}
                –{finder.searched.maxPrice} triệu · {finder.searched.radiusKm} km
              </p>
            </div>
            <span>SẮP XẾP: KHOẢNG CÁCH THAM KHẢO</span>
          </div>
          {!shown.length && (
            <div className="vehicle-empty">
              <Search size={30} />
              <h3>Chưa có lựa chọn phù hợp</h3>
              <p>Thử mở rộng khoảng giá, bán kính hoặc chọn tất cả hãng.</p>
            </div>
          )}
          <div className="vehicle-offer-grid">
            {shown.map((offer) => (
              <article key={offer.id} className="vehicle-offer">
                <VehiclePhoto
                  brand={offer.brand}
                  model={offer.model}
                  kind={offer.kind}
                  id={offer.id}
                />
                <div className="vehicle-offer-copy">
                  <p className="eyebrow">
                    {offer.kind === 'car' ? 'Ô TÔ' : 'XE MÁY / XE ĐIỆN'} · {offer.id}
                  </p>
                  <h4>
                    {offer.brand} {offer.model}
                  </h4>
                  <strong>
                    {offer.price} <small>triệu đồng</small>
                  </strong>
                  <p>
                    {offer.year} · {offer.mileageKm.toLocaleString('vi-VN')} km
                  </p>
                  <p className="vehicle-offer-distance">
                    <MapPin size={13} /> Cách ~{offer.distanceKm.toLocaleString('vi-VN')} km{' '}
                    <span>(tham khảo)</span>
                  </p>
                  <span className="vehicle-offer-status">
                    Chưa mở liên hệ người bán <ArrowUpRight size={14} />
                  </span>
                </div>
              </article>
            ))}
          </div>
          {finder.results.length > limit && (
            <button className="button button-outline full" onClick={() => setLimit((n) => n + 12)}>
              Xem thêm {Math.min(12, finder.results.length - limit)} lựa chọn
            </button>
          )}
        </section>
      )}
    </div>
  );
}
