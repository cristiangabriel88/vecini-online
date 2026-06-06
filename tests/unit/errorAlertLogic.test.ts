import { describe, expect, it } from 'vitest';
import {
  buildAlertEmail,
  shouldAlertNewGroup,
  shouldAlertSpike,
} from '../../netlify/functions/_shared/errorAlertLogic';

const NOW = 1_750_000_000_000;
const DEDUP = 4 * 3_600_000; // 4 hours

describe('shouldAlertNewGroup', () => {
  it('fires when there is no prior alert', () => {
    expect(shouldAlertNewGroup(null, NOW, DEDUP)).toBe(true);
  });

  it('suppressed when last alert is within de-dup window', () => {
    const recentAlert = NOW - DEDUP + 1_000;
    expect(shouldAlertNewGroup(recentAlert, NOW, DEDUP)).toBe(false);
  });

  it('fires again once the de-dup window has elapsed', () => {
    const oldAlert = NOW - DEDUP - 1;
    expect(shouldAlertNewGroup(oldAlert, NOW, DEDUP)).toBe(true);
  });

  it('suppressed when lastAlertAt equals now', () => {
    expect(shouldAlertNewGroup(NOW, NOW, DEDUP)).toBe(false);
  });

  it('fires at exact de-dup window boundary + 1 ms', () => {
    const borderAlert = NOW - DEDUP - 1;
    expect(shouldAlertNewGroup(borderAlert, NOW, DEDUP)).toBe(true);
  });
});

describe('shouldAlertSpike', () => {
  const THRESHOLD = 10;

  it('fires when count meets threshold and no prior alert', () => {
    expect(shouldAlertSpike(10, THRESHOLD, null, NOW, DEDUP)).toBe(true);
  });

  it('fires when count exceeds threshold', () => {
    expect(shouldAlertSpike(50, THRESHOLD, null, NOW, DEDUP)).toBe(true);
  });

  it('does not fire below threshold', () => {
    expect(shouldAlertSpike(9, THRESHOLD, null, NOW, DEDUP)).toBe(false);
  });

  it('does not fire at count zero', () => {
    expect(shouldAlertSpike(0, THRESHOLD, null, NOW, DEDUP)).toBe(false);
  });

  it('suppressed when last alert is within de-dup window', () => {
    const recentAlert = NOW - 60_000;
    expect(shouldAlertSpike(20, THRESHOLD, recentAlert, NOW, DEDUP)).toBe(false);
  });

  it('fires again once de-dup window elapses', () => {
    const oldAlert = NOW - DEDUP - 1;
    expect(shouldAlertSpike(15, THRESHOLD, oldAlert, NOW, DEDUP)).toBe(true);
  });

  it('does not fire when count meets threshold but alert is too recent', () => {
    expect(shouldAlertSpike(100, THRESHOLD, NOW - 100, NOW, DEDUP)).toBe(false);
  });

  it('uses the threshold exactly (count < threshold = false)', () => {
    expect(shouldAlertSpike(THRESHOLD - 1, THRESHOLD, null, NOW, DEDUP)).toBe(false);
    expect(shouldAlertSpike(THRESHOLD, THRESHOLD, null, NOW, DEDUP)).toBe(true);
  });
});

describe('buildAlertEmail', () => {
  it('new-group: subject includes error name and source', () => {
    const { subject } = buildAlertEmail({
      trigger: 'new-group',
      name: 'TypeError',
      source: 'realtimeLogic.apply',
      message: 'Cannot read...',
      stage: 'prod',
      release: 'abc123',
      ref: 'IV-AAAA-BBBB',
    });
    expect(subject).toContain('TypeError');
    expect(subject).toContain('realtimeLogic.apply');
    expect(subject).toContain('New error group');
  });

  it('new-group: subject mentions vecini.online brand prefix', () => {
    const { subject } = buildAlertEmail({
      trigger: 'new-group',
      name: 'Error',
      source: undefined,
      message: 'oops',
      stage: undefined,
      release: undefined,
      ref: 'IV-0000-0001',
    });
    expect(subject).toMatch(/\[vecini\.online\]/);
  });

  it('spike: subject includes count and error name', () => {
    const { subject } = buildAlertEmail({
      trigger: 'spike',
      name: 'NetworkError',
      source: undefined,
      message: 'Failed to fetch',
      stage: 'prod',
      release: undefined,
      ref: 'IV-CCCC-DDDD',
      recentCount: 15,
    });
    expect(subject).toContain('15');
    expect(subject).toContain('NetworkError');
  });

  it('html escapes angle brackets in source and message', () => {
    const { html } = buildAlertEmail({
      trigger: 'new-group',
      name: 'Error',
      source: '<script>',
      message: '<b>xss</b>',
      stage: undefined,
      release: undefined,
      ref: 'IV-0000-0000',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;');
  });

  it('html escapes ampersands', () => {
    const { html } = buildAlertEmail({
      trigger: 'spike',
      name: 'Error',
      source: 'a&b',
      message: 'x & y',
      stage: undefined,
      release: undefined,
      ref: 'IV-0000-0002',
      recentCount: 12,
    });
    expect(html).toContain('&amp;');
    expect(html).not.toMatch(/[^&]&[^a-z]/); // no bare & except in entities
  });

  it('plain text body includes ref, stage, and release', () => {
    const { text } = buildAlertEmail({
      trigger: 'new-group',
      name: 'RangeError',
      source: 'tickets.parse',
      message: 'Invalid time value',
      stage: 'prod',
      release: 'deadbeef',
      ref: 'IV-1111-2222',
    });
    expect(text).toContain('IV-1111-2222');
    expect(text).toContain('prod');
    expect(text).toContain('deadbeef');
  });

  it('works without optional fields (no source, stage, release)', () => {
    const { subject, text } = buildAlertEmail({
      trigger: 'new-group',
      name: 'Error',
      source: undefined,
      message: 'boom',
      stage: undefined,
      release: undefined,
      ref: 'IV-ZZZZ-ZZZZ',
    });
    expect(subject).toBeTruthy();
    expect(text).toContain('IV-ZZZZ-ZZZZ');
  });

  it('spike body mentions the occurrence count', () => {
    const { text } = buildAlertEmail({
      trigger: 'spike',
      name: 'Error',
      source: 'api.load',
      message: 'timeout',
      stage: undefined,
      release: undefined,
      ref: 'IV-9999-9999',
      recentCount: 42,
    });
    expect(text).toContain('42');
  });
});
