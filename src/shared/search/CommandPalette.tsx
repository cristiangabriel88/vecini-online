import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Home, Megaphone, MessagesSquare, Search, Wrench } from 'lucide-react';
import { FEATURES, categoryLabel, featureTitle } from '@/shared/features/registry';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { roleMatchesAudience } from '@/shared/features/featureRouteLogic';
import { useAuthStore } from '@/shared/store/authStore';
import { useAnnouncementsStore } from '@/features/announcements/announcementsStore';
import { useDiscussionStore } from '@/features/discussions/discussionStore';
import { useTicketsStore } from '@/features/tickets/ticketsStore';
import { Icon } from '@/shared/components/Icon';
import { type NavItem, type SearchKind, type SearchResult, searchResults } from './searchLogic';

type DisplayItem =
  | { type: 'header'; kind: SearchKind; key: string }
  | { type: 'result'; result: SearchResult; idx: number };

function getNavIconKey(result: SearchResult): string | null {
  const featureKey = result.id.replace('nav:', '');
  return featureKey === 'home' ? null : featureKey;
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (result.kind === 'nav') {
    const iconKey = getNavIconKey(result);
    if (!iconKey) return <Home size={15} />;
    const icon = FEATURES.find((f) => f.key === iconKey)?.icon ?? 'Home';
    return <Icon name={icon} size={15} />;
  }
  if (result.kind === 'announcement') return <Megaphone size={15} />;
  if (result.kind === 'discussion') return <MessagesSquare size={15} />;
  return <Wrench size={15} />;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const returnFocusTo = useRef<Element | null>(null);

  const role = useAuthStore((s) => s.activeRole)();
  const currentAsociatieId = useAuthStore((s) => s.currentAsociatieId);
  const flags = useAsociatieFlags();

  const navItems = useMemo<NavItem[]>(() => {
    const enabled = FEATURES.filter(
      (f) => f.path && flags[f.key] && roleMatchesAudience(f.audience, role),
    );
    return [
      { id: 'home', title: t('chrome.home'), subtitle: t('chrome.ownersAssociation'), path: '/app' },
      ...enabled.map((f) => ({
        id: f.key,
        title: featureTitle(t, f),
        subtitle: categoryLabel(t, f.category),
        path: `/app/${f.path}`,
      })),
    ];
  }, [flags, role, t]);

  const rawAnnouncements = useAnnouncementsStore((s) => s.forAsociatie(currentAsociatieId));
  const rawThreads = useDiscussionStore((s) => s.forAsociatie(currentAsociatieId));
  const rawTickets = useTicketsStore((s) => s.forAsociatie(currentAsociatieId));
  const f01 = flags['F01'];
  const f02 = flags['F02'];
  const f17 = flags['F17'];

  const results = useMemo(
    () =>
      searchResults(
        query,
        navItems,
        f01 ? rawAnnouncements : [],
        f02 ? rawThreads : [],
        f17 ? rawTickets : [],
      ),
    [query, navItems, f01, rawAnnouncements, f02, rawThreads, f17, rawTickets],
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setQuery('');
      returnFocusTo.current = document.activeElement;
    } else {
      if (returnFocusTo.current instanceof HTMLElement) {
        returnFocusTo.current.focus();
        returnFocusTo.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && mounted) {
      const id = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(id);
    }
  }, [open, mounted]);

  // Fallback unmount. `onAnimationEnd` (below) drives the snappy teardown, but
  // it only fires for a named close animation. When that animation is
  // suppressed or replaced (prefers-reduced-motion sets `animation: none`; the
  // mobile sheet variant runs `iv-palette-sheet-out`), the event never arrives
  // and the portal would stay mounted, trapping pointer events. A timer
  // guarantees teardown regardless.
  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  const close = useCallback(() => onClose(), [onClose]);

  const selectResult = useCallback(
    (result: SearchResult) => {
      navigate(result.path);
      close();
    },
    [navigate, close],
  );

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[activeIdx]) selectResult(results[activeIdx]);
        break;
      case 'Escape':
        close();
        break;
    }
  };

  if (!mounted) return null;

  const state = open ? 'open' : 'closing';

  const sectionLabel: Record<SearchKind, string> = {
    nav: t('chrome.palette.nav'),
    announcement: t('chrome.palette.announcements'),
    discussion: t('chrome.palette.discussions'),
    ticket: t('chrome.palette.tickets'),
  };

  const displayItems: DisplayItem[] = [];
  let lastKind: SearchKind | null = null;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.kind !== lastKind) {
      displayItems.push({ type: 'header', kind: r.kind, key: `hdr-${r.kind}` });
      lastKind = r.kind;
    }
    displayItems.push({ type: 'result', result: r, idx: i });
  }

  const hasQuery = query.trim().length > 0;

  return createPortal(
    <div
      className="cmdpalette-overlay"
      data-state={state}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('chrome.searchLabel')}
        className="cmdpalette"
        data-state={state}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          // Match desktop (`iv-palette-out`) and mobile-sheet close variants.
          if (!open && (e.animationName === 'iv-palette-out' || e.animationName === 'iv-palette-sheet-out')) {
            setMounted(false);
          }
        }}
      >
        <div className="cmdpalette__input-row">
          <Search size={16} className="cmdpalette__search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmdpalette__input"
            placeholder={t('chrome.palette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label={t('chrome.searchLabel')}
            aria-autocomplete="list"
            aria-controls="cmdpalette-results"
            aria-activedescendant={
              results[activeIdx] ? `cmdpalette-item-${activeIdx}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div
          id="cmdpalette-results"
          className="cmdpalette__results"
          role="listbox"
          aria-label={t('chrome.searchLabel')}
        >
          {hasQuery && results.length === 0 ? (
            <div className="cmdpalette__empty">
              <div className="cmdpalette__empty-title">{t('chrome.palette.empty')}</div>
              <div className="cmdpalette__empty-hint">{t('chrome.palette.emptyHint')}</div>
            </div>
          ) : (
            displayItems.map((item) => {
              if (item.type === 'header') {
                return (
                  <div key={item.key} className="cmdpalette__section">
                    {sectionLabel[item.kind]}
                  </div>
                );
              }
              const { result, idx } = item;
              return (
                <button
                  key={result.id}
                  id={`cmdpalette-item-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  className="cmdpalette__item"
                  data-active={idx === activeIdx ? 'true' : 'false'}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="cmdpalette__item-icon" aria-hidden="true">
                    <ResultIcon result={result} />
                  </span>
                  <span className="cmdpalette__item-text">
                    <span className="cmdpalette__item-title">{result.title}</span>
                    {result.subtitle && (
                      <span className="cmdpalette__item-sub">{result.subtitle}</span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {(results.length > 0 || hasQuery) && (
          <div className="cmdpalette__footer" aria-hidden="true">
            {t('chrome.palette.footer')}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
