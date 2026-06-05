import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, User } from 'lucide-react';
import { usePlatformAsociatiiStore } from './platformAsociatiiStore';
import {
  platformSearchResults,
  type PlatformSearchKind,
  type PlatformSearchResult,
} from './platformSearchLogic';

type DisplayItem =
  | { type: 'header'; kind: PlatformSearchKind; key: string }
  | { type: 'result'; result: PlatformSearchResult; idx: number };

function ResultIcon({ kind }: { kind: PlatformSearchKind }) {
  if (kind === 'asociatie') return <Building2 size={15} />;
  return <User size={15} />;
}

interface PlatformCommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function PlatformCommandPalette({ open, onClose }: PlatformCommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const returnFocusTo = useRef<Element | null>(null);

  const asociatii = usePlatformAsociatiiStore((s) => s.asociatii);
  const provisions = usePlatformAsociatiiStore((s) => s.provisions);
  const additionalAdmins = usePlatformAsociatiiStore((s) => s.additionalAdmins);
  const pendingInvites = usePlatformAsociatiiStore((s) => s.pendingInvites);

  const results = useMemo(
    () => platformSearchResults(query, asociatii, provisions, additionalAdmins, pendingInvites),
    [query, asociatii, provisions, additionalAdmins, pendingInvites],
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

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  const close = useCallback(() => onClose(), [onClose]);

  const selectResult = useCallback(
    (result: PlatformSearchResult) => {
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

  const sectionLabel: Record<PlatformSearchKind, string> = {
    asociatie: t('platform.search.sectionAsociatii'),
    admin: t('platform.search.sectionAdmins'),
  };

  const displayItems: DisplayItem[] = [];
  let lastKind: PlatformSearchKind | null = null;
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
    <div className="cmdpalette-overlay" data-state={state} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('platform.search.label')}
        className="cmdpalette"
        data-state={state}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={(e) => {
          if (
            !open &&
            (e.animationName === 'iv-palette-out' || e.animationName === 'iv-palette-sheet-out')
          ) {
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
            placeholder={t('platform.search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label={t('platform.search.label')}
            aria-autocomplete="list"
            aria-controls="platform-search-results"
            aria-activedescendant={
              results[activeIdx] ? `platform-search-item-${activeIdx}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div
          id="platform-search-results"
          className="cmdpalette__results"
          role="listbox"
          aria-label={t('platform.search.label')}
        >
          {hasQuery && results.length === 0 ? (
            <div className="cmdpalette__empty">
              <div className="cmdpalette__empty-title">{t('platform.search.emptyTitle')}</div>
              <div className="cmdpalette__empty-hint">{t('platform.search.emptyHint')}</div>
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
                  id={`platform-search-item-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  className="cmdpalette__item"
                  data-active={idx === activeIdx ? 'true' : 'false'}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="cmdpalette__item-icon" aria-hidden="true">
                    <ResultIcon kind={result.kind} />
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
            {t('platform.search.footer')}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
