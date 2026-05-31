// Minimal, monochromatic, outlined icons — Adaline imagery rules
const Icon = ({ d, size = 16, fill = "none", stroke = "currentColor", sw = 1.6, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IconDashboard = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></Icon>;
const IconMap = (p) => <Icon {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></Icon>;
const IconSpray = (p) => <Icon {...p}><path d="M6 8h6v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"/><path d="M9 8V4h3"/><circle cx="17" cy="5" r="1"/><circle cx="20" cy="8" r="1"/><circle cx="17" cy="11" r="1"/><path d="M12 4h2"/></Icon>;
const IconBox = (p) => <Icon {...p}><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="m12 11 9-4M12 11v10M12 11 3 7"/></Icon>;
const IconSatellite = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></Icon>;
const IconWifi = (p) => <Icon {...p}><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/><path d="M2 9a14 14 0 0 1 20 0"/></Icon>;
const IconLeaf = (p) => <Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9h7v7c0 5-4 9-9 9Z"/><path d="M2 22 12 12"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconPlay = (p) => <Icon {...p}><path d="M6 4l14 8-14 8V4Z"/></Icon>;
const IconPause = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Icon>;
const IconWind = (p) => <Icon {...p}><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 16h15a3 3 0 1 1-3 3"/><path d="M3 12h7"/></Icon>;
const IconDrop = (p) => <Icon {...p}><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/></Icon>;
const IconThermo = (p) => <Icon {...p}><path d="M14 14V5a2 2 0 0 0-4 0v9a4 4 0 1 0 4 0Z"/></Icon>;
const IconCompass = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m15 9-2 6-4 1 2-6 4-1Z"/></Icon>;
const IconClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="m5 13 4 4L19 7"/></Icon>;
const IconAlert = (p) => <Icon {...p}><path d="M12 3 2 21h20L12 3Z"/><path d="M12 10v5M12 18v.5"/></Icon>;
const IconChevR = (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
const IconChevL = (p) => <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>;
const IconLayers = (p) => <Icon {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconSignature = (p) => <Icon {...p}><path d="M3 18s3-1 4-3 1-7 3-7 1 6 3 6 2-3 4-3 1 4 4 4"/><path d="M3 21h18"/></Icon>;

Object.assign(window, {
  Icon, IconDashboard, IconMap, IconSpray, IconBox, IconSatellite, IconShield,
  IconWifi, IconLeaf, IconBell, IconSearch, IconDownload, IconPlus, IconPlay, IconPause,
  IconWind, IconDrop, IconThermo, IconCompass, IconClose, IconCheck, IconAlert,
  IconChevR, IconChevL, IconLayers, IconClock, IconSignature
});
