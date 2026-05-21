# UI/UX — BlocHub

## Design principles

1. **Mobile-first.** 70%+ of users will be on phones. Every layout starts from a 375px viewport.
2. **Calm and trustworthy.** This is utility software for housing decisions. Avoid playful elements that undermine seriousness (no confetti animations, no emoji-heavy copy).
3. **Romanian-first.** All copy uses proper diacritics. Numbers and dates are localized.
4. **Old-resident-friendly.** Large tap targets (minimum 44×44px), clear icons paired with labels, high contrast.
5. **Read-heavy over write-heavy.** Most residents will read announcements and click "voted yes". Optimize for browsing speed and clarity.

## Color palette

The default theme is light-mode dominant with a calm blue accent. Each asociație can override their primary color via branding settings.

CSS variables (in `globals.css`):

```css
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-2: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-primary: #2563eb;       /* overridable via branding */
  --color-primary-hover: #1d4ed8;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-urgent: #b91c1c;
}

[data-theme='dark'] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-2: #334155;
  --color-border: #334155;
  --color-text: #f1f5f9;
  --color-text-muted: #94a3b8;
  /* ... */
}
```

Tailwind config maps these as semantic colors: `bg-surface`, `text-muted`, `border-default`, `text-primary`, etc. Never use raw hex or Tailwind's default palette in components — always semantic tokens.

## Typography

- System font stack for performance: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
- Headings use slightly tighter line-height (1.25), body uses 1.6
- Base size 16px on mobile, 17px on desktop
- Limit to 4 sizes: `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px). Page titles `text-2xl font-semibold`.

## Layout

### Top-level structure

```
┌─────────────────────────────────────┐
│  Topbar: logo · asociație name · 🔔 │
├──────────┬──────────────────────────┤
│          │                          │
│  Sidebar │  Main content            │
│ (desktop)│                          │
│          │                          │
├──────────┴──────────────────────────┤
│  Bottom nav (mobile)                │
└─────────────────────────────────────┘
```

- **Desktop (≥ 1024px):** sidebar navigation, multi-column content where useful (e.g., list + detail).
- **Tablet (768-1023px):** collapsible sidebar, single-column.
- **Mobile (< 768px):** bottom navigation with 5 icons (Acasă, Anunțuri, Acțiuni, Mai mult, Profil). Sidebar replaced by a slide-in drawer accessible from "Mai mult".

### Bottom nav (mobile)

5 fixed slots. Order:
1. Acasă (home) — feed of pertinent stuff
2. Anunțuri (megaphone icon) — F01 if enabled
3. Acțiuni (lightning icon) — sesizări, voturi, rezervări
4. Mai mult (menu icon) — all other features grouped
5. Profil (person icon) — settings, apartament, logout

If a feature in slot 2/3 is disabled, the slot is replaced with the next-most-important enabled feature.

## Component library

Build a small set of primitives. All in `src/shared/components/`. Each is generic and accessible.

### Required primitives

- **Button** — variants: primary, secondary, ghost, danger. Sizes: sm, md, lg. Loading state. Icon support.
- **Input** — text, email, tel, number, password. Label, hint, error states. RHF-compatible.
- **Textarea** — auto-grow option.
- **Select** — native on mobile, custom on desktop with keyboard nav.
- **Checkbox** + **Radio** — clear focus rings.
- **Switch** — for feature flags, on/off settings.
- **Card** — title slot, body, footer. Shadow on desktop, flat on mobile.
- **Badge** — status indicators (urgent, în lucru, rezolvat etc.).
- **Modal** — focus trap, escape to close, scroll lock. Full-screen on mobile.
- **Drawer** — slides from right (or bottom on mobile).
- **Toast** — via react-hot-toast, custom styled.
- **Tabs** — horizontal scrolling on mobile if overflow.
- **Table** — responsive: cards on mobile, table on desktop.
- **EmptyState** — illustration, title, body, optional CTA. Used everywhere a list is empty.
- **Skeleton** — for loading states.
- **Avatar** — initials fallback, status dot option.
- **DatePicker** + **TimePicker** — Romanian locale.
- **FileUpload** — drag-drop on desktop, photo+camera button on mobile.
- **RichTextEditor** — wraps tiptap. Used for announcements and wiki.
- **ConfirmDialog** — for destructive actions.
- **FeatureGate** — `<FeatureGate feature="F09">…</FeatureGate>` returns null when disabled.

## Page patterns

### List pages
Header with title + filter + new button. List of cards (mobile) or table rows (desktop). Empty state when no items. Pagination or infinite scroll.

### Detail pages
Breadcrumb back. Title + metadata strip. Tabs if content has clear sections. Actions in a sticky footer on mobile, top-right on desktop.

### Form pages
One column on mobile, max-width 720px on desktop. Sections with subheadings. Save button sticky at bottom on mobile. Validation inline, error summary at top of form.

### Dashboards
Grid of cards on desktop, stacked on mobile. Each card shows one metric or one shortcut. Use sparingly — most users want to see what's new, not stats.

## Iconography

Use `lucide-react` exclusively. Pair every icon with a text label (no icon-only buttons except universal patterns like close/menu). Standard mapping:

| Concept | Icon |
|---------|------|
| Anunțuri | `Megaphone` |
| Voturi | `Vote` |
| Sesizări | `AlertCircle` |
| Rezervări | `Calendar` |
| Documente | `FileText` |
| Vecini | `Users` |
| Locator | `Home` |
| Setări | `Settings` |
| Notificări | `Bell` |
| Urgență | `Siren` |

## Empty states

Every list-style view must have a good empty state. Examples:

**No announcements:**
> "Nu sunt anunțuri publicate momentan. Vei primi o notificare când administratorul postează ceva."

**No tickets:**
> "Nicio sesizare deschisă. Dacă observi o problemă în bloc, poți raporta cu butonul de mai jos."

**No upcoming events:**
> "Nu sunt evenimente programate. Comitetul va anunța aici următoarea Adunare Generală."

## Loading states

Show skeleton screens that match the eventual layout. Never a generic spinner over the page. After 5 seconds with no response, show a banner "Conexiunea pare lentă. Verifică internetul."

## Error states

Every error has:
- A clear, non-technical description in Romanian
- A suggested action ("Reîncearcă", "Contactează administratorul")
- A small reference code (the request ID) for support

Never show stack traces to end users. Log them to Sentry (configured in env).

## Forms

- Validation on blur, not on every keystroke
- Submit button disabled until form is valid AND not submitting
- Show field-level errors below the input in red, with an icon
- Show form-level errors at the top, with a summary

## Accessibility

- All interactive elements keyboard-reachable
- Visible focus ring (`focus-visible:ring-2 focus-visible:ring-primary`)
- All images have alt text (or `alt=""` for purely decorative)
- All form fields have associated labels
- ARIA landmarks: `main`, `nav`, `complementary`, `contentinfo`
- Color is never the sole signal — also use icons/text
- Test with keyboard-only navigation before considering a page done
- Test with VoiceOver (iOS) and TalkBack (Android) for critical flows
- Respect `prefers-reduced-motion`

## Performance UX

- Optimistic updates for likes, votes, simple toggles
- Stale-while-revalidate for lists (show cached, fetch fresh)
- Image lazy loading with `loading="lazy"` + blurhash placeholders
- Defer non-critical scripts
- No layout shifts (CLS < 0.1)

## Branding / white-label

Each asociație can customize:
- Logo (uploaded to storage)
- Primary color (overrides `--color-primary`)
- Welcome message in onboarding
- Email sender name (still goes through Supabase)

The BlocHub footer remains in all installs ("Powered by BlocHub") but can be removed in higher tiers.

## Telegram Mini App UI

Mini App views are stripped-down React routes accessed via `?source=telegram_miniapp`. Detect this via URL param + `Telegram.WebApp.initData` presence. Apply:
- Hide topbar and bottom nav (Telegram provides its own)
- Use Telegram's theme colors via `Telegram.WebApp.themeParams`
- Smaller margins, native feel
- Submit actions close the mini app and send a notification back

## Print styles

Procese verbale, convocatoare AGA, listă de prezență — all must look right when printed to A4. Use `@media print` styles.
