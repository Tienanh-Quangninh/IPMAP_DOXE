export default function PartArt({ type }: { type: string }) {
  return (
    <svg className="part-art" viewBox="0 0 300 210" role="img" aria-label={`Hình minh họa ${type}`}>
      <defs>
        <linearGradient id={`metal-${type}`} x2="1" y2="1">
          <stop stopColor="#91969b" />
          <stop offset=".35" stopColor="#25282d" />
          <stop offset=".55" stopColor="#a4a9ae" />
          <stop offset="1" stopColor="#23272c" />
        </linearGradient>
        <linearGradient id={`orange-${type}`} x2="1" y2="1">
          <stop stopColor="#ffad50" />
          <stop offset="1" stopColor="#b93211" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="187" rx="80" ry="9" fill="#000" opacity=".5" />
      {type === 'wheel' ? (
        <g transform="translate(150 101)">
          <circle r="81" fill="#15171a" stroke="#34373c" strokeWidth="15" />
          <circle r="65" fill="#0d0f12" stroke={`url(#metal-${type})`} strokeWidth="6" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d="M-6-5-13-58 0-65 10-10Z"
              fill={`url(#metal-${type})`}
              transform={`rotate(${i * 36})`}
            />
          ))}
          <circle r="18" fill="#24292d" stroke="#797e81" strokeWidth="3" />
          <circle r="7" fill="#f35b25" />
          {Array.from({ length: 5 }, (_, i) => (
            <circle
              key={i}
              cx={Math.cos(i * 1.256) * 12}
              cy={Math.sin(i * 1.256) * 12}
              r="2"
              fill="#bbb"
            />
          ))}
        </g>
      ) : type === 'suspension' ? (
        <g transform="translate(153 105) rotate(25)">
          <rect x="-14" y="-86" width="28" height="172" rx="10" fill={`url(#metal-${type})`} />
          <rect x="-30" y="-49" width="60" height="101" rx="12" fill="#191d22" />
          {Array.from({ length: 9 }, (_, i) => (
            <path
              key={i}
              d={`M-30 ${-45 + i * 11}q29-14 60 0`}
              stroke={`url(#orange-${type})`}
              strokeWidth="7"
              fill="none"
            />
          ))}
          <rect x="24" y="-75" width="25" height="60" rx="10" fill={`url(#orange-${type})`} />
          <circle cy="-81" r="14" fill="#171a1e" stroke="#747a80" strokeWidth="6" />
          <circle cy="80" r="12" fill="#171a1e" stroke="#747a80" strokeWidth="6" />
        </g>
      ) : type === 'brake' ? (
        <g transform="translate(143 104) rotate(-20)">
          <circle r="75" fill={`url(#metal-${type})`} stroke="#6b7075" strokeWidth="3" />
          <circle r="49" fill="#0d0f12" stroke="#262a2f" strokeWidth="8" />
          {Array.from({ length: 18 }, (_, i) => (
            <circle
              key={i}
              cx={Math.cos(i * 0.349) * 62}
              cy={Math.sin(i * 0.349) * 62}
              r="3.5"
              fill="#111419"
            />
          ))}
          <circle r="16" fill="#171b20" stroke="#535a62" strokeWidth="7" />
          <path
            d="M29-60h42q14 0 14 17v55q0 17-16 17H43L27-6Z"
            fill={`url(#orange-${type})`}
            stroke="#ff8a4b"
            strokeWidth="2"
          />
          <path d="M48-38h20M47-23h23M47-8h20" stroke="#8d260d" strokeWidth="4" />
        </g>
      ) : (
        <g transform="translate(143 99) rotate(-25)">
          <path d="M-99 5h57v-20h21v44h-78z" fill={`url(#metal-${type})`} />
          <rect x="-33" y="-38" width="112" height="83" rx="24" fill={`url(#metal-${type})`} />
          <path d="M-12-34v74M-5-35v77M3-35v77" stroke="#111" strokeWidth="2" />
          <ellipse cx="79" cy="3" rx="18" ry="40" fill="#555b61" />
          <ellipse cx="81" cy="3" rx="12" ry="30" fill="#090a0d" stroke="#a2a4a8" strokeWidth="3" />
          <path d="M18-31h32v15H18z" fill="#e95624" />
        </g>
      )}
    </svg>
  );
}
