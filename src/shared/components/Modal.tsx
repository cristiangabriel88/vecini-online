import { useEffect, useId, useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const FOCUSABLE_SEL =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Visual width. `lg` is for richer, hero-style content. */
  size?: 'md' | 'lg';
  /** Drop the default title/header chrome so the caller can render its own hero.
      A floating close button is still provided for dismissal + a11y. */
  bare?: boolean;
}

export function Modal({ open, onClose, title, children, footer, size = 'md', bare = false }: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(open);
  const returnFocusTo = useRef<Element | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Restore focus to the trigger element when the modal closes.
  useEffect(() => {
    if (!open && returnFocusTo.current instanceof HTMLElement) {
      returnFocusTo.current.focus();
      returnFocusTo.current = null;
    }
  }, [open]);

  // Attach keyboard handlers, scroll lock, focus trap, and initial focus.
  // Depends on `mounted` so it runs after the portal is in the DOM.
  useEffect(() => {
    if (!open || !mounted) return;

    returnFocusTo.current = document.activeElement;

    const dialogEl = ref.current!;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // Focus the first interactive element inside the dialog, or the dialog itself.
    const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
    (focusable[0] ?? dialogEl).focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, mounted]);

  if (!mounted) return null;

  const state = open ? 'open' : 'closing';
  const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (!open && e.animationName === 'iv-modal-out') setMounted(false);
  };

  return createPortal(
    <div className="modal-overlay" data-state={state} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={bare ? undefined : titleId}
        aria-label={bare ? title : undefined}
        tabIndex={-1}
        className="modal"
        data-state={state}
        data-size={size}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={handleAnimationEnd}
      >
        {bare ? (
          <button
            className="modal__close modal__close--floating"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        ) : (
          <div className="modal__header">
            <h2 id={titleId} className="modal__title">{title}</h2>
            <button className="iconbtn" onClick={onClose} aria-label={t('common.close')} style={{ width: 32, height: 32 }}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className={bare ? 'modal__body modal__body--bare' : 'modal__body'}>{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
