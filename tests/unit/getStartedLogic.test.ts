import { describe, expect, it } from 'vitest';
import type { Apartment } from '@/shared/types/domain';
import type { InviteCode } from '@/features/invites/inviteLogic';
import type { Announcement } from '@/shared/types/domain';
import type { FeatureFlags } from '@/shared/features/featureFlagsLogic';
import { computeGetStarted, shouldShowChecklist } from '@/features/home/getStartedLogic';

const NO_APARTMENTS: Apartment[] = [];
const NO_INVITES: InviteCode[] = [];
const NO_ANNOUNCEMENTS: Announcement[] = [];
const NO_FLAGS: FeatureFlags = {};

const ONE_APARTMENT = [{ id: 'apt1', asociatie_id: 'a1', numar_apartament: '1', scara: null, etaj: null, suprafata_utila: null, cota_parte_indiviza: null, numar_persoane: 1, persons: [], proprietar_principal_name: null, is_active: true, notes: null, created_at: '', updated_at: '' }] as Apartment[];
const ONE_INVITE = [{ id: 'inv1', asociatieId: 'a1', code: 'ABC', token: 't', role: 'locatar', status: 'ok', createdAt: 0, expiresAt: 9999999999999 }] as unknown as InviteCode[];
const ONE_ANNOUNCEMENT = [{ id: 'ann1', asociatie_id: 'a1', author_user_id: 'u1', title: 'First', body_html: '', category: 'informativ', audience: { type: 'all' }, scheduled_at: null, published_at: null, expires_at: null, created_at: '', updated_at: '' }] as Announcement[];
const WITH_FLAGS: FeatureFlags = { F01: true };

describe('computeGetStarted', () => {
  it('returns four steps', () => {
    const { steps } = computeGetStarted(NO_APARTMENTS, NO_INVITES, NO_ANNOUNCEMENTS, NO_FLAGS);
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.key)).toEqual(['apartments', 'invites', 'announcements', 'features']);
  });

  it('all steps undone when building is empty', () => {
    const { steps, allDone, doneCount } = computeGetStarted(NO_APARTMENTS, NO_INVITES, NO_ANNOUNCEMENTS, NO_FLAGS);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(allDone).toBe(false);
    expect(doneCount).toBe(0);
  });

  it('apartments step done when at least one apartment exists', () => {
    const { steps } = computeGetStarted(ONE_APARTMENT, NO_INVITES, NO_ANNOUNCEMENTS, NO_FLAGS);
    expect(steps.find((s) => s.key === 'apartments')?.done).toBe(true);
  });

  it('invites step done when at least one invite exists', () => {
    const { steps } = computeGetStarted(NO_APARTMENTS, ONE_INVITE, NO_ANNOUNCEMENTS, NO_FLAGS);
    expect(steps.find((s) => s.key === 'invites')?.done).toBe(true);
  });

  it('announcements step done when at least one announcement exists', () => {
    const { steps } = computeGetStarted(NO_APARTMENTS, NO_INVITES, ONE_ANNOUNCEMENT, NO_FLAGS);
    expect(steps.find((s) => s.key === 'announcements')?.done).toBe(true);
  });

  it('features step done when flags object is non-empty', () => {
    const { steps } = computeGetStarted(NO_APARTMENTS, NO_INVITES, NO_ANNOUNCEMENTS, WITH_FLAGS);
    expect(steps.find((s) => s.key === 'features')?.done).toBe(true);
  });

  it('allDone is true only when all four steps are done', () => {
    const { allDone, doneCount } = computeGetStarted(ONE_APARTMENT, ONE_INVITE, ONE_ANNOUNCEMENT, WITH_FLAGS);
    expect(allDone).toBe(true);
    expect(doneCount).toBe(4);
  });

  it('partial completion reflects correct doneCount', () => {
    const { doneCount, allDone } = computeGetStarted(ONE_APARTMENT, NO_INVITES, ONE_ANNOUNCEMENT, NO_FLAGS);
    expect(doneCount).toBe(2);
    expect(allDone).toBe(false);
  });

  it('each step carries the correct navigation path', () => {
    const { steps } = computeGetStarted(NO_APARTMENTS, NO_INVITES, NO_ANNOUNCEMENTS, NO_FLAGS);
    expect(steps.find((s) => s.key === 'apartments')?.path).toBe('/app/admin/apartamente');
    expect(steps.find((s) => s.key === 'invites')?.path).toBe('/app/admin/invitatii');
    expect(steps.find((s) => s.key === 'announcements')?.path).toBe('/app/anunturi');
    expect(steps.find((s) => s.key === 'features')?.path).toBe('/app/admin/functionalitati');
  });
});

describe('shouldShowChecklist', () => {
  it('shows when not done and not dismissed', () => {
    expect(shouldShowChecklist(false, false)).toBe(true);
  });

  it('hides when all steps are done', () => {
    expect(shouldShowChecklist(true, false)).toBe(false);
  });

  it('hides when dismissed even if steps remain', () => {
    expect(shouldShowChecklist(false, true)).toBe(false);
  });

  it('hides when both done and dismissed', () => {
    expect(shouldShowChecklist(true, true)).toBe(false);
  });
});
