import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Menu,
  X,
  Plus,
  Minus,
  Check,
  SlidersHorizontal,
  Wrench,
  Zap,
  ShieldCheck,
  Bike,
  Car,
  ChevronRight,
  Flag,
  Instagram,
  Facebook,
} from 'lucide-react';
import BranchSelector from './components/BranchSelector';
import ApplicationForm from './components/ApplicationForm';
import Modal from './components/Modal';
import PartArt from './components/PartArt';
import productsData from './data/products.json';
import branchData from './data/branches.json';
import type { Branch, Job, Product } from './types';
import { api } from './services/api';

const products = productsData as Product[];
const builds = [
  {
    name: 'STREET REDEFINED',
    type: 'motorcycle',
    label: 'XE MÁY / STREET STYLE',
    desc: 'Dàn chân gọn gàng. Từng chi tiết có chủ đích.',
    specs: ['Dàn chân & hệ thống treo', 'Phanh & chi tiết CNC', 'Cấu hình thiết kế ý tưởng'],
    image: 'moto',
  },
  {
    name: 'BEYOND STOCK',
    type: 'car',
    label: 'Ô TÔ / PERFORMANCE',
    desc: 'Diện mạo khác biệt. Cảm hứng từ đường đua.',
    specs: [
      'Widebody & mâm hợp kim',
      'Hệ thống treo thể thao',
      'Hình ảnh concept, không phải xe khách hàng',
    ],
    image: 'car',
  },
];
function loadSelection(): { province: string; branchId: string } {
  try {
    return (
      JSON.parse(localStorage.getItem('rg-region') || 'null') || { province: '', branchId: '' }
    );
  } catch {
    return { province: '', branchId: '' };
  }
}

export default function App() {
  const [selection, setSelection] = useState(loadSelection),
    [branches, setBranches] = useState<Branch[]>(
      (branchData as Branch[]).filter((b) => b.active && b.verified),
    ),
    [jobs, setJobs] = useState<Job[]>([]);
  const [locationOpen, setLocationOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [formOpen, setFormOpen] = useState(false),
    [job, setJob] = useState<Job | null>(null),
    [recruitOpen, setRecruitOpen] = useState(false);
  const [vehicle, setVehicle] = useState('all'),
    [category, setCategory] = useState('all'),
    [model, setModel] = useState('all'),
    [brand, setBrand] = useState('all'),
    [filters, setFilters] = useState(false),
    [product, setProduct] = useState<Product | null>(null),
    [build, setBuild] = useState<(typeof builds)[number] | null>(null),
    [galleryFilter, setGalleryFilter] = useState('all'),
    [faq, setFaq] = useState<number | null>(0),
    [privacy, setPrivacy] = useState(false);
  const branch = branches.find((b) => b.id === selection.branchId) || null;
  const closeLocation = useCallback(() => setLocationOpen(false), []),
    closeForm = useCallback(() => setFormOpen(false), []),
    closeProduct = useCallback(() => setProduct(null), []),
    closeBuild = useCallback(() => setBuild(null), []),
    closeRecruit = useCallback(() => {
      setRecruitOpen(false);
      try {
        sessionStorage.setItem('rg-recruit-dismissed', '1');
      } catch {}
    }, []),
    closePrivacy = useCallback(() => setPrivacy(false), []);
  useEffect(() => {
    let active = true;
    api<{ branches: Branch[] }>('branches')
      .then((d) => {
        if (active) setBranches(d.branches.filter((b) => b.active && b.verified));
      })
      .catch(() => {});
    const timer = setTimeout(() => {
      let seen = false;
      try {
        seen = !!sessionStorage.getItem('rg-region-prompt');
        sessionStorage.setItem('rg-region-prompt', '1');
      } catch {}
      if (!seen && !selection.province) setLocationOpen(true);
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setJobs([]);
    if (branch?.recruitmentEnabled)
      api<{ jobs: Job[] }>(`jobs?branchId=${encodeURIComponent(branch.id)}`)
        .then((d) => {
          if (active) setJobs(d.jobs);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [branch?.id, branch?.recruitmentEnabled]);
  useEffect(() => {
    if (!jobs.length) return;
    let dismissed = false;
    try {
      dismissed = !!sessionStorage.getItem('rg-recruit-dismissed');
    } catch {}
    if (dismissed) return;
    const timer = setTimeout(() => setRecruitOpen(true), 6500);
    return () => clearTimeout(timer);
  }, [jobs]);
  function selectRegion(province: string, b: Branch | null) {
    const s = { province, branchId: b?.id || '' };
    setSelection(s);
    try {
      localStorage.setItem('rg-region', JSON.stringify(s));
    } catch {}
  }
  function openApply(j: Job | null = null) {
    setJob(j);
    setFormOpen(true);
    setRecruitOpen(false);
  }
  const shownProducts = products.filter(
    (p) =>
      (vehicle === 'all' || p.vehicle === vehicle) &&
      (category === 'all' || p.category === category) &&
      (model === 'all' || p.models.includes(model)) &&
      (brand === 'all' || p.brand === brand),
  );
  function contact() {
    setLocationOpen(true);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className="utility-bar">
        <span>ĐAM MÊ LÀ ĐIỂM XUẤT PHÁT. CHẤT RIÊNG LÀ ĐÍCH ĐẾN.</span>
        <span className="utility-right">
          <span className="live-dot" /> CUSTOM BUILDS & PERFORMANCE{' '}
          <span className="utility-country">VIETNAM / EST. 2026</span>
        </span>
      </div>
      <header className="header">
        <a href="#" className="logo" aria-label="Racing Garage trang chủ">
          <span className="logo-mark">
            R<span>G</span>
          </span>
          <span>
            RACING
            <span className="logo-line">
              GARAGE<span className="logo-dot">®</span>
            </span>
          </span>
        </a>
        <nav className={menu ? 'nav nav-open' : 'nav'} aria-label="Điều hướng chính">
          {[
            ['Khám phá', '#discover'],
            ['Dịch vụ', '#services'],
            ['Phụ tùng', '#parts'],
            ['Dự án', '#builds'],
            ['Tuyển dụng', '#careers'],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenu(false)}>
              {label}
              {label === 'Tuyển dụng' && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="branch-button" onClick={() => setLocationOpen(true)}>
            <MapPin size={17} />
            <span>{branch?.name || selection.province || 'Chọn chi nhánh'}</span>
            <ChevronRight size={14} />
          </button>
          <button
            className="mobile-menu icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <picture>
            <source media="(max-width: 640px)" srcSet="/images/garage-hero-mobile.webp" />
            <img
              className="hero-image"
              src="/images/garage-hero.webp"
              alt="Ý tưởng xe thể thao widebody và xe máy trong garage ánh sáng cam"
              fetchPriority="high"
              width="1659"
              height="948"
            />
          </picture>
          <div className="hero-shade" />
          <div className="hero-grain" />
          <div className="hero-content">
            <div className="eyebrow">
              <span className="orange-line" /> BUILT TO STAND OUT
            </div>
            <h1>
              ĐỘ CHẤT RIÊNG.
              <br />
              <span>NÂNG TẦM</span>
              <br />
              HIỆU SUẤT<span className="orange">.</span>
            </h1>
            <p>
              Không chỉ là một chiếc xe.
              <br />
              Đó là cá tính, đam mê và dấu ấn của bạn.
            </p>
            <div className="hero-cta">
              <a className="button" href="#services">
                Khám phá dịch vụ
                <ArrowUpRight size={18} />
              </a>
              <a className="button button-ghost" href="#parts">
                Tìm phụ tùng
                <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-tags">
              <span>
                <Check size={13} /> XE MÁY & Ô TÔ
              </span>
              <span>
                <Check size={13} /> CẤU HÌNH THEO PHONG CÁCH
              </span>
            </div>
          </div>
          <div className="hero-side">PASSION / PRECISION / PERFORMANCE</div>
          <div className="hero-bottom">
            <a href="#discover">
              <ArrowDown size={15} /> CUỘN ĐỂ KHÁM PHÁ
            </a>
            <span className="hero-caption">
              01 / GARAGE CONCEPT <span>Ảnh ý tưởng</span>
            </span>
            <div className="hero-indicator">
              <span /> <i /> <i />
            </div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          <div>
            YOUR RIDE. YOUR RULES. <span>✦</span> MOTORCYCLE TUNING <span>✦</span> CAR PERFORMANCE{' '}
            <span>✦</span> BUILT DIFFERENT <span>✦</span> YOUR RIDE. YOUR RULES. <span>✦</span>
          </div>
        </div>
        <section id="discover" className="section discover">
          <div className="section-intro">
            <div>
              <p className="eyebrow orange">01 / THE GARAGE</p>
              <h2>
                CHUNG ĐAM MÊ.
                <br />
                KHÁC CHẤT RIÊNG.
              </h2>
            </div>
            <p className="section-description">
              Từ đường phố đến cảm hứng đường đua. Khám phá những hướng nâng cấp dành cho xe máy và
              ô tô — bắt đầu từ cách bạn muốn chiếc xe của mình trở nên khác biệt.
            </p>
          </div>
          <div className="vehicle-grid">
            <a
              href="#parts"
              className="vehicle-card motorcycle"
              onClick={() => {
                setVehicle('motorcycle');
                setModel('all');
              }}
            >
              <img
                src="/images/garage-moto.webp"
                alt="Xe máy phong cách street tuning — ảnh ý tưởng"
                loading="lazy"
                width="720"
                height="600"
              />
              <div className="vehicle-overlay" />
              <div className="vehicle-top">
                <Bike size={23} />
                <span>01 / TWO WHEELS</span>
              </div>
              <div className="vehicle-info">
                <p className="eyebrow">STREET STYLE. REAL ATTITUDE.</p>
                <h3>
                  MOTORCYCLE
                  <br />
                  TUNING<span>.</span>
                </h3>
                <p>Dàn chân · Phanh · Phuộc · Đồ chơi CNC</p>
                <span className="circle-arrow">
                  <ArrowUpRight />
                </span>
              </div>
            </a>
            <a
              href="#parts"
              className="vehicle-card car"
              onClick={() => {
                setVehicle('car');
                setModel('all');
              }}
            >
              <img
                src="/images/garage-car.webp"
                alt="Ô tô widebody trong garage — ảnh ý tưởng"
                loading="lazy"
                width="900"
                height="600"
              />
              <div className="vehicle-overlay" />
              <div className="vehicle-top">
                <Car size={23} />
                <span>02 / FOUR WHEELS</span>
              </div>
              <div className="vehicle-info">
                <p className="eyebrow">BEYOND THE ORDINARY.</p>
                <h3>
                  CAR
                  <br />
                  PERFORMANCE<span>.</span>
                </h3>
                <p>Bodykit · Mâm lốp · Hệ thống treo · Nội thất</p>
                <span className="circle-arrow">
                  <ArrowUpRight />
                </span>
              </div>
            </a>
          </div>
          <div className="value-row">
            <div>
              <Wrench />
              <span>
                <strong>CHI TIẾT TẠO KHÁC BIỆT</strong>
                <small>Cấu hình phù hợp với từng dòng xe</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>ƯU TIÊN SỰ AN TOÀN</strong>
                <small>Tư vấn tính tương thích trước nâng cấp</small>
              </span>
            </div>
            <div>
              <Zap />
              <span>
                <strong>PHONG CÁCH CỦA BẠN</strong>
                <small>Từ ý tưởng đến bản sắc riêng</small>
              </span>
            </div>
          </div>
        </section>
        <section className="section parts-section" id="parts">
          <div className="section-intro">
            <div>
              <p className="eyebrow orange">02 / UPGRADE YOUR RIDE</p>
              <h2>
                ĐÚNG PHỤ TÙNG.
                <br />
                ĐÚNG CHẤT XE.
              </h2>
            </div>
            <div className="section-description">
              <p>Khám phá nhóm phụ tùng cho hành trình nâng cấp tiếp theo.</p>
              <p className="micro">
                Danh mục minh họa · Chưa mở bán · Giá và thương hiệu sẽ được cập nhật.
              </p>
            </div>
          </div>
          <div className="catalog-toolbar">
            <div className="tabs" aria-label="Loại phương tiện">
              {[
                ['all', 'Tất cả'],
                ['motorcycle', 'Xe máy'],
                ['car', 'Ô tô'],
              ].map(([v, t]) => (
                <button
                  key={v}
                  className={vehicle === v ? 'active' : ''}
                  onClick={() => {
                    setVehicle(v);
                    setModel('all');
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              className={`filter-button ${filters ? 'selected' : ''}`}
              aria-expanded={filters}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
              {(category !== 'all' || brand !== 'all' || model !== 'all') && (
                <span className="nav-dot" />
              )}
            </button>
          </div>
          {filters && (
            <div className="filters">
              <label className="field">
                Nhóm phụ tùng
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">Tất cả nhóm</option>
                  {[...new Set(products.map((p) => p.category))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Hãng
                <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="all">Tất cả hãng</option>
                  {[...new Set(products.map((p) => p.brand))].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Mẫu xe
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="all">Tất cả mẫu xe</option>
                  {[
                    ...new Set(
                      products
                        .filter((p) => vehicle === 'all' || p.vehicle === vehicle)
                        .flatMap((p) => p.models),
                    ),
                  ]
                    .sort()
                    .map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setCategory('all');
                  setModel('all');
                  setBrand('all');
                }}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
          <div className="products-grid">
            {shownProducts.map((p, i) => (
              <button className="product-card" key={p.id} onClick={() => setProduct(p)}>
                <div className="product-visual">
                  <span className="product-number">0{i + 1}</span>
                  <span className="product-kind">{p.vehicle === 'car' ? 'Ô TÔ' : 'XE MÁY'}</span>
                  <PartArt type={p.image} />
                  <span className="product-plus">
                    <Plus size={18} />
                  </span>
                </div>
                <div className="product-text">
                  <span className="eyebrow orange">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p>{p.models.join(' / ')}</p>
                  <div>
                    <span>Xem cấu hình</span>
                    <ArrowUpRight size={17} />
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!shownProducts.length && (
            <div className="empty-state">
              <SlidersHorizontal />
              <h3>Chưa có phụ tùng phù hợp.</h3>
              <p>Thử thay đổi bộ lọc để khám phá các nhóm khác.</p>
              <button
                className="text-button"
                onClick={() => {
                  setCategory('all');
                  setModel('all');
                  setBrand('all');
                  setVehicle('all');
                }}
              >
                Đặt lại bộ lọc
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
        <section className="builds-section section" id="builds">
          <div className="section-intro">
            <div>
              <p className="eyebrow orange">03 / THE BUILD JOURNAL</p>
              <h2>
                MỖI CHIẾC XE.
                <br />
                MỘT TUYÊN NGÔN.
              </h2>
            </div>
            <p className="section-description">
              Một góc nhìn về những gì chiếc xe có thể trở thành.
              <br />
              <span className="micro">Bộ sưu tập concept — chưa phải dự án khách hàng.</span>
            </p>
          </div>
          <div className="tabs gallery-tabs">
            {[
              ['all', 'Tất cả concept'],
              ['motorcycle', 'Xe máy'],
              ['car', 'Ô tô'],
            ].map(([v, t]) => (
              <button
                key={v}
                className={galleryFilter === v ? 'active' : ''}
                onClick={() => setGalleryFilter(v)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="build-grid">
            {builds
              .filter((b) => galleryFilter === 'all' || b.type === galleryFilter)
              .map((b) => (
                <button
                  className={`build-card build-${b.type}`}
                  key={b.name}
                  onClick={() => setBuild(b)}
                >
                  <img
                    src={`/images/garage-${b.image}.webp`}
                    alt={`${b.name} — thiết kế ý tưởng`}
                    loading="lazy"
                    width="900"
                    height="600"
                  />
                  <span className="build-badge">CONCEPT / 2026</span>
                  <div>
                    <span className="eyebrow">{b.label}</span>
                    <h3>
                      {b.name}
                      <ArrowUpRight />
                    </h3>
                    <p>{b.desc}</p>
                  </div>
                </button>
              ))}
          </div>
        </section>
        <section className="services-section section" id="services">
          <div className="section-intro">
            <div>
              <p className="eyebrow orange">04 / MORE THAN A GARAGE</p>
              <h2>
                HIỂU CHIẾC XE.
                <br />
                HIỂU CHỦ NHÂN.
              </h2>
            </div>
            <p className="section-description">
              Mỗi hành trình nâng cấp đều bắt đầu từ một cuộc trò chuyện. Chọn khu vực để xem dịch
              vụ khi có cơ sở được xác minh.
            </p>
          </div>
          <div className="service-list">
            {[
              {
                title: 'TƯ VẤN CẤU HÌNH',
                text: 'Lắng nghe phong cách, nhu cầu sử dụng và ngân sách. Đề xuất hướng nâng cấp phù hợp với dòng xe.',
                icon: SlidersHorizontal,
              },
              {
                title: 'NÂNG CẤP & LẮP ĐẶT',
                text: 'Dàn chân, phanh, hệ thống treo và chi tiết ngoại thất. Ưu tiên tính tương thích và an toàn vận hành.',
                icon: Wrench,
              },
              {
                title: 'BẢO DƯỠNG & CHĂM SÓC',
                text: 'Kiểm tra tình trạng xe, tư vấn hạng mục bảo dưỡng và chăm sóc theo nhu cầu thực tế.',
                icon: ShieldCheck,
              },
            ].map((s, i) => (
              <button className="service-row" onClick={contact} key={s.title}>
                <span className="service-index">0{i + 1}</span>
                <s.icon className="service-icon" size={28} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <ArrowUpRight size={22} />
              </button>
            ))}
          </div>
        </section>
        <section className="branch-section section" id="branches">
          <div className="branch-copy">
            <p className="eyebrow orange">05 / FIND YOUR GARAGE</p>
            <h2>
              GẦN BẠN HƠN.
              <br />
              CÙNG CHẤT HƠN.
            </h2>
            <p className="muted">
              Chọn tỉnh/thành để khám phá chi nhánh, dịch vụ và cơ hội nghề nghiệp tại khu vực của
              bạn.
            </p>
            <button className="button" onClick={() => setLocationOpen(true)}>
              <MapPin size={17} />
              {selection.province || 'Tìm chi nhánh của bạn'}
              <ArrowUpRight size={18} />
            </button>
            <p className="micro">
              Bạn chủ động chọn khu vực. Chúng tôi chỉ dùng GPS khi bạn cho phép.
            </p>
          </div>
          <div className="branch-panel">
            <div className="map-decoration" aria-hidden="true">
              <div />
              <div />
              <span className="map-pin">
                <MapPin size={32} />
              </span>
              <i />
              <i />
              <i />
            </div>
            <div className="branch-card">
              <span className="eyebrow">
                <span className="live-dot" />
                {selection.province ? 'KHU VỰC ĐÃ CHỌN' : 'SẴN SÀNG KẾT NỐI'}
              </span>
              <h3>{branch?.name || selection.province || 'VIỆT NAM'}</h3>
              <p>
                {branch?.address ||
                  'Danh sách chi nhánh đang được xác minh. Địa chỉ và hotline sẽ hiển thị sau khi được công bố.'}
              </p>
              {branch ? (
                <>
                  <a href={branch.mapUrl} target="_blank" rel="noreferrer" className="text-button">
                    Xem bản đồ
                    <ArrowUpRight size={15} />
                  </a>
                  <a className="text-button" href={`tel:${branch.hotline}`}>
                    {branch.hotline}
                  </a>
                </>
              ) : (
                <button className="text-button" onClick={() => setLocationOpen(true)}>
                  Chọn khu vực
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </section>
        <section className="careers-section" id="careers">
          <div className="careers-art" aria-hidden="true">
            R<span>G</span>
          </div>
          <div className="careers-content">
            <p className="eyebrow">06 / JOIN THE CREW</p>
            <h2>
              BIẾN ĐAM MÊ
              <br />
              THÀNH SỰ NGHIỆP.
            </h2>
            <p>
              Bạn mê xe. Bạn thích tìm hiểu từng chi tiết.
              <br />
              Chương tiếp theo của bạn có thể bắt đầu từ đây.
            </p>
            {jobs.length && branch ? (
              <div className="jobs-list">
                {jobs.map((j) => (
                  <button key={j.id} className="job-button" onClick={() => openApply(j)}>
                    <span>
                      {j.title}
                      <small>
                        {branch.name} · {j.salary}
                      </small>
                    </span>
                    <ArrowUpRight />
                  </button>
                ))}
              </div>
            ) : (
              <p className="career-status">
                {selection.province
                  ? `Chưa có vị trí được công bố tại ${selection.province}.`
                  : 'Chọn khu vực để xem các vị trí đang tuyển.'}
              </p>
            )}
            <div className="career-actions">
              <button className="button button-dark" onClick={() => setLocationOpen(true)}>
                Chọn khu vực tuyển dụng
                <ArrowUpRight size={18} />
              </button>
              {!jobs.length && (
                <button className="text-button" onClick={() => openApply()}>
                  Xem mẫu ứng tuyển
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="careers-aside">
            <Flag size={45} strokeWidth={1} />
            <span>
              DRIVEN BY PASSION.
              <br />
              BUILT AS A TEAM.
            </span>
            <span className="career-stamp">
              RACING GARAGE
              <br />
              CREW DEPARTMENT ↗
            </span>
          </div>
        </section>
        <section className="section faq-section">
          <div>
            <p className="eyebrow orange">TRƯỚC KHI BẮT ĐẦU</p>
            <h2>BẠN CẦN BIẾT.</h2>
            <p className="muted">Rõ ràng từ chi tiết đầu tiên.</p>
          </div>
          <div>
            {[
              {
                q: 'Website đã nhận đặt phụ tùng và dịch vụ chưa?',
                a: 'Đây là phiên bản giới thiệu. Danh mục hiện là minh họa, chưa mở bán và chưa nhận thanh toán. Chi nhánh, giá và lịch dịch vụ sẽ được công bố sau khi xác minh.',
              },
              {
                q: 'Thông tin vị trí của tôi được sử dụng thế nào?',
                a: 'Bạn có thể chọn tỉnh/thành thủ công. Nếu cho phép GPS, tọa độ chỉ dùng trên trình duyệt để đối chiếu chi nhánh. Chúng tôi chỉ gửi tên khu vực và chi nhánh qua Telegram khi bạn tích đồng ý riêng.',
              },
              {
                q: 'Tôi có thể ứng tuyển tại đâu?',
                a: 'Khi một chi nhánh đã xác minh có vị trí tuyển dụng đang mở, thông tin công việc và biểu mẫu tiếp nhận sẽ hiển thị theo khu vực bạn chọn. Hiện chưa có tin tuyển dụng được công bố.',
              },
            ].map((f, i) => (
              <div className="faq-item" key={f.q}>
                <button
                  aria-expanded={faq === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setFaq(faq === i ? null : i)}
                >
                  {f.q}
                  {faq === i ? <Minus size={18} /> : <Plus size={18} />}
                </button>
                {faq === i && <p id={`faq-${i}`}>{f.a}</p>}
              </div>
            ))}
          </div>
        </section>
        <section className="closing">
          <span>READY FOR YOUR NEXT BUILD?</span>
          <a href="#discover">
            CHẤT RIÊNG BẮT ĐẦU TỪ ĐÂY.
            <ArrowUpRight />
          </a>
        </section>
      </main>
      <footer className="footer">
        <div className="footer-main">
          <div>
            <a href="#" className="logo">
              <span className="logo-mark">
                R<span>G</span>
              </span>
              <span>
                RACING<span className="logo-line">GARAGE®</span>
              </span>
            </a>
            <p>
              Đam mê không có giới hạn.
              <br />
              Phong cách không có bản sao.
            </p>
            <div className="socials">
              <button className="icon-button" onClick={contact} aria-label="Thông tin Facebook">
                <Facebook size={17} />
              </button>
              <button className="icon-button" onClick={contact} aria-label="Thông tin Instagram">
                <Instagram size={17} />
              </button>
              <span>THÔNG TIN LIÊN HỆ ĐANG CẬP NHẬT</span>
            </div>
          </div>
          <div>
            <span className="eyebrow">KHÁM PHÁ</span>
            <a href="#discover">Xe máy & ô tô</a>
            <a href="#parts">Danh mục phụ tùng</a>
            <a href="#builds">Bộ sưu tập concept</a>
          </div>
          <div>
            <span className="eyebrow">KẾT NỐI</span>
            <button onClick={contact}>Chọn chi nhánh</button>
            <a href="#careers">Cơ hội nghề nghiệp</a>
            <button onClick={() => setPrivacy(true)}>Quyền riêng tư</button>
          </div>
          <div className="footer-note">
            <span className="eyebrow orange">BUILT TO STAND OUT.</span>
            <p>
              Phiên bản giới thiệu.
              <br />
              Thương hiệu, cơ sở và danh mục
              <br />
              đang chờ thông tin chính thức.
            </p>
            <span className="footer-country">DESIGNED FOR VIETNAM ↗</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} RACING GARAGE · TÊN THƯƠNG HIỆU TẠM</span>
          <button onClick={() => setPrivacy(true)}>Dữ liệu & quyền riêng tư</button>
          <a href="#">VỀ ĐẦU TRANG ↑</a>
        </div>
      </footer>
      {locationOpen && (
        <BranchSelector
          branches={branches}
          initialProvince={selection.province}
          onSelect={selectRegion}
          onClose={closeLocation}
        />
      )}
      {formOpen && <ApplicationForm branch={branch} job={job} onClose={closeForm} />}
      {product && (
        <Modal title="Chi tiết phụ tùng" onClose={closeProduct}>
          <div className="modal-product">
            <PartArt type={product.image} />
          </div>
          <span className="eyebrow orange">{product.category} / MINH HỌA</span>
          <h2>{product.name.toUpperCase()}</h2>
          <p className="muted">{product.description}</p>
          <div className="product-detail">
            <span>Mẫu xe tham khảo</span>
            <strong>{product.models.join(' / ')}</strong>
            <span>Hãng & giá bán</span>
            <strong>Đang cập nhật</strong>
            <span>Tình trạng</span>
            <strong>Chưa mở bán</strong>
          </div>
          <button
            className="button full"
            onClick={() => {
              setProduct(null);
              setLocationOpen(true);
            }}
          >
            Tìm chi nhánh tư vấn
            <ArrowUpRight size={17} />
          </button>
        </Modal>
      )}
      {build && (
        <Modal title="Bộ sưu tập concept" onClose={closeBuild} wide>
          <img
            className="build-preview"
            src={`/images/garage-${build.image}.webp`}
            alt={build.name}
          />
          <span className="eyebrow orange">{build.label}</span>
          <h2>{build.name}</h2>
          <p className="muted">{build.desc}</p>
          <ul className="build-specs">
            {build.specs.map((s) => (
              <li key={s}>
                <Check size={15} />
                {s}
              </li>
            ))}
          </ul>
          <p className="micro">
            Hình ảnh ý tưởng được tạo bằng AI. Ảnh trước/sau và thông số nâng cấp thực tế sẽ được bổ
            sung khi có dự án được xác minh.
          </p>
        </Modal>
      )}
      {recruitOpen && jobs.length > 0 && branch && (
        <Modal title="Cơ hội nghề nghiệp" onClose={closeRecruit}>
          <p className="eyebrow orange">JOIN THE CREW / {branch.name}</p>
          <h2>
            ĐỘI NGŨ ĐANG
            <br />
            CHỜ BẠN.
          </h2>
          {jobs.map((j) => (
            <div className="recruit-job" key={j.id}>
              <h3>{j.title}</h3>
              <p>{j.salary}</p>
              <ul>
                {j.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <button className="button full" onClick={() => openApply(j)}>
                Ứng tuyển vị trí này
                <ArrowUpRight size={17} />
              </button>
            </div>
          ))}
        </Modal>
      )}
      {privacy && (
        <Modal title="Quyền riêng tư" onClose={closePrivacy}>
          <h2>
            DỮ LIỆU CỦA BẠN.
            <br />
            LỰA CHỌN CỦA BẠN.
          </h2>
          <div className="privacy-copy">
            <p>
              <strong>Khu vực:</strong> tỉnh/thành và mã chi nhánh được lưu tại trình duyệt để ghi
              nhớ lựa chọn. GPS chỉ dùng trên thiết bị sau khi bạn cấp quyền; không gửi tọa độ đến
              Telegram.
            </p>
            <p>
              <strong>Chia sẻ khu vực:</strong> chỉ gửi tên khu vực, chi nhánh, nguồn chọn và thời
              gian khi bạn đồng ý riêng. Việc chọn khu vực không bắt buộc phải chia sẻ.
            </p>
            <p>
              <strong>Ứng tuyển:</strong> hồ sơ, thời gian, IP và thông tin trình duyệt được gửi cho
              bộ phận tuyển dụng qua Telegram khi bạn tích đồng ý và gửi form. Mã sự kiện, trạng
              thái và dữ liệu băm phục vụ chống lặp được lưu trong D1; lịch sử Telegram cần được
              doanh nghiệp quản lý và xóa theo chính sách công bố trước vận hành.
            </p>
            <p>
              <strong>Chống spam:</strong> khi mở biểu mẫu gửi, Cloudflare Turnstile kiểm tra yêu
              cầu. Không thu thập dấu vân tay thiết bị hoặc cookie đăng nhập.
            </p>
            <p>
              Website hiện chưa có thông tin doanh nghiệp và đầu mối xử lý dữ liệu chính thức; chưa
              mở tiếp nhận hồ sơ. Thông tin liên hệ và chính sách lưu trữ sẽ được bổ sung trước khi
              vận hành.
            </p>
          </div>
          <button
            className="button button-outline full"
            onClick={() => {
              try {
                localStorage.removeItem('rg-region');
                sessionStorage.removeItem('rg-region-prompt');
              } catch {}
              setSelection({ province: '', branchId: '' });
              closePrivacy();
            }}
          >
            Xóa khu vực đã lưu trên thiết bị
          </button>
        </Modal>
      )}
    </>
  );
}
