/* global React, Icons, Button, Card, CardBody, CardHeader, CardFooter,
   Field, Input, Textarea, Select, Badge, Switch, Avatar, Skeleton,
   PageHeader, EmptyState, Modal, Tabs, IconButton */

const { useState: useState_p } = React;

/* ============================================================
   HOME — feed-style with hero vote, urgent alerts, upcoming
   ============================================================ */

const HomePage = ({ loading, isMobile, onNavigate }) => {
  if (loading) return <HomeSkeleton />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <PageHeader
        eyebrow="Bună dimineața, Andrei"
        title="Ce se întâmplă în Bloc 12"
        subtitle="6 vecini activi astăzi · ultimul rezumat ieri, ora 21:30"
        actions={
          !isMobile && (
            <>
              <Button variant="ghost" size="md" icon={<Icons.Calendar size={15} />}>
                Astăzi
              </Button>
              <Button variant="secondary" size="md" icon={<Icons.Filter size={15} />}>
                Filtre
              </Button>
              <Button variant="primary" size="md" icon={<Icons.Plus size={15} />}>
                Anunț nou
              </Button>
            </>
          )
        }
      />

      {/* Hero — active poll */}
      <ActivePollHero onNavigate={onNavigate} />

      {/* Quick stats / status strip */}
      <StatusStrip />

      {/* Two-column on desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 320px",
        gap: "var(--space-6)",
        alignItems: "start",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", minWidth: 0 }}>
          <AnnouncementsFeed onNavigate={onNavigate} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <UpcomingCard />
          <UrgentNumbersCard />
        </div>
      </div>
    </div>
  );
};

const ActivePollHero = ({ onNavigate }) => {
  const [voted, setVoted] = useState_p(null);
  const total = 18;
  const counts = { da: 11, nu: 4, abt: 2 };
  const myVote = voted || null;
  const pct = (k) => Math.round((counts[k] / total) * 100);
  return (
    <Card elevated style={{ position: "relative", overflow: "hidden" }}>
      {/* Subtle accent corner */}
      <div aria-hidden="true" style={{
        position: "absolute", top: -40, right: -40, width: 220, height: 220,
        background: "radial-gradient(circle, var(--accent-100) 0%, transparent 65%)",
        opacity: 0.6, pointerEvents: "none",
      }} />
      <div className="card__body" style={{ padding: "var(--space-6)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Badge variant="accent" dot>Vot activ</Badge>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span className="iv-mono iv-tabular">2 zile</span> rămase · închidere 24 mai
          </span>
        </div>
        <h2 style={{
          margin: 0,
          fontSize: "var(--text-2xl)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}>
          Înlocuirea interfonului audio cu unul video
        </h2>
        <p style={{
          margin: "var(--space-2) 0 var(--space-5)",
          fontSize: "var(--text-sm)",
          color: "var(--text-secondary)",
          maxWidth: "62ch",
          lineHeight: 1.55,
        }}>
          Comitetul propune înlocuirea interfonului audio cu unul video.
          Cost estimat <span className="iv-mono iv-tabular" style={{ color: "var(--text-primary)", fontWeight: 500 }}>12.500 lei</span> din fondul de reparații.
        </p>

        {!myVote ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" icon={<Icons.Check size={15} />} onClick={() => setVoted("da")}>
              Sunt de acord
            </Button>
            <Button variant="secondary" icon={<Icons.Close size={15} />} onClick={() => setVoted("nu")}>
              Nu sunt de acord
            </Button>
            <Button variant="ghost" onClick={() => setVoted("abt")}>
              Mă abțin
            </Button>
            <Button variant="ghost" trailingIcon={<Icons.ArrowRight size={14} />}
              style={{ marginLeft: "auto", color: "var(--text-muted)" }}
              onClick={() => onNavigate("vot")}>
              Vezi detalii
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge variant="success" dot>Votul tău a fost înregistrat</Badge>
              <button
                onClick={() => setVoted(null)}
                style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Schimbă
              </button>
            </div>
            {["da", "nu", "abt"].map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 80, fontSize: 13, color: myVote === k ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: myVote === k ? 500 : 400 }}>
                  {k === "da" ? "De acord" : k === "nu" ? "Împotrivă" : "Abțineri"}
                </span>
                <div style={{ flex: 1, height: 6, background: "var(--bg-sunken)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct(k)}%`, height: "100%",
                    background: myVote === k ? "var(--primary)" : "var(--border-strong)",
                    borderRadius: 999, transition: "width 400ms ease",
                  }} />
                </div>
                <span className="iv-mono iv-tabular" style={{ fontSize: 12, color: "var(--text-muted)", width: 56, textAlign: "right" }}>
                  {counts[k]} · {pct(k)}%
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              <span className="iv-mono iv-tabular">{total}</span> din <span className="iv-mono iv-tabular">24</span> apartamente au votat
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const StatusStrip = () => {
  const items = [
    { label: "Sold fond de reparații", value: "48.230 lei", trend: "+1.250", trendUp: true, icon: "Building" },
    { label: "Sesizări deschise", value: "3", sub: "1 urgentă", icon: "Camera", urgent: true },
    { label: "Apartamente cu restanțe", value: "2 din 24", sub: "8% din total", icon: "Address" },
    { label: "Următoarea ședință", value: "5 iunie", sub: "ora 18:00", icon: "Calendar" },
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "var(--space-3)",
    }}>
      {items.map((it, i) => {
        const IconComp = Icons[it.icon];
        return (
          <Card key={i} flat style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}>
            <div className="card__body" style={{ padding: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", letterSpacing: -0.1, lineHeight: 1.35 }}>{it.label}</span>
                <span style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: it.urgent ? "var(--danger-soft)" : "var(--bg-sunken)",
                  color: it.urgent ? "var(--danger-text)" : "var(--text-muted)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconComp size={13} />
                </span>
              </div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                <span className="iv-tabular">{it.value}</span>
              </div>
              {it.trend && (
                <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--success-text)" }}>
                  <span className="iv-mono iv-tabular">{it.trend}</span> luna aceasta
                </div>
              )}
              {it.sub && !it.trend && (
                <div style={{ marginTop: 2, fontSize: 11.5, color: it.urgent ? "var(--danger-text)" : "var(--text-muted)" }}>{it.sub}</div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const ANNOUNCEMENTS = [
  {
    id: 1, kind: "urgent", pinned: true,
    title: "Întrerupere apă caldă — 25 mai",
    excerpt: "Lucrări de mentenanță programate pentru rețeaua de apă caldă, între orele 09:00 și 14:00. Vă rugăm să aveți rezerve de apă.",
    date: "20.05.2026",
    time: "13:00",
    author: "Cristina Marinescu",
    role: "Administrator",
    comments: 7,
    tag: "Important",
  },
  {
    id: 2, kind: "event",
    title: "Adunarea Generală anuală — 5 iunie, ora 18:00",
    excerpt: "Ordinea de zi: aprobarea bugetului, alegerea comitetului, înlocuire interfon. Documentele pot fi consultate în arhivă.",
    date: "18.05.2026",
    time: "12:00",
    author: "Comitetul de bloc",
    role: "Comitet",
    comments: 12,
    tag: "Eveniment",
  },
  {
    id: 3, kind: "info",
    title: "Curățenie generală pe casa scării",
    excerpt: "Sâmbătă, 30 mai, va avea loc curățenia generală a casei scării. Echipa va începe lucrul la ora 08:00.",
    date: "17.05.2026",
    time: "09:30",
    author: "Cristina Marinescu",
    role: "Administrator",
    comments: 3,
    tag: "Informativ",
  },
  {
    id: 4, kind: "info",
    title: "Schimbare zile de colectare gunoi",
    excerpt: "Începând cu 1 iunie, colectarea deșeurilor reciclabile se va face marți și vineri.",
    date: "15.05.2026",
    time: "16:45",
    author: "Andrei Popescu",
    role: "Comitet",
    comments: 1,
    tag: "Informativ",
  },
];

const tagToVariant = {
  Important: "danger",
  Eveniment: "info",
  Informativ: "neutral",
  Urgent: "danger",
};

const AnnouncementsFeed = ({ onNavigate }) => (
  <Card flat>
    <CardHeader>
      <div>
        <h3 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          Anunțuri recente
        </h3>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
          4 anunțuri publicate · ultimele 7 zile
        </p>
      </div>
      <button
        onClick={() => onNavigate("anunturi")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 12.5, color: "var(--primary-soft-text)", fontWeight: 500,
          padding: "6px 8px", borderRadius: "var(--radius-sm)",
          transition: "background 140ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-soft)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        Vezi toate <Icons.ArrowRight size={13} />
      </button>
    </CardHeader>
    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
      {ANNOUNCEMENTS.map((a, i) => (
        <AnnouncementRow
          key={a.id}
          a={a}
          last={i === ANNOUNCEMENTS.length - 1}
          onClick={() => onNavigate("detail", a)}
        />
      ))}
    </div>
  </Card>
);

const AnnouncementRow = ({ a, last, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: "100%",
      display: "block",
      textAlign: "left",
      padding: "var(--space-4) var(--space-5)",
      borderBottom: last ? "none" : "1px solid var(--border-subtle)",
      cursor: "pointer",
      transition: "background 140ms ease",
      position: "relative",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <Badge variant={tagToVariant[a.tag]} dot={a.kind === "urgent"}>
        {a.tag}
      </Badge>
      {a.pinned && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
          <Icons.Pin size={11} /> Fixat
        </span>
      )}
      <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-faint)" }} className="iv-mono iv-tabular">
        {a.date}
      </span>
    </div>
    <h4 style={{
      margin: 0,
      fontSize: "var(--text-md)",
      fontWeight: 550,
      letterSpacing: "-0.01em",
      color: "var(--text-primary)",
    }}>
      {a.title}
    </h4>
    <p style={{
      margin: "4px 0 10px",
      fontSize: "var(--text-sm)",
      color: "var(--text-secondary)",
      lineHeight: 1.5,
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    }}>
      {a.excerpt}
    </p>
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--text-muted)" }}>
      <Avatar name={a.author} size="md" />
      <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{a.author}</span>
      <span style={{ width: 3, height: 3, background: "var(--text-faint)", borderRadius: 999 }} />
      <span>{a.role}</span>
      <span style={{ width: 3, height: 3, background: "var(--text-faint)", borderRadius: 999 }} />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Icons.More size={12} /> {a.comments} comentarii
      </span>
    </div>
  </button>
);

const UpcomingCard = () => (
  <Card flat>
    <div className="card__body" style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          În curând
        </h3>
        <Icons.Calendar size={15} style={{ color: "var(--text-muted)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { d: "25", m: "mai", title: "Întrerupere apă caldă", time: "09:00 – 14:00", kind: "danger" },
          { d: "30", m: "mai", title: "Curățenie casa scării", time: "08:00", kind: "neutral" },
          { d: "05", m: "iun", title: "Adunarea Generală", time: "18:00 · Sala comună", kind: "accent" },
          { d: "12", m: "iun", title: "Citire contoare apă", time: "Ferestre orare 9–17", kind: "info" },
        ].map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 38, height: 42,
              borderRadius: "var(--radius-sm)",
              background: e.kind === "accent" ? "var(--primary-soft)" :
                          e.kind === "danger" ? "var(--danger-soft)" :
                          e.kind === "info" ? "var(--info-soft)" : "var(--bg-sunken)",
              color: e.kind === "accent" ? "var(--primary-soft-text)" :
                     e.kind === "danger" ? "var(--danger-text)" :
                     e.kind === "info" ? "var(--info-text)" : "var(--text-secondary)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span className="iv-tabular" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{e.d}</span>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{e.m}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.005em" }}>{e.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const UrgentNumbersCard = () => (
  <Card flat>
    <div className="card__body" style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          Numere de urgență
        </h3>
        <Icons.Phone size={15} style={{ color: "var(--text-muted)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Administrator", name: "Cristina Marinescu", phone: "0744 123 456" },
          { label: "Comitet", name: "Andrei Popescu", phone: "0722 555 102" },
          { label: "Instalator (24h)", name: "Pavel Stoica", phone: "0733 008 215" },
        ].map((p, i) => (
          <a key={i} href={`tel:${p.phone.replace(/\s/g, "")}`} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 8px",
            borderRadius: "var(--radius-sm)",
            transition: "background 140ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-sunken)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Avatar name={p.name} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.label}</div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{p.name}</div>
            </div>
            <span className="iv-mono iv-tabular" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {p.phone}
            </span>
          </a>
        ))}
      </div>
    </div>
  </Card>
);

/* ============================================================
   ANUNȚURI (F01) — list with filters and tabs
   ============================================================ */

const AnunturiPage = ({ onNavigate, isMobile }) => {
  const [tab, setTab] = useState_p("all");
  const [q, setQ] = useState_p("");
  const filtered = ANNOUNCEMENTS.filter((a) => {
    if (tab !== "all" && a.kind !== tab) return false;
    if (q && !(a.title + a.excerpt).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <PageHeader
        eyebrow="F01 · Comunicare"
        title="Anunțuri oficiale"
        subtitle="Mesaje publicate de comitet și administrator. Locatarii sunt notificați automat."
        actions={
          <>
            {!isMobile && <Button variant="ghost" icon={<Icons.Doc size={15} />}>Exportă</Button>}
            <Button variant="primary" icon={<Icons.Plus size={15} />}>
              Anunț nou
            </Button>
          </>
        }
      />

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        flexWrap: "wrap",
      }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "Toate", count: ANNOUNCEMENTS.length },
            { value: "urgent", label: "Urgente", count: 1 },
            { value: "event", label: "Evenimente", count: 1 },
            { value: "info", label: "Informative", count: 2 },
          ]}
        />
        <div style={{ flex: 1, maxWidth: 360, minWidth: 200 }}>
          <Input
            icon={<Icons.Search size={15} />}
            placeholder="Caută în anunțuri…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!isMobile && (
          <Button variant="secondary" size="md" icon={<Icons.Filter size={15} />} trailingIcon={<Icons.ChevronDown size={13} />}>
            Filtrează
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card flat>
          <EmptyState
            icon={<Icons.Megaphone size={22} />}
            title="Nicio potrivire"
            description="Schimbă filtrul activ sau publică un anunț nou pentru locatarii din scara A."
            action={<Button variant="soft" icon={<Icons.Plus size={14} />}>Publică anunț</Button>}
          />
        </Card>
      ) : (
        <Card flat>
          {filtered.map((a, i) => (
            <AnnouncementRow
              key={a.id}
              a={a}
              last={i === filtered.length - 1}
              onClick={() => onNavigate("detail", a)}
            />
          ))}
        </Card>
      )}
    </div>
  );
};

/* ============================================================
   ANUNȚ DETAIL
   ============================================================ */

const AnuntDetailPage = ({ data, onBack, isMobile }) => {
  const a = data || ANNOUNCEMENTS[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 760, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-muted)",
          padding: "4px 0", alignSelf: "flex-start",
          transition: "color 140ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
      >
        <Icons.ArrowLeft size={14} /> Înapoi la anunțuri
      </button>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Badge variant={tagToVariant[a.tag]} dot={a.kind === "urgent"}>{a.tag}</Badge>
          {a.pinned && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
              <Icons.Pin size={12} /> Fixat
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-faint)" }} className="iv-mono iv-tabular">
            {a.date} · {a.time}
          </span>
        </div>
        <h1 style={{
          margin: 0,
          fontSize: isMobile ? "var(--text-2xl)" : "var(--text-3xl)",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
          color: "var(--text-primary)",
        }}>
          {a.title}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <Avatar name={a.author} size="lg" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{a.author}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.role} · Bloc 12, Scara A</div>
          </div>
        </div>
      </div>

      <Card>
        <div className="card__body" style={{ padding: "var(--space-6)" }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--text-primary)" }}>
            Stimați locatari,
          </p>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.65, color: "var(--text-secondary)" }}>
            {a.excerpt} Pentru a evita orice neplăceri, vă rugăm să vă asigurați rezerve de apă pentru
            consum casnic și să programați activitățile care necesită apă caldă în afara intervalului
            menționat.
          </p>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.65, color: "var(--text-secondary)" }}>
            Echipa tehnică va începe lucrările punctual și ne așteptăm ca apa caldă să fie disponibilă
            din nou cel târziu la ora 14:00. Vom posta o confirmare odată ce lucrările sunt finalizate.
          </p>

          <div style={{
            marginTop: 22,
            padding: "var(--space-4)",
            background: "var(--warning-soft)",
            color: "var(--warning-text)",
            borderRadius: "var(--radius)",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            border: "1px solid oklch(from var(--warning-500) l c h / 0.2)",
          }}>
            <Icons.Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              <strong style={{ fontWeight: 600 }}>Bun de știut:</strong> dacă observați scurgeri sau presiune
              anormală după ora 14:00, raportați imediat o sesizare cu foto.
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button variant="primary" icon={<Icons.ThumbsUp size={14} />}>
          Confirm (12)
        </Button>
        <Button variant="secondary" icon={<Icons.Bell size={14} />}>
          Memento pe telefon
        </Button>
        <Button variant="ghost" icon={<Icons.Send size={14} />}>
          Trimite la vecin
        </Button>
        <Button variant="ghost" iconOnly icon={<Icons.More size={16} />} style={{ marginLeft: "auto" }} aria-label="Mai multe" />
      </div>

      <Card flat>
        <div className="card__body" style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Comentarii</h3>
            <Badge variant="neutral">{a.comments}</Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { name: "Maria Ionescu", role: "Ap. 7", time: "acum 2 ore", text: "Mulțumim pentru anunț! Vom planifica spălatul rufelor seara." },
              { name: "Vlad Georgescu", role: "Ap. 14", time: "acum 4 ore", text: "Este posibil ca lucrările să se prelungească? Lucrez de acasă în acea zi." },
            ].map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <Avatar name={c.name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>· {c.role}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>· {c.time}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Avatar name="Andrei Popescu" size="md" />
            <div style={{ flex: 1 }}>
              <Textarea placeholder="Scrie un comentariu… vecinii vor primi notificare." rows={2} style={{ minHeight: 64 }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Diacriticele sunt activate</span>
                <Button size="sm" variant="primary" icon={<Icons.Send size={13} />}>Trimite</Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   SESIZARE CU FOTO — form flow
   ============================================================ */

const SesizareFormPage = ({ onBack, isMobile }) => {
  const [category, setCategory] = useState_p("interior");
  const [location, setLocation] = useState_p("scara");
  const [title, setTitle] = useState_p("Bec ars în casa scării — etajul 3");
  const [desc, setDesc] = useState_p("Becul de pe palierul dintre etajul 3 și 4 este ars de aproximativ 3 zile. Seara este foarte întuneric pe scări.");
  const [urgent, setUrgent] = useState_p(false);
  const [submitted, setSubmitted] = useState_p(false);

  if (submitted) {
    return (
      <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: "var(--space-12)" }}>
        <Card elevated>
          <div className="card__body" style={{ padding: "var(--space-8)", textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, margin: "0 auto var(--space-4)",
              borderRadius: "50%",
              background: "var(--success-soft)",
              color: "var(--success-text)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icons.Check size={28} />
            </div>
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Sesizarea a fost trimisă
            </h2>
            <p style={{ margin: "8px 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
              <span className="iv-mono">#SE-2026-0042</span> · Administratorul va vedea sesizarea în maxim 2 ore.
              Vei primi notificare când statutul se schimbă.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" onClick={() => setSubmitted(false)}>
                Vezi sesizarea
              </Button>
              <Button variant="ghost" onClick={onBack}>
                Înapoi la acasă
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 720, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-muted)", alignSelf: "flex-start",
          padding: "4px 0",
        }}
      >
        <Icons.ArrowLeft size={14} /> Anulează
      </button>

      <PageHeader
        eyebrow="Mentenanță"
        title="Sesizare nouă"
        subtitle="Adaugă cel puțin o fotografie. Doar administratorul și comitetul văd sesizările."
      />

      <Card>
        <div className="card__body" style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

          <Field label="Categorie" hint="Ajută administratorul să prioritizeze">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8 }}>
              {[
                { v: "interior", l: "Părți comune", i: "Building" },
                { v: "exterior", l: "Exterior", i: "Image" },
                { v: "utilitati", l: "Utilități", i: "Wrench" },
                { v: "siguranta", l: "Siguranță", i: "Alert" },
              ].map((opt) => {
                const I = Icons[opt.i];
                const active = category === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => setCategory(opt.v)}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      minHeight: 48,
                      borderRadius: "var(--radius)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--border-strong)"}`,
                      background: active ? "var(--primary-soft)" : "var(--bg-surface)",
                      color: active ? "var(--primary-soft-text)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 140ms ease",
                      boxShadow: active ? "0 0 0 3px var(--ring)" : "var(--shadow-xs)",
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                    }}
                  >
                    <I size={16} />
                    {opt.l}
                  </button>
                );
              })}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <Field label="Locație" hint="Unde se află problema">
              <Select
                value={location}
                onChange={setLocation}
                options={[
                  { value: "scara", label: "Casa scării" },
                  { value: "lift", label: "Lift" },
                  { value: "subsol", label: "Subsol / pivniță" },
                  { value: "fatada", label: "Fațadă / acoperiș" },
                  { value: "curte", label: "Curte / parcare" },
                ]}
              />
            </Field>
            <Field label="Etaj / detaliu" hint="Opțional, ex. „între etajele 3-4”">
              <Input placeholder="Ex. Etaj 3, paliere" defaultValue="Etaj 3-4" />
            </Field>
          </div>

          <Field label="Titlu" hint="Pe scurt, ce s-a întâmplat">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Bec ars la etajul 3" />
          </Field>

          <Field label="Descriere">
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Detalii suplimentare — când ai observat, dacă se repetă, etc."
            />
          </Field>

          <Field label="Fotografii" hint="Minim 1, maxim 4 · până la 8 MB fiecare">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <PhotoSlot filled />
              <PhotoSlot filled muted />
              <PhotoSlot />
              <PhotoSlot disabled />
            </div>
          </Field>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--bg-sunken)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius)",
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                Marchează drept urgent
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Administratorul va primi notificare instant și pe telefon
              </div>
            </div>
            <Switch checked={urgent} onChange={setUrgent} />
          </div>
        </div>
        <div className="card__footer" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        }}>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Sesizarea va primi automat ID-ul <span className="iv-mono">SE-2026-0042</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" onClick={onBack}>Anulează</Button>
            <Button variant="primary" onClick={() => setSubmitted(true)} icon={<Icons.Send size={14} />}>
              Trimite sesizarea
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const PhotoSlot = ({ filled, muted, disabled }) => {
  if (filled) {
    return (
      <div style={{
        aspectRatio: "1 / 1",
        borderRadius: "var(--radius)",
        background: muted ?
          "linear-gradient(135deg, oklch(85% 0.02 60) 0%, oklch(75% 0.025 50) 100%)" :
          "linear-gradient(135deg, oklch(78% 0.04 200) 0%, oklch(64% 0.05 220) 100%)",
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at 30% 25%, oklch(100% 0 0 / 0.25), transparent 50%)",
        }} />
        <button style={{
          position: "absolute", top: 6, right: 6,
          width: 22, height: 22, borderRadius: 999,
          background: "oklch(0% 0 0 / 0.45)", color: "white",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icons.Close size={11} />
        </button>
      </div>
    );
  }
  return (
    <button
      disabled={disabled}
      type="button"
      style={{
        aspectRatio: "1 / 1",
        borderRadius: "var(--radius)",
        background: "var(--bg-sunken)",
        border: "1.5px dashed var(--border-strong)",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 140ms ease, background 140ms ease",
        fontSize: 11,
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary-soft-text)"; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; } }}
    >
      <Icons.Camera size={18} />
      Adaugă
    </button>
  );
};

/* ============================================================
   SKELETONS (loading states)
   ============================================================ */

const HomeSkeleton = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
    <div className="pageheader">
      <div className="pageheader__main">
        <Skeleton w={140} h={11} />
        <div style={{ height: 8 }} />
        <Skeleton w={320} h={28} />
        <div style={{ height: 8 }} />
        <Skeleton w={260} h={14} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Skeleton w={100} h={40} rounded="var(--radius)" />
        <Skeleton w={120} h={40} rounded="var(--radius)" />
      </div>
    </div>
    <Card>
      <div className="card__body" style={{ padding: "var(--space-6)" }}>
        <Skeleton w={80} h={20} rounded="var(--radius-full)" />
        <div style={{ height: 14 }} />
        <Skeleton w="80%" h={24} />
        <div style={{ height: 10 }} />
        <Skeleton w="100%" h={14} />
        <div style={{ height: 6 }} />
        <Skeleton w="65%" h={14} />
      </div>
    </Card>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
      {[0,1,2,3].map((i) => (
        <Card key={i}><div className="card__body"><Skeleton w={100} h={11} /><div style={{ height: 12 }} /><Skeleton w={80} h={22} /></div></Card>
      ))}
    </div>
  </div>
);

Object.assign(window, {
  HomePage, AnunturiPage, AnuntDetailPage, SesizareFormPage, HomeSkeleton, ANNOUNCEMENTS,
});
