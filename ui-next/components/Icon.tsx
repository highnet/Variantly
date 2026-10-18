const PATHS: Record<string, string[]> = {
  slider: ['M3 5h18v14H3z', 'M12 3v18'],
  single: ['M3 5h18v14H3z'],
  lens: ['M3 5h18v14H3z', 'M9.5 8h5a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 14.5v-5A1.5 1.5 0 0 1 9.5 8z'],
  side: ['M3 5h8v14H3z', 'M13 5h8v14h-8z'],
  board: ['M4 6h16', 'M4 10h16', 'M4 14h16', 'M4 18h10'],
  chat: ['M4 5h16v11H9l-5 4z', 'M8 9.5h8', 'M8 12.5h5'],
  send: ['M4 12l16-8-6 16-2.5-6.5z', 'M11.5 13.5l3-3'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v6', 'M12 7.5v.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  refresh: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 5v6h-6'],
  desktop: ['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4'],
  mobile: ['M7 3h10v18H7z', 'M11 18h2'],
  sun: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  access: ['M12 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z', 'M5 8.5l7 1.5 7-1.5', 'M12 10v5', 'M8.5 21l3.5-6 3.5 6'],
};

type IconProps = {
  name: keyof typeof PATHS | string;
};

const Icon = ({ name }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(PATHS[name] ?? []).map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

/** variantly's mark: an angled before/after divider splitting a plain page from its redesign. */
const Mark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="#121216" />
    <path d="M19.5 0H24a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8h-11.5Z" fill="var(--alert)" />
    <rect x="5" y="9" width="8" height="2" rx="1" fill="#fff" opacity=".7" />
    <rect x="5" y="14" width="6" height="2" rx="1" fill="#fff" opacity=".7" />
    <rect x="5" y="19" width="7.5" height="2" rx="1" fill="#fff" opacity=".7" />
    <rect x="20" y="7" width="7" height="7" rx="1.5" fill="#121216" />
    <rect x="18" y="17" width="9" height="2.5" rx="1.25" fill="#121216" />
    <rect x="16.5" y="22" width="8" height="2.5" rx="1.25" fill="#121216" />
    <path d="M19.5 0 12.5 32" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="16" cy="16" r="3.2" fill="#fff" stroke="#121216" strokeWidth="1.4" />
  </svg>
);

export { Icon, Mark };
