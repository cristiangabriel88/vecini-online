/* global React, ReactDOM,
   Topbar, Sidebar, BottomNav,
   HomePage, AnunturiPage, AnuntDetailPage, SesizareFormPage,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakToggle, TweakSelect, Icons */

const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "palette": "sage",
  "density": "default",
  "viewport": "desktop"
}/*EDITMODE-END*/;

// Swatch hexes for the Tweaks color chips (approx OKLCH mid-tones)
const PALETTE_HEX = {
  sage:       "#5E8A6E",
  terracotta: "#B86340",
  indigo:     "#5453BD",
  plum:       "#91527A",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULS);
  const [active, setActive] = useState("home");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  // Apply theme + palette to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", t.theme);
    root.setAttribute("data-palette", t.palette);
    root.setAttribute("data-density", t.density);
  }, [t.theme, t.palette, t.density]);

  // Initial load shimmer
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(id);
  }, []);

  // Map sidebar/bottom-nav id → page
  const handleSelect = (id) => {
    setDetail(null);
    setActive(id);
  };

  const handleNavigate = (target, data) => {
    if (target === "detail") {
      setDetail(data);
      setActive("anunturi-detail");
    } else {
      setDetail(null);
      setActive(target);
    }
  };

  const isMobile = t.viewport === "mobile";

  const PAGE_TITLE = {
    home: "Acasă",
    anunturi: "Anunțuri",
    "anunturi-detail": "Anunț",
    alerta: "Alertă",
    calendar: "Calendar",
    vot: "Vot rapid",
    sesizari: "Sesizare nouă",
    service: "Service",
    contoare: "Contoare",
    arhiva: "Arhivă",
    locatari: "Locatari",
    urgenta: "Urgență",
    settings: "Setări",
    apartments: "Apartamente",
    more: "Meniu",
  };

  const renderPage = () => {
    if (active === "home") return <HomePage loading={loading} isMobile={isMobile} onNavigate={handleNavigate} />;
    if (active === "anunturi") return <AnunturiPage onNavigate={handleNavigate} isMobile={isMobile} />;
    if (active === "anunturi-detail") return <AnuntDetailPage data={detail} onBack={() => setActive("anunturi")} isMobile={isMobile} />;
    if (active === "sesizari") return <SesizareFormPage onBack={() => setActive("home")} isMobile={isMobile} />;
    // Fallback placeholder for other nav items
    return <PlaceholderPage id={active} title={PAGE_TITLE[active]} />;
  };

  // Outer frame
  const shellClass = `shell ${isMobile ? "shell--mobile" : "shell--desktop"}`;

  return (
    <>
      {/* Stage wrapper: when mobile, render phone-sized frame; else full bleed */}
      <DeviceStage mode={t.viewport}>
        <div className={shellClass}>
          <Topbar
            theme={t.theme}
            onToggleTheme={() => setTweak("theme", t.theme === "light" ? "dark" : "light")}
            isMobile={isMobile}
            pageTitle={PAGE_TITLE[active]}
          />
          {!isMobile && <Sidebar activeId={active} onSelect={handleSelect} />}
          <main className="main">
            <div className="main__inner">
              {renderPage()}
            </div>
          </main>
          {isMobile && (
            <BottomNav
              activeId={
                ["home", "anunturi", "vot", "sesizari"].includes(active) ? active :
                active === "anunturi-detail" ? "anunturi" : "more"
              }
              onSelect={handleSelect}
            />
          )}
        </div>
      </DeviceStage>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Temă">
          <TweakRadio
            label="Mod"
            value={t.theme}
            options={[{ value: "light", label: "Lumină" }, { value: "dark", label: "Întuneric" }]}
            onChange={(v) => setTweak("theme", v)}
          />
          <TweakRadio
            label="Densitate"
            value={t.density}
            options={[{ value: "default", label: "Standard" }, { value: "compact", label: "Compact" }]}
            onChange={(v) => setTweak("density", v)}
          />
        </TweakSection>
        <TweakSection label="Accent">
          <TweakColor
            label="Paletă"
            value={PALETTE_HEX[t.palette]}
            options={["sage", "terracotta", "indigo", "plum"].map((p) => PALETTE_HEX[p])}
            onChange={(hex) => {
              const name = Object.entries(PALETTE_HEX).find(([, v]) => v === hex)?.[0] || "sage";
              setTweak("palette", name);
            }}
          />
        </TweakSection>
        <TweakSection label="Vizualizare">
          <TweakRadio
            label="Format"
            value={t.viewport}
            options={[{ value: "desktop", label: "Desktop" }, { value: "mobile", label: "Mobil" }]}
            onChange={(v) => setTweak("viewport", v)}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

/* DeviceStage: wraps the shell in a phone-frame when mobile, else full screen. */
function DeviceStage({ mode, children }) {
  if (mode !== "mobile") {
    return <div style={{ position: "absolute", inset: 0 }}>{children}</div>;
  }
  // Phone-sized frame, centered on a calm background
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-canvas)",
      overflow: "auto",
      padding: 32,
    }}>
      <div style={{
        width: 390,
        height: 844,
        maxHeight: "calc(100vh - 64px)",
        borderRadius: 44,
        background: "var(--bg-canvas)",
        boxShadow: "0 0 0 11px oklch(15% 0.01 60), 0 0 0 13px oklch(28% 0.012 60), var(--shadow-lg)",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* Status bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 44,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em",
          color: "var(--text-primary)", zIndex: 30,
          background: "var(--bg-canvas)",
        }}>
          <span className="iv-tabular">9:41</span>
          <div style={{
            position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)",
            width: 110, height: 28, borderRadius: 20, background: "oklch(15% 0.01 60)",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
              <rect x="0" y="6" width="3" height="5" rx="0.5" />
              <rect x="4" y="4" width="3" height="7" rx="0.5" />
              <rect x="8" y="2" width="3" height="9" rx="0.5" />
              <rect x="12" y="0" width="3" height="11" rx="0.5" />
            </svg>
            <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
              <rect x="0.5" y="0.5" width="14" height="10" rx="2" stroke="currentColor" />
              <rect x="2" y="2" width="11" height="7" rx="1" fill="currentColor" />
              <rect x="15.5" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ id, title }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: "var(--text-2xl)",
          fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text-primary)",
        }}>{title}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Această pagină folosește același sistem ca celelalte ecrane redesenate.
        </p>
      </div>
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div className="empty">
          <div className="empty__icon">
            {Icons[id === "vot" ? "Vote" : id === "calendar" ? "Calendar" : id === "contoare" ? "Gauge" : id === "arhiva" ? "Doc" : "Settings"]?.({ size: 22 })}
          </div>
          <div className="empty__title">Pagina „{title}” folosește același sistem</div>
          <div className="empty__desc">
            Componentele, spațierea, culorile și tipografia sunt aceleași. Selectează Acasă, Anunțuri sau Sesizări pentru a vedea ecrane complete.
          </div>
        </div>
      </div>
    </div>
  );
}

window.App = App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
