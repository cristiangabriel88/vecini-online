/**
 * Integration tests for T236: AssistantWidget uses visible-first intent routing.
 *
 * Renders the widget alongside a fixture page element. A question about the
 * on-screen heading should yield a visible-grounded answer; a question about a
 * KB feature should fall back to the knowledge base and NOT include the fixture.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/shared/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: unknown) => {
      if (opts && typeof opts === 'object' && 'returnObjects' in (opts as object)) {
        if (key === 'assistant.quickPrompts') return ['Anunturi', 'Sesizari'];
        if (key === 'assistant.fallbackVariants') return ['Nu am gasit informatii relevante.'];
        if (key === 'assistant.clarifyVariants') return ['La care va referiti?'];
        if (key.startsWith('assistant.social.')) return ['Buna ziua!'];
        return [];
      }
      if (key === 'assistant.visiblePrefix') return 'Din pagina aceasta:';
      if (key === 'assistant.greeting') return 'Buna! Cu ce pot ajuta?';
      if (key === 'assistant.fab') return 'Deschide asistentul';
      if (key === 'assistant.title') return 'Asistent';
      if (key === 'assistant.subtitle') return 'Ajutor local';
      if (key === 'assistant.close') return 'Inchide';
      if (key === 'assistant.placeholder') return 'Scriere intrebare';
      if (key === 'assistant.send') return 'Trimite';
      if (key === 'assistant.disclaimer') return 'Raspunsuri locale.';
      if (key === 'assistant.typing') return 'Se scrie...';
      if (key === 'assistant.openInApp') return 'Deschide';
      if (typeof opts === 'string') return opts;
      return key;
    },
    i18n: { language: 'ro' },
  }),
}));

import { AssistantWidget } from '@/features/assistant/AssistantWidget';
import { useAssistantStore } from '@/shared/store/assistantStore';
import { useAuthStore } from '@/shared/store/authStore';

const FIXTURE_HEADING = 'Revizie instalatie termica etaj';

function Fixture() {
  return (
    <main>
      <h2>{FIXTURE_HEADING}</h2>
      <AssistantWidget />
    </main>
  );
}

describe('AssistantWidget: visible-first grounding (T236)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAssistantStore.getState().reset();
    useAuthStore.setState({ currentAsociatieId: null, profile: null, memberships: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('answers a question about an on-screen heading with the visible text', () => {
    render(
      <MemoryRouter>
        <Fixture />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deschide asistentul' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'revizie instalatie termica' } });
    fireEvent.submit(input.closest('form')!);

    act(() => vi.runAllTimers());

    const botMessages = useAssistantStore
      .getState()
      .messages.filter((m) => m.role === 'bot');
    const last = botMessages.at(-1);
    expect(last?.text).toContain(FIXTURE_HEADING);
  });

  it('falls back to KB navigation for a question about a feature not on screen', () => {
    render(
      <MemoryRouter>
        <Fixture />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deschide asistentul' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'anunturi oficiale' } });
    fireEvent.submit(input.closest('form')!);

    act(() => vi.runAllTimers());

    const botMessages = useAssistantStore
      .getState()
      .messages.filter((m) => m.role === 'bot');
    const last = botMessages.at(-1);
    expect(last?.text).not.toContain(FIXTURE_HEADING);
    expect(last?.route).toBeTruthy();
  });
});
