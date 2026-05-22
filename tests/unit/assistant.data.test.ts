import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { FEATURES } from '@/shared/features/registry';
import { KNOWLEDGE_BASE } from '@/features/assistant/knowledge';
import { DATA_ENTRIES } from '@/features/assistant/dataSources';
import { visibleEntries } from '@/features/assistant/visibility';
import { answerQuery } from '@/features/assistant/engine';

const t = ((key: string, def?: unknown) => (typeof def === 'string' ? def : key)) as unknown as TFunction;

const allFlags: Record<string, boolean> = Object.fromEntries(FEATURES.map((f) => [f.key, true]));
const RESIDENT = visibleEntries([...KNOWLEDGE_BASE, ...DATA_ENTRIES], 'proprietar', allFlags);
const ask = (q: string) => answerQuery(q, RESIDENT, t);

describe('data lookups', () => {
  it("answers the committee president's phone (Romanian, inflected)", () => {
    const reply = ask('numărul de telefon al președintelui');
    expect(reply.matched).toBe(true);
    expect(reply.text).toBe('+40 722 345 678');
    expect(reply.title).toContain('Președinte');
    expect(reply.route).toBe('/app/urgenta');
  });

  it("answers the same lookup phrased in English", () => {
    expect(ask('president phone number').text).toBe('+40 722 345 678');
  });

  it("answers the administrator's phone", () => {
    expect(ask('telefon administrator').text).toBe('+40 721 234 567');
  });

  it('returns a directory phone the neighbour chose to share', () => {
    expect(ask('telefonul lui Popescu').text).toBe('+40 721 111 222');
  });

  it('never exposes a phone the neighbour did not consent to share', () => {
    // Georgescu (dir-2) has show_phone=false; her number must not be reachable.
    const HIDDEN = '+40 722 333 444';
    expect(RESIDENT.some((e) => e.data?.value === HIDDEN)).toBe(false);
    expect(ask('telefonul lui Georgescu').text).not.toBe(HIDDEN);
  });
});

describe('data entries respect role + feature flags', () => {
  it('drops contact lookups when the source feature is disabled', () => {
    const flags = { ...allFlags, F56: false, F36: false };
    const visible = visibleEntries([...KNOWLEDGE_BASE, ...DATA_ENTRIES], 'proprietar', flags);
    expect(visible.some((e) => e.kind === 'data')).toBe(false);
  });
});
