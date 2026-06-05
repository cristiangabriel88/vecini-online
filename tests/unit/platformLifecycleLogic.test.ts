import { describe, expect, it, beforeEach } from 'vitest';
import { usePlatformAsociatiiStore } from '@/platform/platformAsociatiiStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

/**
 * T249 - Unit tests for the platform lifecycle store actions.
 * Covers updateLifecycle + listFilter/setListFilter.
 */

beforeEach(() => {
  usePlatformAsociatiiStore.setState({
    asociatii: DEMO_PLATFORM_ASOCIATII.map((a) => ({ ...a })),
    listFilter: 'all',
  });
});

describe('updateLifecycle', () => {
  it('suspends an active asociatie', () => {
    const id = DEMO_PLATFORM_ASOCIATII[0].id;
    usePlatformAsociatiiStore.getState().updateLifecycle(id, 'suspended', 'Test reason');
    const a = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === id);
    expect(a?.status).toBe('suspended');
    expect(a?.statusReason).toBe('Test reason');
    expect(a?.statusChangedAt).toBeTruthy();
  });

  it('reactivates a suspended asociatie', () => {
    const id = DEMO_PLATFORM_ASOCIATII[2].id;
    expect(DEMO_PLATFORM_ASOCIATII[2].status).toBe('suspended');
    usePlatformAsociatiiStore.getState().updateLifecycle(id, 'active');
    const a = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === id);
    expect(a?.status).toBe('active');
  });

  it('archives an asociatie', () => {
    const id = DEMO_PLATFORM_ASOCIATII[1].id;
    usePlatformAsociatiiStore.getState().updateLifecycle(id, 'archived');
    const a = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === id);
    expect(a?.status).toBe('archived');
  });

  it('preserves statusReason when none supplied on reactivate', () => {
    const id = DEMO_PLATFORM_ASOCIATII[2].id;
    const original = DEMO_PLATFORM_ASOCIATII[2].statusReason;
    usePlatformAsociatiiStore.getState().updateLifecycle(id, 'active');
    const a = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === id);
    expect(a?.statusReason).toBe(original);
  });

  it('does not affect other asociatii', () => {
    const target = DEMO_PLATFORM_ASOCIATII[0].id;
    const other = DEMO_PLATFORM_ASOCIATII[1].id;
    const beforeOther = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === other)?.status;
    usePlatformAsociatiiStore.getState().updateLifecycle(target, 'suspended', 'reason');
    const afterOther = usePlatformAsociatiiStore.getState().asociatii.find((x) => x.id === other)?.status;
    expect(afterOther).toBe(beforeOther);
  });
});

describe('setListFilter', () => {
  it('defaults to all', () => {
    expect(usePlatformAsociatiiStore.getState().listFilter).toBe('all');
  });

  it('sets the filter to suspended', () => {
    usePlatformAsociatiiStore.getState().setListFilter('suspended');
    expect(usePlatformAsociatiiStore.getState().listFilter).toBe('suspended');
  });

  it('sets the filter back to all', () => {
    usePlatformAsociatiiStore.getState().setListFilter('archived');
    usePlatformAsociatiiStore.getState().setListFilter('all');
    expect(usePlatformAsociatiiStore.getState().listFilter).toBe('all');
  });
});
