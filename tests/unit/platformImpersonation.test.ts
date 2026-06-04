import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/features/audit/auditLogic';
import { usePlatformAuditStore } from '@/platform/platformAuditStore';
import { usePlatformImpersonationStore } from '@/platform/platformImpersonationStore';
import { DEMO_PLATFORM_ASOCIATII } from '@/platform/demoPlatform';

// ---------------------------------------------------------------------------
// Audit catalogue
// ---------------------------------------------------------------------------

describe('audit catalogue — impersonation entries', () => {
  it('includes impersonation.started in AUDIT_ACTIONS', () => {
    expect(AUDIT_ACTIONS).toContain('impersonation.started');
  });

  it('includes impersonation.ended in AUDIT_ACTIONS', () => {
    expect(AUDIT_ACTIONS).toContain('impersonation.ended');
  });

  it('includes impersonation in AUDIT_ENTITIES', () => {
    expect(AUDIT_ENTITIES).toContain('impersonation');
  });
});

// ---------------------------------------------------------------------------
// platformAuditStore.recordEntry
// ---------------------------------------------------------------------------

describe('platformAuditStore.recordEntry', () => {
  const targetId = DEMO_PLATFORM_ASOCIATII[0].id;

  it('appends an entry to the chain for the given asociatie', () => {
    const store = usePlatformAuditStore.getState();
    const before = (store.chains[targetId] ?? []).length;
    store.recordEntry(targetId, {
      asociatie_id: targetId,
      actor_user_id: 'pa-demo',
      actor_name: 'Operator platformă',
      action: 'impersonation.started',
      entity: 'impersonation',
      entity_label: DEMO_PLATFORM_ASOCIATII[0].name,
    });
    const after = usePlatformAuditStore.getState().chains[targetId]?.length ?? 0;
    expect(after).toBe(before + 1);
  });

  it('sets the correct action on the appended entry', () => {
    const store = usePlatformAuditStore.getState();
    store.recordEntry('test-asoc-x', {
      asociatie_id: 'test-asoc-x',
      actor_user_id: 'pa-demo',
      actor_name: 'Operator platformă',
      action: 'impersonation.ended',
      entity: 'impersonation',
      entity_label: 'Test Asociație',
    });
    const chain = usePlatformAuditStore.getState().chains['test-asoc-x'] ?? [];
    expect(chain[chain.length - 1].action).toBe('impersonation.ended');
  });

  it('links prev_hash correctly (chain integrity)', () => {
    const id = 'test-asoc-link';
    const store = usePlatformAuditStore.getState();
    const input = {
      asociatie_id: id,
      actor_user_id: 'pa-demo',
      actor_name: 'Op',
      action: 'impersonation.started' as const,
      entity: 'impersonation' as const,
      entity_label: 'X',
    };
    store.recordEntry(id, input);
    store.recordEntry(id, { ...input, action: 'impersonation.ended' });
    const chain = usePlatformAuditStore.getState().chains[id] ?? [];
    expect(chain.length).toBe(2);
    expect(chain[1].prev_hash).toBe(chain[0].hash);
  });
});

// ---------------------------------------------------------------------------
// platformImpersonationStore
// ---------------------------------------------------------------------------

describe('platformImpersonationStore — demo mode', () => {
  beforeEach(() => {
    usePlatformImpersonationStore.setState({ session: null, loading: false, error: null });
  });

  it('starts with no active session', () => {
    expect(usePlatformImpersonationStore.getState().session).toBeNull();
  });

  it('startSession sets the session in demo/offline mode', async () => {
    const target = { asociatie_id: DEMO_PLATFORM_ASOCIATII[1].id, asociatie_name: DEMO_PLATFORM_ASOCIATII[1].name };
    await usePlatformImpersonationStore.getState().startSession(target);
    const { session } = usePlatformImpersonationStore.getState();
    expect(session).not.toBeNull();
    expect(session?.asociatie_id).toBe(target.asociatie_id);
    expect(session?.asociatie_name).toBe(target.asociatie_name);
  });

  it('startSession records an impersonation.started audit entry', async () => {
    const asoc = DEMO_PLATFORM_ASOCIATII[2];
    const before = (usePlatformAuditStore.getState().chains[asoc.id] ?? []).length;
    await usePlatformImpersonationStore.getState().startSession({ asociatie_id: asoc.id, asociatie_name: asoc.name });
    const after = (usePlatformAuditStore.getState().chains[asoc.id] ?? []).length;
    expect(after).toBeGreaterThan(before);
    const chain = usePlatformAuditStore.getState().chains[asoc.id] ?? [];
    const lastEntry = chain[chain.length - 1];
    expect(lastEntry.action).toBe('impersonation.started');
  });

  it('endSession clears the session', async () => {
    const target = { asociatie_id: DEMO_PLATFORM_ASOCIATII[0].id, asociatie_name: 'Test' };
    await usePlatformImpersonationStore.getState().startSession(target);
    await usePlatformImpersonationStore.getState().endSession();
    expect(usePlatformImpersonationStore.getState().session).toBeNull();
  });

  it('endSession records an impersonation.ended audit entry', async () => {
    const asoc = DEMO_PLATFORM_ASOCIATII[0];
    await usePlatformImpersonationStore.getState().startSession({ asociatie_id: asoc.id, asociatie_name: asoc.name });
    const before = (usePlatformAuditStore.getState().chains[asoc.id] ?? []).length;
    await usePlatformImpersonationStore.getState().endSession();
    const chain = usePlatformAuditStore.getState().chains[asoc.id] ?? [];
    expect(chain.length).toBeGreaterThan(before);
    const lastEntry = chain[chain.length - 1];
    expect(lastEntry.action).toBe('impersonation.ended');
  });

  it('endSession is a no-op when no session is active', async () => {
    expect(usePlatformImpersonationStore.getState().session).toBeNull();
    await expect(usePlatformImpersonationStore.getState().endSession()).resolves.toBeUndefined();
  });

  it('loading is false after startSession completes', async () => {
    await usePlatformImpersonationStore.getState().startSession({ asociatie_id: 'x', asociatie_name: 'X' });
    expect(usePlatformImpersonationStore.getState().loading).toBe(false);
  });

  it('clearError resets the error field', () => {
    usePlatformImpersonationStore.setState({ error: 'failed' });
    usePlatformImpersonationStore.getState().clearError();
    expect(usePlatformImpersonationStore.getState().error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Netlify function: parse-based guard
// ---------------------------------------------------------------------------

describe('impersonate Netlify function — static contract', () => {
  const fnSrc = readFileSync(
    resolve(process.cwd(), 'netlify/functions/impersonate.ts'),
    'utf8',
  );

  it('function source re-checks platform_admins server-side', () => {
    expect(fnSrc).toContain('platform_admins');
    expect(fnSrc).toContain('verifyBearerToken');
  });

  it('function source validates action is start or end', () => {
    expect(fnSrc).toContain("action !== 'start'");
    expect(fnSrc).toContain("action !== 'end'");
  });

  it('function source inserts into audit_log with impersonation actions', () => {
    expect(fnSrc).toContain('audit_log');
    expect(fnSrc).toContain('impersonation.started');
    expect(fnSrc).toContain('impersonation.ended');
  });
});
