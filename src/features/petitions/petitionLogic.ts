import type { Petition } from '@/shared/types/domain';

/** A petition needs a short title and a body. */
export function isValidPetition(title: string, body: string): boolean {
  return title.trim().length >= 3 && body.trim().length >= 5;
}

/** Number of signatures required to forward the petition to the comitet. */
export function thresholdCount(p: Petition): number {
  return Math.ceil((p.threshold_percent / 100) * p.total_apartments);
}

/** Whether the petition has gathered enough signatures to be forwarded. */
export function isThresholdReached(p: Petition): boolean {
  return p.signatures >= thresholdCount(p);
}

/** Progress toward the threshold, clamped to 0–1. */
export function progress(p: Petition): number {
  const target = thresholdCount(p);
  if (target <= 0) return 1;
  return Math.min(1, p.signatures / target);
}

/** Sort petitions newest first. */
export function sortPetitions(petitions: Petition[]): Petition[] {
  return [...petitions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
