import { useEffect, useRef, useState, type AnimationEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

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
  // Stay mounted through the close animation so the modal eases out instead of cutting instantly.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const state = open ? 'open' : 'closing';
  const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (!open && e.animationName === 'iv-modal-out') setMounted(false);
  };

  // Portal to the body so the fixed overlay escapes any ancestor that
  // establishes a containing block (e.g. the topbar's backdrop-filter),
  // which would otherwise trap the overlay under the navbar.
  return createPortal(
    <div className="modal-overlay" data-state={state} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
            <h2 className="modal__title">{title}</h2>
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
