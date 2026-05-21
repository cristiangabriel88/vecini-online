import { describe, expect, it } from 'vitest';
import { activeGroupBuys, closedGroupBuys, isOpen, isValidGroupBuy } from '@/features/groupbuys/groupBuyLogic';
import type { GroupBuy } from '@/shared/types/domain';

const base = { asociatie_id: 'a', organizer_user_id: 'u', organizer_name: 'Elena', description: '', created_at: '2026-05-01T00:00:00Z', signups: 0 };
const NOW = '2026-05-22T09:00:00Z';

const buys: GroupBuy[] = [
  { ...base, id: 'soon', title: 'Cartofi', deadline: '2026-05-25T23:59:59Z' },
  { ...base, id: 'later', title: 'Lemne', deadline: '2026-05-30T23:59:59Z' },
  { ...base, id: 'past', title: 'Mere', deadline: '2026-05-10T23:59:59Z' },
];

describe('isValidGroupBuy', () => {
  it('requires a title and a parseable deadline', () => {
    expect(isValidGroupBuy('Cartofi', '2026-06-01')).toBe(true);
    expect(isValidGroupBuy('ab', '2026-06-01')).toBe(false);
    expect(isValidGroupBuy('Cartofi', 'not-a-date')).toBe(false);
  });
});

describe('isOpen', () => {
  it('is true while the deadline is in the future', () => {
    expect(isOpen(buys[0], NOW)).toBe(true);
    expect(isOpen(buys[2], NOW)).toBe(false);
  });
});

describe('activeGroupBuys / closedGroupBuys', () => {
  it('returns open buys soonest first', () => {
    expect(activeGroupBuys(buys, NOW).map((b) => b.id)).toEqual(['soon', 'later']);
  });

  it('returns closed buys most-recent first', () => {
    expect(closedGroupBuys(buys, NOW).map((b) => b.id)).toEqual(['past']);
  });
});
