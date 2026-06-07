import { describe, expect, it } from 'vitest';
import { aggregateResults } from '../../scripts/preflight.mjs';

describe('aggregateResults', () => {
  it('returns go=true with correct counts when all steps pass', () => {
    const steps = [
      { label: 'lint', ok: true },
      { label: 'typecheck', ok: true },
      { label: 'build PROD', ok: true },
    ];
    const result = aggregateResults(steps);
    expect(result.go).toBe(true);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.lines).toHaveLength(3);
  });

  it('returns go=false when any step fails', () => {
    const steps = [
      { label: 'lint', ok: true },
      { label: 'build PROD', ok: false, detail: 'non-zero exit' },
      { label: 'build DEMO', ok: true },
    ];
    const result = aggregateResults(steps);
    expect(result.go).toBe(false);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
  });

  it('returns go=false when all steps fail', () => {
    const steps = [
      { label: 'lint', ok: false },
      { label: 'typecheck', ok: false },
    ];
    const result = aggregateResults(steps);
    expect(result.go).toBe(false);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(2);
  });

  it('returns go=true and empty lines for an empty step list', () => {
    const result = aggregateResults([]);
    expect(result.go).toBe(true);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.lines).toHaveLength(0);
  });

  it('formats a passing step line with PASS prefix and label', () => {
    const result = aggregateResults([{ label: 'unit tests', ok: true }]);
    expect(result.lines[0]).toMatch(/PASS/);
    expect(result.lines[0]).toContain('unit tests');
  });

  it('formats a failing step line with FAIL prefix and label', () => {
    const result = aggregateResults([{ label: 'build PROD', ok: false }]);
    expect(result.lines[0]).toMatch(/FAIL/);
    expect(result.lines[0]).toContain('build PROD');
  });

  it('appends detail to a failing step line when detail is provided', () => {
    const steps = [{ label: 'dep audit', ok: false, detail: 'high severity vulnerability' }];
    const result = aggregateResults(steps);
    expect(result.lines[0]).toContain('dep audit');
    expect(result.lines[0]).toContain('high severity vulnerability');
  });

  it('omits detail suffix when detail is absent', () => {
    const result = aggregateResults([{ label: 'lint', ok: true }]);
    expect(result.lines[0]).not.toContain('--');
  });

  it('counts multiple failures correctly across a mixed step list', () => {
    const steps = [
      { label: 'a', ok: false },
      { label: 'b', ok: true },
      { label: 'c', ok: false },
      { label: 'd', ok: true },
      { label: 'e', ok: false },
    ];
    const result = aggregateResults(steps);
    expect(result.failed).toBe(3);
    expect(result.passed).toBe(2);
    expect(result.go).toBe(false);
  });

  it('produces one output line per input step', () => {
    const steps = Array.from({ length: 7 }, (_, i) => ({ label: `step-${i}`, ok: i % 2 === 0 }));
    const result = aggregateResults(steps);
    expect(result.lines).toHaveLength(7);
  });
});
