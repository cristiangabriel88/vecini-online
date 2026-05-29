import { describe, it, expect, beforeEach } from 'vitest';
import { makeRecord, defaultChoices, acceptAllChoices } from '@/features/legal/consentLogic';
import { createNotification } from '@/features/notifications/notificationLogic';
import { useNotificationStore } from '@/shared/store/notificationStore';

const BASE_NOW = 1_700_000_000_000;

function makeCommunityNotif() {
  return createNotification(
    {
      userId: 'u-test',
      asociatieId: 'asoc-test',
      kind: 'announcement.published',
      title: 'Anunt',
      body: 'Body',
      link: null,
      priority: 'normal',
      data: {},
    },
    BASE_NOW,
  );
}

function makeEssentialNotif() {
  return createNotification(
    {
      userId: 'u-test',
      asociatieId: 'asoc-test',
      kind: 'membership.joined',
      title: '',
      body: '',
      link: null,
      priority: 'urgent',
      data: { name: 'Ion', role: 'proprietar' },
    },
    BASE_NOW,
  );
}

describe('in-app fan-out consent gate (emitGated)', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('does not emit community notification when resident refused preferences', () => {
    const refused = makeRecord(defaultChoices()); // preferences: false
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'community', refused);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('does not emit community notification when no consent decision has been made', () => {
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'community', null);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('emits community notification when resident accepted preferences', () => {
    const accepted = makeRecord(acceptAllChoices()); // preferences: true
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'community', accepted);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('always emits essential notification regardless of consent record', () => {
    useNotificationStore.getState().emitGated(makeEssentialNotif(), 'essential', null);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('always emits essential notification even when all optional consent is refused', () => {
    const refused = makeRecord(defaultChoices());
    useNotificationStore.getState().emitGated(makeEssentialNotif(), 'essential', refused);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('does not emit marketing notification when marketing consent is refused', () => {
    const noMarketing = makeRecord(defaultChoices()); // marketing: false
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'marketing', noMarketing);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('emits marketing notification when marketing consent is given', () => {
    const all = makeRecord(acceptAllChoices()); // marketing: true
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'marketing', all);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });

  it('does not affect notifications already in the store when gate blocks', () => {
    const accepted = makeRecord(acceptAllChoices());
    const refused = makeRecord(defaultChoices());
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'community', accepted);
    useNotificationStore.getState().emitGated(makeCommunityNotif(), 'community', refused);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
  });
});
