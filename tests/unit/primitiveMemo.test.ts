import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const components = join(process.cwd(), 'src', 'shared', 'components');
const buttonSrc = readFileSync(join(components, 'Button.tsx'), 'utf8');
const cardSrc = readFileSync(join(components, 'Card.tsx'), 'utf8');
const badgeSrc = readFileSync(join(components, 'Badge.tsx'), 'utf8');
const inputSrc = readFileSync(join(components, 'Input.tsx'), 'utf8');
const selectSrc = readFileSync(join(components, 'Select.tsx'), 'utf8');

describe('Shared primitive memoization (T243)', () => {
  it('Button is exported as memo(forwardRef(...))', () => {
    expect(buttonSrc).toMatch(/export const Button\s*=\s*memo\(/);
    expect(buttonSrc).toContain('forwardRef');
  });

  it('Card is exported as memo(function Card(...))', () => {
    expect(cardSrc).toMatch(/export const Card\s*=\s*memo\(/);
  });

  it('Badge is exported as memo(function Badge(...))', () => {
    expect(badgeSrc).toMatch(/export const Badge\s*=\s*memo\(/);
  });

  it('Input and Textarea are both exported as memo(forwardRef(...))', () => {
    expect(inputSrc).toMatch(/export const Input\s*=\s*memo\(/);
    expect(inputSrc).toMatch(/export const Textarea\s*=\s*memo\(/);
    expect(inputSrc).toContain('forwardRef');
  });

  it('Select is exported as memo(forwardRef(...))', () => {
    expect(selectSrc).toMatch(/export const Select\s*=\s*memo\(/);
    expect(selectSrc).toContain('forwardRef');
  });

  it('Button preserves forwardRef accessibility wiring (aria-busy, disabled)', () => {
    expect(buttonSrc).toContain('aria-busy');
    expect(buttonSrc).toContain('disabled={disabled || loading}');
  });

  it('Input preserves accessibility wiring (aria-invalid, aria-describedby, label)', () => {
    expect(inputSrc).toContain('aria-invalid');
    expect(inputSrc).toContain('aria-describedby');
    expect(inputSrc).toContain('htmlFor={fieldId}');
  });

  it('Select preserves accessibility wiring (aria-invalid, aria-describedby, label)', () => {
    expect(selectSrc).toContain('aria-invalid');
    expect(selectSrc).toContain('aria-describedby');
    expect(selectSrc).toContain('htmlFor={fieldId}');
  });
});
