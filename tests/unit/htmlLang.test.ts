import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/shared/lib/i18n';

describe('html lang sync', () => {
  afterEach(async () => {
    await i18n.changeLanguage('ro');
  });

  it('keeps document.documentElement.lang in sync with i18n.language after init', () => {
    expect(document.documentElement.lang).toBe(i18n.language);
  });

  it('updates lang to en when language changes', async () => {
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('updates lang back to ro', async () => {
    await i18n.changeLanguage('en');
    await i18n.changeLanguage('ro');
    expect(document.documentElement.lang).toBe('ro');
  });
});
