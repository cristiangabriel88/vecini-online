/* global React, Icons, IconButton, Avatar, Badge */
/* vecini.online — App shell components */

const Topbar = ({ onToggleTheme, theme, isMobile, onMobileMenu, pageTitle }) => {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <div className="topbar__logo" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            {/* Stylized "IV" / shared roofline mark */}
            <path d="M3 13V6l5-3.5L13 6v7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M6.5 13V9.5h3V13" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
        <div className="topbar__wordmark">
          intre<em>vecini</em>
        </div>
      </div>

      {!isMobile && <div className="topbar__sep" />}

      {!isMobile && (
        <button className="topbar__workspace" aria-haspopup="menu">
          <Avatar name="Bloc 12" size="md" accent />
          <span className="topbar__workspace-label">
            <span style={{ display: "block", fontWeight: 500, color: "var(--text-primary)", fontSize: 13, lineHeight: 1.2 }}>
              Bloc 12 · Scara A
            </span>
            <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.2, marginTop: 1 }}>
              Asociația de Proprietari
            </span>
          </span>
          <Icons.ChevronDown size={14} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
        </button>
      )}

      {isMobile && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {pageTitle || "Acasă"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.2 }}>
            Bloc 12 · Scara A
          </div>
        </div>
      )}

      {!isMobile && (
        <div className="topbar__search">
          <div className="topsearch">
            <Icons.Search size={15} />
            <input placeholder="Caută anunțuri, sesizări, vecini…" />
            <span style={{ display: "inline-flex", gap: 3 }}>
              <kbd className="kbd">⌘</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </div>
        </div>
      )}

      <div className="topbar__actions">
        {!isMobile && (
          <span className="topbar__demobanner" title="Date de demonstrație">
            <span>Demo · date sample</span>
          </span>
        )}
        {isMobile && (
          <IconButton icon={<Icons.Search size={18} />} label="Caută" />
        )}
        <IconButton
          icon={theme === "dark" ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          onClick={onToggleTheme}
          label="Comută temă"
        />
        <IconButton icon={<Icons.Bell size={18} />} dot label="Notificări" />
        {!isMobile && (
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px 4px 4px",
              borderRadius: "var(--radius)",
              cursor: "pointer",
              transition: "background 140ms ease",
              marginLeft: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            aria-label="Cont"
          >
            <Avatar name="Andrei Popescu" size="md" />
            <Icons.ChevronDown size={13} style={{ color: "var(--text-faint)" }} />
          </button>
        )}
      </div>
    </header>
  );
};

const SIDEBAR_GROUPS = [
  {
    items: [
      { id: "home", label: "Acasă", icon: "Home" },
    ],
  },
  {
    label: "Comunicare",
    items: [
      { id: "anunturi", label: "Anunțuri oficiale", icon: "Megaphone", count: 4 },
      { id: "alerta", label: "Alertă de bloc", icon: "Alert" },
      { id: "calendar", label: "Calendar evenimente", icon: "Calendar" },
    ],
  },
  {
    label: "Guvernanță",
    items: [
      { id: "vot", label: "Vot rapid", icon: "Vote", count: 1 },
    ],
  },
  {
    label: "Mentenanță și sesizări",
    items: [
      { id: "sesizari", label: "Sesizări cu foto", icon: "Camera", count: 3 },
      { id: "service", label: "Calendar service", icon: "Wrench" },
      { id: "contoare", label: "Citire contoare", icon: "Gauge" },
    ],
  },
  {
    label: "Informații",
    items: [
      { id: "arhiva", label: "Document arhivă", icon: "Doc" },
      { id: "locatari", label: "Locatari", icon: "Address" },
      { id: "urgenta", label: "Numere de urgență", icon: "Phone" },
    ],
  },
  {
    label: "Administrare",
    items: [
      { id: "settings", label: "Funcționalități", icon: "Settings" },
      { id: "apartments", label: "Apartamente", icon: "Building" },
    ],
  },
];

const Sidebar = ({ activeId, onSelect }) => (
  <aside className="sidebar" aria-label="Navigație principală">
    {SIDEBAR_GROUPS.map((group, i) => (
      <div key={i} className="sidebar__group">
        {group.label && <div className="sidebar__label">{group.label}</div>}
        {group.items.map((item) => {
          const IconComp = Icons[item.icon];
          return (
            <button
              key={item.id}
              className="navitem"
              data-active={activeId === item.id}
              onClick={() => onSelect(item.id)}
            >
              <span className="navitem__icon">
                <IconComp size={16} />
              </span>
              <span className="navitem__label">{item.label}</span>
              {item.count != null && <span className="navitem__count">{item.count}</span>}
            </button>
          );
        })}
      </div>
    ))}
    <div style={{ flex: 1 }} />
    <div style={{
      margin: "var(--space-4) var(--space-2) var(--space-2)",
      padding: "var(--space-3)",
      borderRadius: "var(--radius)",
      background: "var(--bg-sunken)",
      border: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "var(--primary-soft)", color: "var(--primary-soft-text)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icons.Info size={14} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>Ajutor și suport</div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
        Contactează administratorul sau citește ghidul rapid pentru primii pași.
      </div>
    </div>
  </aside>
);

const BOTTOM_NAV = [
  { id: "home", label: "Acasă", icon: "Home" },
  { id: "anunturi", label: "Anunțuri", icon: "Megaphone" },
  { id: "vot", label: "Vot", icon: "Vote" },
  { id: "sesizari", label: "Sesizări", icon: "Camera" },
  { id: "more", label: "Mai mult", icon: "More" },
];

const BottomNav = ({ activeId, onSelect }) => (
  <nav className="bottomnav" aria-label="Navigație">
    <div className="bottomnav__inner">
      {BOTTOM_NAV.map((it) => {
        const IconComp = Icons[it.icon];
        return (
          <button
            key={it.id}
            className="bottomnav__item"
            data-active={activeId === it.id}
            onClick={() => onSelect(it.id)}
          >
            <span className="bottomnav__icon">
              <IconComp size={22} strokeWidth={activeId === it.id ? 1.9 : 1.6} />
            </span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

Object.assign(window, { Topbar, Sidebar, BottomNav, SIDEBAR_GROUPS, BOTTOM_NAV });
