import styles from "./dashboard-background.module.css";

export default function DashboardBackground() {
  return (
    <div className={styles.artwork} aria-hidden="true">
      <svg className={styles.ribbons} viewBox="0 0 600 480" fill="none" preserveAspectRatio="xMinYMin meet">
        <defs>
          <linearGradient id="ribbon-face" x1="80" y1="8" x2="490" y2="335" gradientUnits="userSpaceOnUse">
            <stop stopColor="#63B38D" stopOpacity=".33" />
            <stop offset="1" stopColor="#0E5945" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id="ribbon-edge" x1="70" y1="24" x2="470" y2="360" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9ACDB0" stopOpacity=".42" />
            <stop offset="1" stopColor="#63B38D" stopOpacity=".04" />
          </linearGradient>
        </defs>
        <path d="M-106 22 181-104 525 173 372 237 148 53-56 145Z" fill="url(#ribbon-face)" stroke="url(#ribbon-edge)" strokeWidth="1.5" />
        <path d="M-141 110 111-3 462 281 309 346 82 157-75 231Z" fill="url(#ribbon-face)" fillOpacity=".68" stroke="url(#ribbon-edge)" />
        <path d="M-172 210 44 112 386 395 253 448 34 264-113 333Z" fill="url(#ribbon-face)" fillOpacity=".42" stroke="url(#ribbon-edge)" />
        <path d="M-66 145 148 53 372 237M-75 231 82 157 309 346M-113 333 34 264 253 448" stroke="#A5D7B9" strokeOpacity=".18" />
        <path d="M-52 181 147 94M-76 268 74 199M-111 368 31 306" stroke="#95CAA9" strokeOpacity=".16" strokeDasharray="5 9" />
      </svg>

      <svg className={styles.polygons} viewBox="0 0 600 560" fill="none" preserveAspectRatio="xMaxYMin meet">
        <defs>
          <radialGradient id="polygon-glow" cx="0" cy="0" r="1" gradientTransform="translate(387 187) rotate(90) scale(244)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#29906B" stopOpacity=".31" />
            <stop offset="1" stopColor="#29906B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="polygon-face" x1="180" y1="60" x2="515" y2="463" gradientUnits="userSpaceOnUse">
            <stop stopColor="#63B38D" stopOpacity=".21" />
            <stop offset="1" stopColor="#0E5945" stopOpacity=".025" />
          </linearGradient>
        </defs>
        <circle cx="387" cy="187" r="244" fill="url(#polygon-glow)" />
        <rect x="220" y="-126" width="365" height="365" rx="76" transform="rotate(25 220 -126)" fill="url(#polygon-face)" stroke="#9BCDB0" strokeOpacity=".3" />
        <rect x="317" y="57" width="310" height="310" rx="68" transform="rotate(25 317 57)" fill="url(#polygon-face)" fillOpacity=".75" stroke="#9BCDB0" strokeOpacity=".25" />
        <path d="m415 101 168 89-36 187-181 64-135-124 23-158Z" fill="#145A47" fillOpacity=".12" stroke="#A5D7B9" strokeOpacity=".26" />
        <circle cx="463" cy="180" r="93" stroke="#9FD1B4" strokeOpacity=".24" />
        <circle cx="463" cy="180" r="66" stroke="#9FD1B4" strokeOpacity=".15" />
        <circle cx="154" cy="319" r="12" stroke="#A5D7B9" strokeOpacity=".3" />
        <circle cx="192" cy="345" r="4" fill="#8FCBA7" fillOpacity=".45" />
      </svg>

      <svg className={styles.mesh} viewBox="0 0 760 450" fill="none" preserveAspectRatio="xMinYMax meet">
        <defs>
          <linearGradient id="mesh-line" x1="0" y1="430" x2="690" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="#63B38D" stopOpacity=".45" />
            <stop offset=".62" stopColor="#63B38D" stopOpacity=".19" />
            <stop offset="1" stopColor="#63B38D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 14 }, (_, index) => (
          <path
            key={index}
            d={`M -70 ${175 + index * 24} C 75 ${100 + index * 15} 170 ${320 + index * 6} 330 ${208 + index * 8} S 560 ${36 + index * 12} 790 ${130 + index * 15}`}
            stroke="url(#mesh-line)"
            strokeWidth={index % 4 === 0 ? 1.5 : 1}
          />
        ))}
        <path d="M15 257 94 247 164 274 239 267 309 306 389 289 456 312 530 301" stroke="#A2D5B5" strokeOpacity=".13" strokeDasharray="2 12" />
      </svg>

      <svg className={styles.arcs} viewBox="0 0 670 520" fill="none" preserveAspectRatio="xMaxYMax meet">
        <defs>
          <linearGradient id="arc-line" x1="96" y1="58" x2="670" y2="494" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A5D7B9" stopOpacity="0" />
            <stop offset=".58" stopColor="#7EC69E" stopOpacity=".33" />
            <stop offset="1" stopColor="#63B38D" stopOpacity=".14" />
          </linearGradient>
          <linearGradient id="arc-panel" x1="208" y1="140" x2="650" y2="505" gradientUnits="userSpaceOnUse">
            <stop stopColor="#29906B" stopOpacity=".05" />
            <stop offset="1" stopColor="#63B38D" stopOpacity=".13" />
          </linearGradient>
        </defs>
        <path d="m422 118 230 112 72 225-174 133-267-86-66-222Z" fill="url(#arc-panel)" stroke="#A5D7B9" strokeOpacity=".18" />
        {[192, 248, 304, 360, 416, 472].map((radius) => (
          <circle key={radius} cx="642" cy="516" r={radius} stroke="url(#arc-line)" strokeWidth="1.3" />
        ))}
        <path d="M164 478h27m-13-13v27M283 95h27m-13-13v27" stroke="#9FD1B4" strokeOpacity=".25" />
      </svg>

      <div className={styles.dots} />
    </div>
  );
}
