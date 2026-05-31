"use client";

/** Illustration hero — contours type maquette Home.html */
export default function DashboardHeroAside() {
  return (
    <div
      className="dash-hero-ill-inner"
      aria-hidden
      title="Domaine Khelifa · Sidi Bel Abbès"
    >
      <svg viewBox="0 0 320 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect width="320" height="200" rx="10" fill="#f5f8ec" stroke="#c5ccb6" />
        <g stroke="#203b14" fill="none" strokeWidth="1" opacity="0.55">
          <path d="M 30 170 Q 80 110 160 120 T 290 150" />
          <path d="M 30 150 Q 80 90 160 100 T 290 130" />
          <path d="M 30 130 Q 80 70 160 80 T 290 110" />
          <path d="M 30 110 Q 80 50 160 60 T 290 90" />
        </g>
        <circle cx="240" cy="50" r="20" fill="#4a3212" opacity="0.85" />
        <text x="20" y="26" fontFamily="var(--font-mono)" fontSize="9" fill="#c5ccb6" letterSpacing="2">
          35°11&apos;N · 0°37&apos;W · ALT 482M
        </text>
        <text x="20" y="188" fontFamily="var(--font-mono)" fontSize="8" fill="#203b14" letterSpacing="1">
          SIDI BEL ABBÈS · VERGERS
        </text>
      </svg>
    </div>
  );
}
