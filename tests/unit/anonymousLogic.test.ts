import { describe, expect, it } from 'vitest';
import {
  isValidMessage,
  openCount,
  orderedMessages,
  toggledStatus,
} from '@/features/anonymous/anonymousLogic';
import type { AnonymousMessage } from '@/shared/types/domain';

const base = { asociatie_id: 'a', sender_user_id: 'u' };

const messages: AnonymousMessage[] = [
  { ...base, id: '1', body: 'Rezolvat de mult timp', status: 'rezolvat', created_at: '2026-05-20T10:00:00Z' },
  { ...base, id: '2', body: 'Sesizare nouă importantă', status: 'nou', created_at: '2026-05-18T10:00:00Z' },
  { ...base, id: '3', body: 'Altă sesizare deschisă', status: 'nou', created_at: '2026-05-19T10:00:00Z' },
];

describe('isValidMessage', () => {
  it('requires a non-trivial body', () => {
    expect(isValidMessage('Becul de la etaj e ars')).toBe(true);
    expect(isValidMessage('  ')).toBe(false);
    expect(isValidMessage('prea mic')).toBe(false);
  });
});

describe('toggledStatus', () => {
  it('flips between nou and rezolvat', () => {
    expect(toggledStatus('nou')).toBe('rezolvat');
    expect(toggledStatus('rezolvat')).toBe('nou');
  });
});

describe('orderedMessages', () => {
  it('floats open messages above resolved, newest first within each group', () => {
    expect(orderedMessages(messages).map((m) => m.id)).toEqual(['3', '2', '1']);
  });

  it('does not mutate the input', () => {
    const copy = [...messages];
    orderedMessages(messages);
    expect(messages).toEqual(copy);
  });
});

describe('openCount', () => {
  it('counts only open messages', () => {
    expect(openCount(messages)).toBe(2);
  });
});
