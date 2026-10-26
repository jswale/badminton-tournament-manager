import type { ReactNode } from 'react';

export type IconName = 'shuttle' | 'court' | 'trophy' | 'player' | 'team' | 'chart' | 'clock' | 'list' | 'exit';

const PATHS: Record<IconName, ReactNode> = {
  // Volant : jupe de plumes en cône et bouchon rond en bas
  shuttle: (
    <>
      <path d="M10 15 L4.5 4.5 Q12 1.5 19.5 4.5 L14 15 Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M10 15 L4.5 4.5 Q12 1.5 19.5 4.5 L14 15 Z" />
      <path d="M12 15 L8.4 3.6 M12 15 L15.6 3.6" />
      <circle cx="12" cy="17.5" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  // Terrain de badminton
  court: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4 M8 20h8 M9 17h6" />
    </>
  ),
  player: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0 M12 20a6 6 0 0 1 9 0" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18 M6 17v-5 M11 17V7 M16 17v-8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h12 M9 12h12 M9 18h12" />
      <path d="M4 6h.01 M4 12h.01 M4 18h.01" />
    </>
  ),
  // Flèche qui sort d'un cadre : retirer du terrain
  exit: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5 M21 12H9" />
    </>
  ),
};

/** Plan vu de dessus d'un terrain de badminton (double), proportions réelles 13,40 m × 6,10 m. */
export function CourtPlan() {
  const line = { stroke: '#fff', strokeWidth: 1.2, fill: 'none' };
  return (
    <svg className="court-plan" viewBox="-4 -4 142 69" role="img" aria-label="Terrain de badminton">
      <rect x="0" y="0" width="134" height="61" fill="var(--court)" />
      <rect x="0" y="0" width="134" height="61" {...line} />
      <path d="M0 4.6H134 M0 56.4H134 M7.6 0V61 M126.4 0V61 M39.7 0V61 M94.3 0V61 M39.7 30.5H94.3" {...line} />
      <line x1="67" y1="-2" x2="67" y2="63" stroke="#fff" strokeWidth={2.2} strokeDasharray="3 2" />
    </svg>
  );
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
