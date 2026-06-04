import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const primitivesCss = readFileSync(join(process.cwd(), 'src', 'styles', 'primitives.css'), 'utf8');
const legalCss = readFileSync(join(process.cwd(), 'src', 'styles', 'legal.css'), 'utf8');
const auditSrc = readFileSync(join(process.cwd(), 'src', 'features', 'audit', 'AuditLogPage.tsx'), 'utf8');
const notifSrc = readFileSync(join(process.cwd(), 'src', 'features', 'profile', 'NotificationsPage.tsx'), 'utf8');

describe('CSS containment (T242)', () => {
  it('.card has contain: layout style to bound reflow scope', () => {
    const cardStart = primitivesCss.indexOf('.card {');
    const cardEnd = primitivesCss.indexOf('}', cardStart);
    const cardRule = primitivesCss.slice(cardStart, cardEnd);
    expect(cardRule).toContain('contain:');
  });

  it('.notif-row has contain: content to isolate notification list items', () => {
    const rowStart = primitivesCss.indexOf('.notif-row {');
    const rowEnd = primitivesCss.indexOf('}', rowStart);
    const rowRule = primitivesCss.slice(rowStart, rowEnd);
    expect(rowRule).toContain('contain:');
  });

  it('.audit-row has CSS containment to isolate long audit lists', () => {
    const rowStart = legalCss.indexOf('.audit-row {');
    const rowEnd = legalCss.indexOf('}', rowStart);
    const rowRule = legalCss.slice(rowStart, rowEnd);
    expect(rowRule).toContain('contain:');
  });

  it('.audit-row uses content-visibility: auto for off-screen skip', () => {
    const rowStart = legalCss.indexOf('.audit-row {');
    const rowEnd = legalCss.indexOf('}', rowStart);
    const rowRule = legalCss.slice(rowStart, rowEnd);
    expect(rowRule).toContain('content-visibility: auto');
  });
});

describe('React.memo wrappers (T242)', () => {
  it('AuditRow is wrapped with memo()', () => {
    expect(auditSrc).toMatch(/const AuditRow\s*=\s*memo\(/);
  });

  it('AuditLogPage renders AuditRow components instead of inline li elements', () => {
    expect(auditSrc).toContain('<AuditRow key={e.id}');
  });

  it('NotifRow is wrapped with memo()', () => {
    expect(notifSrc).toMatch(/const NotifRow\s*=\s*memo\(/);
  });

  it('handleRead in NotificationsPage is wrapped with useCallback', () => {
    const handleReadIdx = notifSrc.indexOf('const handleRead =');
    const handleReadBlock = notifSrc.slice(handleReadIdx, handleReadIdx + 80);
    expect(handleReadBlock).toContain('useCallback');
  });
});
