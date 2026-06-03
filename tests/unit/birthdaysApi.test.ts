import { describe, it, expect, beforeEach } from 'vitest';
import { useBirthdaysStore } from '@/features/birthdays/birthdaysStore';
import { hydrateBirthdays, saveBirthdayConsent, leaveBirthdayConsent } from '@/features/birthdays/birthdaysApi';

const DEMO_ID = 'demo-asoc';

beforeEach(() => { useBirthdaysStore.setState({ byAsociatie: { [DEMO_ID]: [] }, fetchError: null }); });

describe('birthdaysApi — offline path', () => {
  it('hydrateBirthdays is a no-op when unconfigured', async () => {
    await hydrateBirthdays(DEMO_ID);
    expect(useBirthdaysStore.getState().fetchError).toBeNull();
  });

  it('hydrateBirthdays is a no-op when id is empty', async () => {
    await hydrateBirthdays('');
    expect(useBirthdaysStore.getState().byAsociatie[DEMO_ID]).toEqual([]);
  });

  it('saveBirthdayConsent upserts synchronously', () => {
    const consent = { id: 'bd-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', birth_day: 5, birth_month: 3 };
    saveBirthdayConsent(DEMO_ID, consent);
    expect(useBirthdaysStore.getState().byAsociatie[DEMO_ID][0]).toMatchObject({ birth_day: 5, birth_month: 3 });
  });

  it('leaveBirthdayConsent removes consent synchronously', () => {
    const consent = { id: 'bd-t1', asociatie_id: DEMO_ID, user_id: 'u1', user_name: 'Ion', birth_day: 5, birth_month: 3 };
    useBirthdaysStore.setState({ byAsociatie: { [DEMO_ID]: [consent] }, fetchError: null });
    leaveBirthdayConsent(DEMO_ID, 'u1');
    expect(useBirthdaysStore.getState().byAsociatie[DEMO_ID]).toHaveLength(0);
  });
});
