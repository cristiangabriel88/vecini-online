/* global React */
/* vecini.online — icon set
   Stroke-based, 20×20 default, currentColor.
   Distinctive (slightly rounded joins, 1.5 stroke) — not generic Heroicons. */

const Icon = ({ children, size = 18, strokeWidth = 1.6, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const Icons = {
  Home: (p) => (
    <Icon {...p}>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 9.5V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.5" />
    </Icon>
  ),
  Megaphone: (p) => (
    <Icon {...p}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M18 9.5a3 3 0 0 1 0 5" />
      <path d="M7 15v3.5a1.5 1.5 0 0 0 3 0V16" />
    </Icon>
  ),
  Alert: (p) => (
    <Icon {...p}>
      <path d="M12 3v2" />
      <path d="m18.5 5.5-1.4 1.4" />
      <path d="M21 12h-2" />
      <path d="m5.5 5.5 1.4 1.4" />
      <path d="M3 12h2" />
      <path d="M7 19a5 5 0 0 1 10 0" />
      <path d="M5 19h14" />
      <path d="M12 8a4 4 0 0 0-4 4v3h8v-3a4 4 0 0 0-4-4Z" />
    </Icon>
  ),
  Calendar: (p) => (
    <Icon {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <circle cx="8" cy="14.5" r="0.5" fill="currentColor" />
      <circle cx="12" cy="14.5" r="0.5" fill="currentColor" />
      <circle cx="16" cy="14.5" r="0.5" fill="currentColor" />
    </Icon>
  ),
  Vote: (p) => (
    <Icon {...p}>
      <path d="M5 12.5 10 17l9-10" />
      <path d="M4 19h16" />
    </Icon>
  ),
  Camera: (p) => (
    <Icon {...p}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </Icon>
  ),
  Wrench: (p) => (
    <Icon {...p}>
      <path d="M14.7 6.3a4 4 0 0 0-5 5l-5.4 5.4a1.5 1.5 0 1 0 2.1 2.1l5.4-5.4a4 4 0 0 0 5-5l-2.4 2.4-2.1-2.1 2.4-2.4Z" />
    </Icon>
  ),
  Gauge: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13 8 9" />
      <circle cx="12" cy="13" r="1" fill="currentColor" />
    </Icon>
  ),
  Doc: (p) => (
    <Icon {...p}>
      <path d="M6 3.5h8L18.5 8v11.5A1.5 1.5 0 0 1 17 21H6a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 6 4Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8 13h6" />
      <path d="M8 16h4" />
    </Icon>
  ),
  Address: (p) => (
    <Icon {...p}>
      <rect x="4" y="4.5" width="16" height="15" rx="2" />
      <circle cx="12" cy="11" r="2.2" />
      <path d="M8 16.5c.8-1.5 2.3-2.4 4-2.4s3.2.9 4 2.4" />
    </Icon>
  ),
  Phone: (p) => (
    <Icon {...p}>
      <path d="M5 4.5h3l1.5 4-2 1.3a10 10 0 0 0 4.7 4.7l1.3-2 4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 6.5a2 2 0 0 1 2-2Z" />
    </Icon>
  ),
  Settings: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M19 12c0 .5-.05 1-.15 1.5l1.7 1.3-1.8 3-2.1-.6c-.7.6-1.5 1-2.3 1.3l-.4 2.1H10l-.4-2.1a7 7 0 0 1-2.3-1.3l-2.1.6-1.8-3 1.7-1.3a7 7 0 0 1 0-3l-1.7-1.3 1.8-3 2.1.6c.7-.6 1.5-1 2.3-1.3l.4-2.1h4l.4 2.1c.8.3 1.6.7 2.3 1.3l2.1-.6 1.8 3-1.7 1.3c.1.5.15 1 .15 1.5Z" />
    </Icon>
  ),
  Building: (p) => (
    <Icon {...p}>
      <path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" />
      <path d="M14 21V11h4a1 1 0 0 1 1 1v9" />
      <path d="M8 8h3M8 12h3M8 16h3M16 14h0.5M16 17h0.5" />
      <path d="M3 21h18" />
    </Icon>
  ),
  Search: (p) => (
    <Icon {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </Icon>
  ),
  Bell: (p) => (
    <Icon {...p}>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Icon>
  ),
  Sun: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </Icon>
  ),
  Moon: (p) => (
    <Icon {...p}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icon>
  ),
  Chevron: (p) => (
    <Icon {...p}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
  ChevronDown: (p) => (
    <Icon {...p}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  Plus: (p) => (
    <Icon {...p}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  ),
  Check: (p) => (
    <Icon {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  ),
  Close: (p) => (
    <Icon {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  ),
  ArrowRight: (p) => (
    <Icon {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
  ArrowLeft: (p) => (
    <Icon {...p}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  ),
  Filter: (p) => (
    <Icon {...p}>
      <path d="M4 5h16l-6 8v6l-4-2v-4Z" />
    </Icon>
  ),
  Pin: (p) => (
    <Icon {...p}>
      <path d="m12 3 5 5-3 1-2 6-2-2-4 4M9.5 11.5l-3 3" />
    </Icon>
  ),
  Clock: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </Icon>
  ),
  Pencil: (p) => (
    <Icon {...p}>
      <path d="m4 20 1-4 11-11 3 3-11 11-4 1Z" />
      <path d="m14 7 3 3" />
    </Icon>
  ),
  Image: (p) => (
    <Icon {...p}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </Icon>
  ),
  Mic: (p) => (
    <Icon {...p}>
      <rect x="9" y="4" width="6" height="10" rx="3" />
      <path d="M6 12a6 6 0 0 0 12 0" />
      <path d="M12 18v3" />
    </Icon>
  ),
  Send: (p) => (
    <Icon {...p}>
      <path d="m4 12 16-8-7 16-2-7-7-1Z" />
    </Icon>
  ),
  More: (p) => (
    <Icon {...p}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" />
    </Icon>
  ),
  Info: (p) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8v.5" />
    </Icon>
  ),
  ThumbsUp: (p) => (
    <Icon {...p}>
      <path d="M7 10v9H4v-9h3Z" />
      <path d="M7 10c2-1 3-3 3-5 0-1 0-2 1.5-2S13 4 13 6c0 1.5-.5 3-1 4h5.5A1.5 1.5 0 0 1 19 11.5l-1.5 6A2 2 0 0 1 15.5 19H7" />
    </Icon>
  ),
  Spinner: (p) => (
    <Icon {...p}>
      <path d="M12 4a8 8 0 0 1 8 8" />
    </Icon>
  ),
};

window.Icons = Icons;
window.Icon = Icon;
