export const PRODUCTION_SUPABASE_URL = 'https://zylfndjluunbtudtawzq.supabase.co';

function isIpv4(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateIpv4(hostname: string): boolean {
  if (!isIpv4(hostname)) return false;
  const [a, b] = hostname.split('.').map((part) => Number(part));
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower === '::1' || lower === '0.0.0.0') return true;
  if (lower.endsWith('.local') || lower.endsWith('.home.arpa')) return true;
  return isPrivateIpv4(lower);
}

function isPrivateSupabaseCandidate(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname;
    return isLocalOrPrivateHost(hostname);
  } catch {
    return false;
  }
}

function isPublicRuntimeHost(hostname: string | undefined): boolean {
  if (!hostname) return false;
  return !isLocalOrPrivateHost(hostname);
}

/**
 * Resolve the Supabase URL for a deployment. Production-like builds must not
 * point at private Pi/local addresses; if they do, fall back to the hosted
 * production project so the public deploy stays reachable.
 */
export function resolveSupabaseUrl(
  rawUrl: string | undefined,
  appStage?: string | undefined,
  runtimeHostname?: string | undefined,
): string {
  const trimmed = rawUrl?.trim() ?? '';
  if (!trimmed) return '';

  // Public deployments must never talk to a private Pi/local Supabase URL.
  // If the build stage is misconfigured, the public runtime host still forces
  // the hosted production project so login stays reachable.
  if (isPrivateSupabaseCandidate(trimmed) && isPublicRuntimeHost(runtimeHostname)) {
    return PRODUCTION_SUPABASE_URL;
  }

  const stage = appStage?.trim();
  if (stage === 'dev' || stage === 'demo') return trimmed;

  return isPrivateSupabaseCandidate(trimmed) ? PRODUCTION_SUPABASE_URL : trimmed;
}
