import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

describe('SEO and crawlability guard', () => {
  it('public/robots.txt exists and allows the root while blocking /app/', () => {
    const path = resolve(ROOT, 'public/robots.txt');
    expect(existsSync(path), 'public/robots.txt must exist').toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Disallow: /app/');
    expect(content).toContain('Sitemap:');
  });

  it('public/sitemap.xml exists and lists the public routes', () => {
    const path = resolve(ROOT, 'public/sitemap.xml');
    expect(existsSync(path), 'public/sitemap.xml must exist').toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('<?xml');
    expect(content).toContain('urlset');
    expect(content).toContain('vecini.online/');
    expect(content).toContain('/confidentialitate');
    expect(content).toContain('/accesibilitate');
  });

  it('index.html has OG meta tags and a canonical link', () => {
    const path = resolve(ROOT, 'index.html');
    expect(existsSync(path), 'index.html must exist').toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('og:title');
    expect(content).toContain('og:description');
    expect(content).toContain('og:type');
    expect(content).toContain('twitter:card');
    expect(content).toContain('rel="canonical"');
  });

  it('index.html has a meta description', () => {
    const path = resolve(ROOT, 'index.html');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('name="description"');
  });
});
