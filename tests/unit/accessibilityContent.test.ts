import { describe, it, expect } from 'vitest';
import { accessibilityStatement } from '@/features/legal/accessibilityContent';

describe('accessibilityStatement', () => {
  it('returns a complete EN document with required sections', () => {
    const doc = accessibilityStatement('en');
    expect(doc.title).toBeTruthy();
    expect(doc.updated).toBeTruthy();
    expect(doc.intro).toBeTruthy();
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);
    const headings = doc.sections.map((s) => s.heading.toLowerCase());
    expect(headings.some((h) => h.includes('conformance') || h.includes('conform'))).toBe(true);
    expect(headings.some((h) => h.includes('feedback') || h.includes('contact'))).toBe(true);
    expect(headings.some((h) => h.includes('limitation') || h.includes('known'))).toBe(true);
    doc.sections.forEach((s) => {
      expect(s.paragraphs.length).toBeGreaterThan(0);
      s.paragraphs.forEach((p) => expect(p.trim().length).toBeGreaterThan(0));
    });
  });

  it('returns a complete RO document with required sections', () => {
    const doc = accessibilityStatement('ro');
    expect(doc.title).toBeTruthy();
    expect(doc.updated).toBeTruthy();
    expect(doc.intro).toBeTruthy();
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);
    const headings = doc.sections.map((s) => s.heading.toLowerCase());
    expect(headings.some((h) => h.includes('conformitate') || h.includes('obiectiv'))).toBe(true);
    expect(headings.some((h) => h.includes('feedback') || h.includes('contact'))).toBe(true);
    expect(headings.some((h) => h.includes('limitare') || h.includes('cunoscut'))).toBe(true);
    doc.sections.forEach((s) => {
      expect(s.paragraphs.length).toBeGreaterThan(0);
      s.paragraphs.forEach((p) => expect(p.trim().length).toBeGreaterThan(0));
    });
  });

  it('EN document does not use em dashes in code strings', () => {
    const doc = accessibilityStatement('en');
    const allText = [doc.title, doc.updated, doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(' ');
    expect(allText).not.toContain('—');
  });

  it('RO document contains proper Romanian diacritics', () => {
    const doc = accessibilityStatement('ro');
    const allText = [doc.intro, ...doc.sections.flatMap((s) => s.paragraphs)].join(' ');
    const hasRomanianChars = /[ăâîșț]/i.test(allText);
    expect(hasRomanianChars).toBe(true);
  });
});
