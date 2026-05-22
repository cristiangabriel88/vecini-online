import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  Info,
  LifeBuoy,
  Mail,
  LogOut,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  MessageSquare,
  Check,
} from 'lucide-react';
import { useTintStore, type Tint } from '@/shared/store/tintStore';
import { useAuthStore } from '@/shared/store/authStore';
import { Modal } from '@/shared/components/Modal';
import { cn } from '@/shared/lib/cn';

/* Demo identity shown in the menu header. Real auth wires the profile later. */
const USER_NAME = 'Andrei Popescu';
const SUPPORT_EMAIL = 'contact@vecini.online';

/* Accent tints offered in the menu. `swatch` is a vivid, readable
   representative of each palette (a white check reads on all five);
   the live app accents come from the [data-palette] blocks in tokens.css. */
const TINTS: { id: Tint; nameKey: string; swatch: string }[] = [
  { id: 'sage', nameKey: 'chrome.userMenu.tintSage', swatch: 'oklch(54% 0.1 140)' },
  { id: 'terracotta', nameKey: 'chrome.userMenu.tintTerracotta', swatch: 'oklch(58% 0.13 38)' },
  { id: 'ocean', nameKey: 'chrome.userMenu.tintOcean', swatch: 'oklch(55% 0.12 224)' },
  { id: 'indigo', nameKey: 'chrome.userMenu.tintIndigo', swatch: 'oklch(50% 0.14 262)' },
  { id: 'plum', nameKey: 'chrome.userMenu.tintPlum', swatch: 'oklch(54% 0.12 340)' },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

type InfoModal = 'about' | 'help' | 'contact' | null;

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tint = useTintStore((s) => s.tint);
  const setTint = useTintStore((s) => s.setTint);
  const signOut = useAuthStore((s) => s.signOut);

  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<InfoModal>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* close on outside click + Escape */
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const openModal = (which: InfoModal) => {
    setOpen(false);
    setModal(which);
  };

  let row = 0; // running index drives the staggered reveal

  const Item = ({
    icon,
    label,
    desc,
    onClick,
    danger,
  }: {
    icon: React.ReactNode;
    label: string;
    desc?: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <button
      type="button"
      role="menuitem"
      className={cn('usermenu__item', danger && 'usermenu__item--danger')}
      style={{ ['--i' as string]: row++ }}
      onClick={onClick}
    >
      <span className="usermenu__ico">{icon}</span>
      <span className="usermenu__text">
        <span className="usermenu__label">{label}</span>
        {desc && <span className="usermenu__desc">{desc}</span>}
      </span>
      <ChevronRight className="usermenu__chev" size={15} />
    </button>
  );

  return (
    <>
      <div className="usermenu" data-open={open} ref={rootRef}>
        <button
          type="button"
          className="usermenu__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('chrome.userMenu.title')}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="avatar avatar--accent" title={USER_NAME}>
            {initials(USER_NAME)}
          </span>
          <ChevronDown className="usermenu__caret" size={14} />
        </button>

        <div className="usermenu__panel" role="menu" aria-label={t('chrome.userMenu.title')}>
          {/* identity */}
          <div className="usermenu__head">
            <span className="avatar avatar--lg avatar--accent">{initials(USER_NAME)}</span>
            <span className="usermenu__id">
              <span className="usermenu__greet">{t('chrome.userMenu.greeting')}</span>
              <span className="usermenu__name">{USER_NAME}</span>
              <span className="usermenu__role">{t('chrome.userMenu.role')}</span>
            </span>
          </div>

          {/* primary actions */}
          <div className="usermenu__section">
            <Item
              icon={<Settings size={17} />}
              label={t('chrome.userMenu.settings')}
              desc={t('chrome.userMenu.settingsDesc')}
              onClick={() => go('/app/profil')}
            />
            <Item
              icon={<Bell size={17} />}
              label={t('chrome.userMenu.notifications')}
              desc={t('chrome.userMenu.notificationsDesc')}
              onClick={() => go('/app/notificari')}
            />
          </div>

          <div className="usermenu__divider" />

          {/* accent tint */}
          <div className="usermenu__tintrow">
            <span className="usermenu__caps">{t('chrome.userMenu.tint')}</span>
            <div className="tintdots" role="radiogroup" aria-label={t('chrome.userMenu.tint')}>
              {TINTS.map((tnt) => {
                const active = tint === tnt.id;
                return (
                  <button
                    key={tnt.id}
                    type="button"
                    className="tintdot"
                    role="radio"
                    aria-checked={active}
                    data-active={active}
                    aria-label={t(tnt.nameKey)}
                    title={t(tnt.nameKey)}
                    style={{ ['--swatch' as string]: tnt.swatch }}
                    onClick={() => setTint(tnt.id)}
                  >
                    <Check className="tintdot__check" size={12} strokeWidth={3} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="usermenu__divider" />

          {/* about / help / contact */}
          <div className="usermenu__section">
            <Item
              icon={<Info size={17} />}
              label={t('chrome.userMenu.about')}
              desc={t('chrome.userMenu.aboutDesc')}
              onClick={() => openModal('about')}
            />
            <Item
              icon={<LifeBuoy size={17} />}
              label={t('chrome.userMenu.help')}
              desc={t('chrome.userMenu.helpDesc')}
              onClick={() => openModal('help')}
            />
            <Item
              icon={<Mail size={17} />}
              label={t('chrome.userMenu.contact')}
              desc={t('chrome.userMenu.contactDesc')}
              onClick={() => openModal('contact')}
            />
          </div>

          <div className="usermenu__divider" />

          {/* sign out */}
          <div className="usermenu__section">
            <Item
              icon={<LogOut size={17} />}
              label={t('chrome.userMenu.logout')}
              danger
              onClick={() => {
                setOpen(false);
                void signOut();
                navigate('/');
              }}
            />
          </div>
        </div>
      </div>

      {/* ── About ───────────────────────────────────────────── */}
      <Modal open={modal === 'about'} onClose={() => setModal(null)} title={t('chrome.userMenu.aboutTitle')}>
        <p className="usermodal__lead">{t('chrome.userMenu.aboutLead')}</p>
        <p>{t('chrome.userMenu.aboutBody')}</p>
        <div className="usermodal__meta">
          <span>
            {t('chrome.userMenu.aboutMaintained')}{' '}
            <a
              href="https://cristiangabriel.dev"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 2 }}
            >
              cristiangabriel.dev <ArrowUpRight size={11} />
            </a>
          </span>
          <span className="usermodal__ver">{t('chrome.userMenu.version')} 0.1.0</span>
        </div>
      </Modal>

      {/* ── Help ────────────────────────────────────────────── */}
      <Modal open={modal === 'help'} onClose={() => setModal(null)} title={t('chrome.userMenu.helpTitle')}>
        <p className="usermodal__lead">{t('chrome.userMenu.helpLead')}</p>
        <ol className="usermodal__tips">
          <li>
            <span className="usermodal__num">1</span>
            {t('chrome.userMenu.helpTip1')}
          </li>
          <li>
            <span className="usermodal__num">2</span>
            {t('chrome.userMenu.helpTip2')}
          </li>
          <li>
            <span className="usermodal__num">3</span>
            {t('chrome.userMenu.helpTip3')}
          </li>
        </ol>
      </Modal>

      {/* ── Contact ─────────────────────────────────────────── */}
      <Modal open={modal === 'contact'} onClose={() => setModal(null)} title={t('chrome.userMenu.contactTitle')}>
        <p className="usermodal__lead">{t('chrome.userMenu.contactLead')}</p>
        <a className="usermodal__contact" href={`mailto:${SUPPORT_EMAIL}`}>
          <span className="usermenu__ico">
            <Mail size={17} />
          </span>
          <span className="usermenu__text">
            <span className="usermenu__label">{t('chrome.userMenu.contactEmailLabel')}</span>
            <span className="usermenu__desc">{SUPPORT_EMAIL}</span>
          </span>
          <ArrowUpRight size={15} style={{ color: 'var(--text-faint)' }} />
        </a>
        <button
          type="button"
          className="usermodal__contact"
          style={{ width: '100%', cursor: 'pointer' }}
          onClick={() => {
            setModal(null);
            navigate('/app/mesaje-admin');
          }}
        >
          <span className="usermenu__ico">
            <MessageSquare size={17} />
          </span>
          <span className="usermenu__text">
            <span className="usermenu__label">{t('chrome.userMenu.contactAdminLabel')}</span>
            <span className="usermenu__desc">{t('chrome.userMenu.contactAdminCta')}</span>
          </span>
          <ChevronRight size={15} style={{ color: 'var(--text-faint)' }} />
        </button>
      </Modal>
    </>
  );
}
