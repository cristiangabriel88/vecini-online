/**
 * Unit tests for the "Add Association" submit-mode decision.
 *
 * Locks in the prod-safe behaviour of `resolveAddAsociatieMode`:
 *  - When the Supabase backend is configured, the form ALWAYS takes the live
 *    service-role provisioning path (never the local demo write), in every stage.
 *  - The local demo simulation is reachable ONLY in a genuine offline demo build
 *    (stage `demo`, no backend) so the offline showcase keeps working.
 *  - A prod/dev build whose backend credentials are missing resolves to
 *    `unconfigured`, so the page surfaces a real "backend not configured" error
 *    instead of silently falling back to a throwaway local invite.
 */
import { describe, expect, it } from 'vitest';
import { resolveAddAsociatieMode } from '@/platform/platformProvisioningLogic';

describe('resolveAddAsociatieMode', () => {
  it('uses the live backend path whenever Supabase is configured', () => {
    expect(resolveAddAsociatieMode(true, 'prod')).toBe('live');
    expect(resolveAddAsociatieMode(true, 'dev')).toBe('live');
    // Even if the stage were mislabelled demo, configured creds win -> live.
    expect(resolveAddAsociatieMode(true, 'demo')).toBe('live');
  });

  it('only simulates locally in a genuine offline demo build', () => {
    expect(resolveAddAsociatieMode(false, 'demo')).toBe('demo');
  });

  it('does NOT fall back to the local/demo path in prod without a backend', () => {
    // The key regression guard: a misconfigured prod deploy must surface a real
    // error, never silently create a local invite.
    expect(resolveAddAsociatieMode(false, 'prod')).toBe('unconfigured');
    expect(resolveAddAsociatieMode(false, 'prod')).not.toBe('demo');
  });

  it('does NOT fall back to the local/demo path on a dev build without a backend', () => {
    expect(resolveAddAsociatieMode(false, 'dev')).toBe('unconfigured');
    expect(resolveAddAsociatieMode(false, 'dev')).not.toBe('demo');
  });
});
