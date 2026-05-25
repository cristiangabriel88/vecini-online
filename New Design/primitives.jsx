/* global React, Icons */
/* vecini.online — Primitives (drop-in shapes for src/shared/components/*) */

const { useState, useEffect, useRef } = React;

/* ── Button ────────────────────────────────────────────── */
const Button = ({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  iconOnly,
  block,
  loading,
  children,
  className = "",
  ...rest
}) => {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "sm" && "btn--sm",
    size === "lg" && "btn--lg",
    iconOnly && "btn--icon",
    block && "btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {loading ? (
        <span style={{ display: "inline-flex", animation: "iv-spin 700ms linear infinite" }}>
          <Icons.Spinner size={14} />
        </span>
      ) : (
        icon
      )}
      {!iconOnly && children}
      {!iconOnly && trailingIcon}
    </button>
  );
};

/* ── Card ──────────────────────────────────────────────── */
const Card = ({ children, hoverable, elevated, flat, className = "", ...rest }) => {
  const cls = [
    "card",
    hoverable && "card--hoverable",
    elevated && "card--elevated",
    flat && "card--flat",
    className,
  ].filter(Boolean).join(" ");
  return <div className={cls} {...rest}>{children}</div>;
};
const CardBody = ({ children, className = "", ...rest }) => (
  <div className={`card__body ${className}`} {...rest}>{children}</div>
);
const CardHeader = ({ children, className = "", ...rest }) => (
  <div className={`card__header ${className}`} {...rest}>{children}</div>
);
const CardFooter = ({ children, className = "", ...rest }) => (
  <div className={`card__footer ${className}`} {...rest}>{children}</div>
);

/* ── Field / Input / Textarea ──────────────────────────── */
const Field = ({ label, hint, error, htmlFor, children, ...rest }) => (
  <div className="field" {...rest}>
    {label && <label className="field__label" htmlFor={htmlFor}>{label}</label>}
    {children}
    {error && (
      <div className="field__error">
        <Icons.Info size={12} /> {error}
      </div>
    )}
    {!error && hint && <div className="field__hint">{hint}</div>}
  </div>
);

const Input = ({ icon, className = "", ...rest }) => {
  if (icon) {
    return (
      <div className="input-wrap">
        {icon}
        <input className={`input input--with-icon ${className}`} {...rest} />
      </div>
    );
  }
  return <input className={`input ${className}`} {...rest} />;
};

const Textarea = ({ className = "", ...rest }) => (
  <textarea className={`textarea ${className}`} {...rest} />
);

/* ── Select (custom, not native — for design control) ──── */
const Select = ({ value, onChange, options = [], placeholder = "Select…", className = "" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} className={`select ${className}`} style={{ position: "relative" }}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ color: current ? "var(--text-primary)" : "var(--text-faint)" }}>
          {current ? current.label : placeholder}
        </span>
        <Icons.ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
            padding: 4,
            zIndex: 30,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                fontSize: "var(--text-sm)",
                borderRadius: "var(--radius-sm)",
                background: o.value === value ? "var(--primary-soft)" : "transparent",
                color: o.value === value ? "var(--primary-soft-text)" : "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = "var(--bg-sunken)"; }}
              onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              <span>{o.label}</span>
              {o.value === value && <Icons.Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Badge ─────────────────────────────────────────────── */
const Badge = ({ variant = "neutral", dot, outline, children, className = "", ...rest }) => {
  const cls = ["badge", `badge--${variant}`, dot && "badge--dot", outline && "badge--outline", className]
    .filter(Boolean).join(" ");
  return <span className={cls} {...rest}>{children}</span>;
};

/* ── Switch ────────────────────────────────────────────── */
const Switch = ({ checked, onChange, label, ...rest }) => {
  const inner = (
    <button
      role="switch"
      aria-checked={!!checked}
      type="button"
      className="switch"
      data-checked={String(!!checked)}
      onClick={() => onChange && onChange(!checked)}
      {...rest}
    />
  );
  if (!label) return inner;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", minHeight: 44 }}>
      {inner}
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
};

/* ── Avatar ────────────────────────────────────────────── */
const Avatar = ({ name = "", src, size = "md", accent }) => {
  const cls = ["avatar", size === "lg" && "avatar--lg", size === "xl" && "avatar--xl", accent && "avatar--accent"]
    .filter(Boolean).join(" ");
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className={cls} title={name}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials || "?"}
    </span>
  );
};

/* ── Skeleton ──────────────────────────────────────────── */
const Skeleton = ({ w = "100%", h = 14, rounded = "var(--radius-sm)", style, ...rest }) => (
  <div
    className="skel"
    style={{ width: w, height: h, borderRadius: rounded, ...(style || {}) }}
    {...rest}
  />
);

/* ── PageHeader ────────────────────────────────────────── */
const PageHeader = ({ title, subtitle, actions, eyebrow }) => (
  <div className="pageheader">
    <div className="pageheader__main">
      {eyebrow && <div className="iv-caps">{eyebrow}</div>}
      <h1 className="pageheader__title">{title}</h1>
      {subtitle && <p className="pageheader__subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="pageheader__actions">{actions}</div>}
  </div>
);

/* ── EmptyState ────────────────────────────────────────── */
const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty">
    {icon && <div className="empty__icon">{icon}</div>}
    <div className="empty__title">{title}</div>
    {description && <div className="empty__desc">{description}</div>}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);

/* ── Modal ─────────────────────────────────────────────── */
const Modal = ({ open, onClose, title, description, footer, children }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div style={{ minWidth: 0 }}>
            <h2 className="modal__title">{title}</h2>
            {description && (
              <p style={{ margin: "4px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {description}
              </p>
            )}
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close" style={{ width: 32, height: 32 }}>
            <Icons.Close size={16} />
          </button>
        </div>
        {children && <div className="modal__body">{children}</div>}
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

/* ── Tabs ──────────────────────────────────────────────── */
const Tabs = ({ value, onChange, items }) => (
  <div className="tabs" role="tablist">
    {items.map((it) => (
      <button
        key={it.value}
        role="tab"
        aria-selected={value === it.value}
        data-active={value === it.value}
        className="tab"
        onClick={() => onChange(it.value)}
      >
        {it.icon}
        {it.label}
        {typeof it.count === "number" && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            opacity: value === it.value ? 0.9 : 0.6,
          }}>
            {it.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

/* ── Toolbar IconButton ────────────────────────────────── */
const IconButton = ({ icon, dot, label, ...rest }) => (
  <button className="iconbtn" aria-label={label} {...rest}>
    {icon}
    {dot && <span className="iconbtn__dot" />}
  </button>
);

const Kbd = ({ children }) => <kbd className="kbd">{children}</kbd>;

Object.assign(window, {
  Button, Card, CardBody, CardHeader, CardFooter,
  Field, Input, Textarea, Select,
  Badge, Switch, Avatar, Skeleton, PageHeader, EmptyState,
  Modal, Tabs, IconButton, Kbd,
});
