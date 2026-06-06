import { describe, expect, it } from 'vitest';
import {
  buildHealthAlertEmail,
  evaluateProbeResult,
  shouldAlertProbe,
} from '../../netlify/functions/_shared/healthProbeLogic';

const TIMEOUT_MS = 5_000;
const DEDUP_MS = 30 * 60_000;
const NOW = 1_750_000_000_000;

describe('evaluateProbeResult', () => {
  it('returns ok when health is 200 and DB is reachable', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: 300, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.healthy).toBe(true);
    expect(r.outcome).toBe('ok');
    expect(r.probeMs).toBe(300);
  });

  it('classifies slow response as health-timeout', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: TIMEOUT_MS, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.healthy).toBe(false);
    expect(r.outcome).toBe('health-timeout');
  });

  it('timeout fires when healthMs exceeds threshold, even with status 200', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: TIMEOUT_MS + 1, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.outcome).toBe('health-timeout');
  });

  it('classifies null status as network-error', () => {
    const r = evaluateProbeResult({ healthStatus: null, healthMs: null, dbOk: false, healthTimeoutMs: TIMEOUT_MS });
    expect(r.healthy).toBe(false);
    expect(r.outcome).toBe('network-error');
  });

  it('classifies non-200 status as health-error', () => {
    const r = evaluateProbeResult({ healthStatus: 503, healthMs: 200, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.healthy).toBe(false);
    expect(r.outcome).toBe('health-error');
    expect(r.reason).toContain('503');
  });

  it('classifies 404 as health-error', () => {
    const r = evaluateProbeResult({ healthStatus: 404, healthMs: 100, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.outcome).toBe('health-error');
  });

  it('classifies DB failure as db-error when health is ok', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: 150, dbOk: false, healthTimeoutMs: TIMEOUT_MS });
    expect(r.healthy).toBe(false);
    expect(r.outcome).toBe('db-error');
  });

  it('timeout takes precedence over db-error', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: TIMEOUT_MS, dbOk: false, healthTimeoutMs: TIMEOUT_MS });
    expect(r.outcome).toBe('health-timeout');
  });

  it('network-error when status is null regardless of dbOk', () => {
    const r = evaluateProbeResult({ healthStatus: null, healthMs: 100, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.outcome).toBe('network-error');
  });

  it('includes reason text for health-error', () => {
    const r = evaluateProbeResult({ healthStatus: 500, healthMs: 200, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.reason).toContain('500');
  });

  it('does not fire timeout below threshold', () => {
    const r = evaluateProbeResult({ healthStatus: 200, healthMs: TIMEOUT_MS - 1, dbOk: true, healthTimeoutMs: TIMEOUT_MS });
    expect(r.outcome).toBe('ok');
    expect(r.healthy).toBe(true);
  });
});

describe('shouldAlertProbe', () => {
  it('fires when no prior alert exists', () => {
    expect(shouldAlertProbe(null, NOW, DEDUP_MS)).toBe(true);
  });

  it('suppressed within de-dup window', () => {
    expect(shouldAlertProbe(NOW - DEDUP_MS + 1_000, NOW, DEDUP_MS)).toBe(false);
  });

  it('fires once de-dup window has elapsed', () => {
    expect(shouldAlertProbe(NOW - DEDUP_MS - 1, NOW, DEDUP_MS)).toBe(true);
  });

  it('suppressed when lastAlertAt equals now', () => {
    expect(shouldAlertProbe(NOW, NOW, DEDUP_MS)).toBe(false);
  });

  it('fires at exact boundary + 1 ms', () => {
    expect(shouldAlertProbe(NOW - DEDUP_MS - 1, NOW, DEDUP_MS)).toBe(true);
  });
});

describe('buildHealthAlertEmail', () => {
  it('subject contains outcome and brand prefix', () => {
    const { subject } = buildHealthAlertEmail({ outcome: 'db-error', reason: 'Supabase failed', stage: 'prod' });
    expect(subject).toContain('[vecini.online]');
    expect(subject).toContain('db-error');
  });

  it('body contains outcome and reason', () => {
    const { text } = buildHealthAlertEmail({ outcome: 'health-timeout', reason: 'took 5000ms', stage: 'prod', probeMs: 5000 });
    expect(text).toContain('health-timeout');
    expect(text).toContain('took 5000ms');
    expect(text).toContain('5000ms');
  });

  it('includes stage in ctx line when provided', () => {
    const { text } = buildHealthAlertEmail({ outcome: 'network-error', reason: 'unreachable', stage: 'prod' });
    expect(text).toContain('prod');
  });

  it('omits ctx line when stage and probeMs are absent', () => {
    const { text } = buildHealthAlertEmail({ outcome: 'network-error', reason: 'unreachable' });
    expect(text).not.toContain('stage:');
    expect(text).not.toContain('probe:');
  });

  it('html escapes angle brackets in reason', () => {
    const { html } = buildHealthAlertEmail({ outcome: 'health-error', reason: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('html escapes ampersands', () => {
    const { html } = buildHealthAlertEmail({ outcome: 'health-error', reason: 'a & b' });
    expect(html).toContain('&amp;');
  });

  it('ok outcome produces a valid email shape', () => {
    const result = buildHealthAlertEmail({ outcome: 'ok', reason: 'all probes passed', stage: 'prod', probeMs: 120 });
    expect(result.subject).toBeTruthy();
    expect(result.text).toBeTruthy();
    expect(result.html).toBeTruthy();
  });
});
