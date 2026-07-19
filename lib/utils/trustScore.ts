import type { TrustClaim } from '@/types';

/**
 * Aggregate Trust Score (0-100, whole number) for an application's diligence.
 *
 * Computes the average confidence across all trustClaims. Unverified claims are
 * NOT excluded — their stated confidence is still counted, but down-weighted so
 * they contribute as low-confidence evidence rather than vanishing from the
 * aggregate (excluding them would overstate overall trust).
 *
 * Returns null when diligence hasn't produced any claims yet.
 */
export function computeTrustScore(claims: Array<Pick<TrustClaim, 'confidence' | 'verifiedBy'>>): number | null {
  if (!claims || claims.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const claim of claims) {
    const confidence = typeof claim.confidence === 'number' ? claim.confidence : 0;
    const unverified = claim.verifiedBy === 'unverified';
    // Verified claims count at full weight; unverified claims count at half
    // weight so they register as low-confidence rather than being dropped.
    const weight = unverified ? 0.5 : 1;
    weightedSum += confidence * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;

  const average = weightedSum / weightTotal;
  return Math.max(0, Math.min(100, Math.round(average)));
}
