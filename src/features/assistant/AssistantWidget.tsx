import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles, ArrowUpRight } from 'lucide-react';
import { useAssistantStore } from '@/shared/store/assistantStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useAsociatieFlags } from '@/shared/features/featureStore';
import { KNOWLEDGE_BASE } from '@/features/assistant/knowledge';
import { useDataEntries } from '@/features/assistant/dataSources';
import { visibleEntries } from '@/features/assistant/visibility';
import { answerQuery } from '@/features/assistant/engine';

/**
 * Floating corner help assistant. Answers are produced locally by the grounded
 * matcher (no network, no model), filtered to what the current viewer's role is
 * allowed to see, so it can neither invent nor leak admin-only information.
 */
export function AssistantWidget() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const open = useAssistantStore((s) => s.open);
  const toggle = useAssistantStore((s) => s.toggle);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const messages = useAssistantStore((s) => s.messages);
  const addMessage = useAssistantStore((s) => s.addMessage);
  const typing = useAssistantStore((s) => s.typing);
  const setTyping = useAssistantStore((s) => s.setTyping);

  const role = useAuthStore((s) => s.activeRole)();
  const flags = useAsociatieFlags();

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<number | undefined>(undefined);

  const dataEntries = useDataEntries();
  const entries = useMemo(
    () => visibleEntries([...KNOWLEDGE_BASE, ...dataEntries], role, flags),
    [role, flags, dataEntries],
  );

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Use the turn index as the variant seed so wording rotates deterministically.
    const seed = useAssistantStore.getState().messages.length;
    addMessage({ role: 'user', text: trimmed });
    const reply = answerQuery(trimmed, entries, t, seed);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const delay = reduceMotion ? 0 : Math.min(900, Math.max(300, reply.text.length * 12));

    setTyping(true);
    window.clearTimeout(replyTimer.current);
    replyTimer.current = window.setTimeout(() => {
      addMessage({
        role: 'bot',
        text: reply.text,
        title: reply.title,
        route: reply.route,
        routeLabel: reply.routeLabel,
        chips: reply.chips,
      });
      setTyping(false);
    }, delay);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
    setInput('');
  };

  const openRoute = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  /* Seed a greeting (with quick-prompt chips) the first time the panel opens. */
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const prompts = t('assistant.quickPrompts', { returnObjects: true });
    const chips = Array.isArray(prompts) ? (prompts as string[]).map((p) => ({ label: p, ask: p })) : [];
    addMessage({ role: 'bot', text: t('assistant.greeting'), chips });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Close on Escape; focus the field when opening. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [open, setOpen]);

  /* Keep the latest message (or the typing bubble) in view. */
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, open, typing]);

  /* Cancel a pending reply if the panel closes; clear the timer on unmount. */
  useEffect(() => {
    if (open) return;
    window.clearTimeout(replyTimer.current);
    setTyping(false);
  }, [open, setTyping]);
  useEffect(() => () => window.clearTimeout(replyTimer.current), []);

  return (
    <div className="assistant" data-open={open}>
      <button
        type="button"
        className="assistant__fab"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('assistant.fab')}
        title={t('assistant.fab')}
        onClick={toggle}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      <div className="assistant__panel" role="dialog" aria-label={t('assistant.title')}>
        <header className="assistant__head">
          <span className="assistant__head-icon" aria-hidden="true">
            <Sparkles size={16} />
          </span>
          <span className="assistant__head-text">
            <span className="assistant__title">{t('assistant.title')}</span>
            <span className="assistant__subtitle">{t('assistant.subtitle')}</span>
          </span>
          <button
            type="button"
            className="assistant__close"
            aria-label={t('assistant.close')}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </header>

        <div className="assistant__messages" ref={listRef}>
          {messages.map((m) => (
            <div key={m.id} className="assistant__msg" data-role={m.role}>
              <div className="assistant__bubble">
                {m.title && <span className="assistant__msg-title">{m.title}</span>}
                <span className="assistant__msg-text">{m.text}</span>
                {m.note && <span className="assistant__note">{m.note}</span>}
                {m.route && (
                  <button type="button" className="assistant__open" onClick={() => openRoute(m.route!)}>
                    <span>{m.routeLabel ? `${t('assistant.openInApp')}: ${m.routeLabel}` : t('assistant.openInApp')}</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
              {m.chips && m.chips.length > 0 && (
                <div className="assistant__chips">
                  {m.chips.map((c, i) => (
                    <button
                      key={`${m.id}-c${i}`}
                      type="button"
                      className="assistant__chip"
                      onClick={() => ask(c.ask)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {typing && (
            <div className="assistant__msg" data-role="bot">
              <div className="assistant__bubble assistant__bubble--typing" aria-label={t('assistant.typing')}>
                <span className="assistant__typing" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          )}
        </div>

        <form className="assistant__input" onSubmit={submit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('assistant.placeholder')}
            aria-label={t('assistant.placeholder')}
            // Hint the keyboard/lang without forcing it; UI follows app language.
            lang={i18n.language}
          />
          <button
            type="submit"
            className="assistant__send"
            aria-label={t('assistant.send')}
            disabled={!input.trim() || typing}
          >
            <Send size={16} />
          </button>
        </form>

        <p className="assistant__disclaimer">{t('assistant.disclaimer')}</p>
      </div>
    </div>
  );
}
