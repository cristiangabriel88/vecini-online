import { describe, expect, it } from 'vitest';
import { consumerRights, termsOfService, type Lang } from '@/features/legal/legalContent';

/**
 * T24 - the consumer-protection surface must carry the mandatory information for
 * a SaaS billing relationship with consumer residents: pre-contractual info, the
 * 14-day right of withdrawal, refunds, ANPC, and the EU ODR/SOL platform. These
 * guards keep that content from silently drifting or losing a required element.
 */
const langs: Lang[] = ['ro', 'en'];

/** Flatten a doc to one searchable string (title + intro + every paragraph). */
function docText(build: (lang: Lang) => { title: string; intro: string; sections: { heading: string; paragraphs: string[] }[] }, lang: Lang): string {
  const doc = build(lang);
  return [doc.title, doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join('\n');
}

describe('consumer-rights surface (T24)', () => {
  it('builds a non-empty doc with sections in both languages', () => {
    for (const lang of langs) {
      const doc = consumerRights(lang);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.intro.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThanOrEqual(6);
      for (const s of doc.sections) {
        expect(s.heading.length).toBeGreaterThan(0);
        expect(s.paragraphs.length).toBeGreaterThan(0);
        expect(s.paragraphs.every((p) => p.trim().length > 0)).toBe(true);
      }
    }
  });

  it('names the National Authority for Consumer Protection (ANPC) and its website', () => {
    for (const lang of langs) {
      const text = docText(consumerRights, lang);
      expect(text).toContain('ANPC');
      expect(text).toContain('Protec'); // Protecția Consumatorilor / Consumer Protection
      expect(text).toContain('www.anpc.ro');
    }
  });

  it('links the EU online dispute resolution (ODR/SOL) platform', () => {
    for (const lang of langs) {
      const text = docText(consumerRights, lang);
      expect(text).toContain('ec.europa.eu/consumers/odr');
    }
  });

  it('states the 14-day right of withdrawal under OUG 34/2014', () => {
    for (const lang of langs) {
      const text = docText(consumerRights, lang);
      expect(text).toContain('14');
      expect(text).toContain('34/2014');
    }
  });

  it('covers refunds and pre-contractual information', () => {
    const ro = docText(consumerRights, 'ro');
    expect(ro).toContain('Rambursare');
    expect(ro).toContain('precontractual');
    const en = docText(consumerRights, 'en');
    expect(en).toContain('Refunds');
    expect(en).toContain('Pre-contractual');
  });

  it('references the alternative dispute resolution (SAL, OG 38/2015) route', () => {
    for (const lang of langs) {
      const text = docText(consumerRights, lang);
      expect(text).toContain('SAL');
      expect(text).toContain('38/2015');
    }
  });

  it('is wired into the Terms via a consumer-rights section', () => {
    for (const lang of langs) {
      const terms = termsOfService(lang);
      const headings = terms.sections.map((s) => s.heading);
      const hasConsumerSection = headings.some((h) => /consumer|consumatori/i.test(h));
      expect(hasConsumerSection).toBe(true);
    }
  });
});
