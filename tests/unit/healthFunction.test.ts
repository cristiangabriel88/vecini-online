import { describe, it, expect } from 'vitest';
import handler from '../../netlify/functions/health';

function makeRequest(method: string, ip?: string): Request {
  const headers: Record<string, string> = {};
  if (ip) headers['x-forwarded-for'] = ip;
  return new Request('http://localhost/.netlify/functions/health', { method, headers });
}

describe('health function', () => {
  it('returns 200 OK for GET', async () => {
    const res = await handler(makeRequest('GET', '10.0.0.1'));
    expect(res.status).toBe(200);
  });

  it('returns correct JSON shape', async () => {
    const res = await handler(makeRequest('GET', '10.0.0.2'));
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as unknown;
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('stage');
    expect(typeof (body as Record<string, unknown>).stage).toBe('string');
  });

  it('returns 405 for non-GET requests', async () => {
    const res = await handler(makeRequest('POST'));
    expect(res.status).toBe(405);
  });
});
