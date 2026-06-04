import {
  Settings,
  Building2,
  Home,
  KeyRound,
  ShieldCheck,
  ClipboardList,
  Siren,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  /** Route path relative to /app (e.g. "admin/functionalitati"). */
  path: string;
  /** i18n key for the label. */
  labelKey: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the asociație-administration navigation. Shared by
 * the desktop sidebar (`AppLayout` Sidebar) and the mobile administration hub
 * (`AdminHubPage`), so the two never drift. Each route here lives under
 * `RequireAdmin` in the router, so visibility is also enforced per-page.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { path: 'admin/functionalitati', labelKey: 'chrome.features', icon: Settings },
  { path: 'admin/cladire', labelKey: 'chrome.building', icon: Building2 },
  { path: 'admin/apartamente', labelKey: 'chrome.apartments', icon: Home },
  { path: 'admin/invitatii', labelKey: 'chrome.invites', icon: KeyRound },
  { path: 'admin/cereri-date', labelKey: 'chrome.dataRequests', icon: ShieldCheck },
  { path: 'admin/prelucrare-date', labelKey: 'chrome.processing', icon: ClipboardList },
  { path: 'admin/incidente-date', labelKey: 'chrome.breaches', icon: Siren },
  { path: 'admin/jurnal', labelKey: 'chrome.auditLog', icon: ScrollText },
];
