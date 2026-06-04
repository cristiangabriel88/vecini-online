import { describe, it, expect, afterEach } from 'vitest';
import {
  extractVisibleContext,
  visibleContextEntries,
} from '@/features/assistant/visibleState';
import type { VisibleContext } from '@/features/assistant/visibleState';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('extractVisibleContext', () => {
  it('extracts a labelled field', () => {
    document.body.innerHTML = `
      <label for="email">Adresă email</label>
      <input id="email" type="email" />
    `;
    const ctx = extractVisibleContext(document.body);
    expect(ctx.fields).toHaveLength(1);
    expect(ctx.fields[0].label).toBe('Adresă email');
    expect(ctx.fields[0].kind).toBe('input');
  });

  it('includes visible headings and buttons', () => {
    document.body.innerHTML = `
      <h1>Sesizări</h1>
      <button>Adaugă sesizare</button>
    `;
    const ctx = extractVisibleContext(document.body);
    expect(ctx.headings).toContain('Sesizări');
    expect(ctx.buttons).toContain('Adaugă sesizare');
  });

  it('excludes hidden / aria-hidden / display:none / visibility:hidden nodes', () => {
    document.body.innerHTML = `
      <h2>Conținut vizibil</h2>
      <p hidden>Text ascuns</p>
      <div aria-hidden="true"><button>Buton aria-hidden</button></div>
      <span style="display:none">Span invizibil</span>
      <span style="visibility:hidden">Span visibility</span>
    `;
    const ctx = extractVisibleContext(document.body);
    const out = JSON.stringify(ctx);
    expect(ctx.headings).toContain('Conținut vizibil');
    expect(out).not.toContain('Text ascuns');
    expect(out).not.toContain('Buton aria-hidden');
    expect(out).not.toContain('Span invizibil');
    expect(out).not.toContain('Span visibility');
  });

  it('excludes the .assistant subtree by default', () => {
    document.body.innerHTML = `
      <h1>Pagina principală</h1>
      <div class="assistant">
        <p>Mesaj bot intern</p>
        <button>Trimite</button>
      </div>
    `;
    const ctx = extractVisibleContext(document.body);
    const out = JSON.stringify(ctx);
    expect(ctx.headings).toContain('Pagina principală');
    expect(out).not.toContain('Mesaj bot intern');
    expect(out).not.toContain('Trimite');
  });
});

describe('visibleContextEntries', () => {
  it('maps context items to KbEntry list with correct shape', () => {
    const ctx: VisibleContext = {
      route: '/app/anunturi',
      headings: ['Anunțuri'],
      buttons: [],
      links: [],
      fields: [],
      options: [],
      paragraphs: [],
    };
    const entries = visibleContextEntries(ctx);
    const e = entries.find((x) => x.id === 'visible.heading.0');
    expect(e).toBeDefined();
    expect(e?.kind).toBe('data');
    expect(e?.audience).toContain('all');
    expect(e?.data?.value).toBe('Anunțuri');
    expect(e?.route).toBe('/app/anunturi');
  });
});
