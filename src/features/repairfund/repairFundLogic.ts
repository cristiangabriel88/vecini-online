/**
 * F46 — recommended fond de reparații accumulation rate.
 *
 * The model is intentionally simple and transparent: a base rate per built m²
 * is increased for older buildings and for blocks where major works are long
 * overdue. It is guidance for the AGA, not a legal requirement.
 */

/** Base recommended accumulation for a well-maintained, recent building (lei/m²/month). */
export const BASE_RATE_PER_SQM = 0.5;

export interface FundInputs {
  /** Total built area of the association, in m². */
  areaSqm: number;
  /** Year the building was constructed. */
  yearBuilt: number;
  /** Year of the last major works (roof, façade, pipes); null if never / unknown. */
  lastMajorWorksYear: number | null;
  /** Current total monthly accumulation, in lei. */
  currentMonthly: number;
}

export interface FundRecommendation {
  /** Recommended rate in lei/m²/month, rounded to 2 decimals. */
  ratePerSqm: number;
  /** Recommended total monthly accumulation, in lei. */
  recommendedMonthly: number;
  base: number;
  ageComponent: number;
  worksComponent: number;
  /** recommendedMonthly − currentMonthly; positive means under-funded. */
  gap: number;
}

/** Inputs are valid when the area is positive and the build year is plausible. */
export function isValidFundInputs(inputs: FundInputs, now: Date = new Date()): boolean {
  const year = now.getFullYear();
  return (
    Number.isFinite(inputs.areaSqm) &&
    inputs.areaSqm > 0 &&
    Number.isInteger(inputs.yearBuilt) &&
    inputs.yearBuilt >= 1850 &&
    inputs.yearBuilt <= year &&
    Number.isFinite(inputs.currentMonthly) &&
    inputs.currentMonthly >= 0 &&
    (inputs.lastMajorWorksYear === null ||
      (inputs.lastMajorWorksYear >= inputs.yearBuilt && inputs.lastMajorWorksYear <= year))
  );
}

/** Extra rate for building age: +0.15 lei/m² per full decade, capped at +0.75. */
export function ageComponent(yearBuilt: number, now: Date = new Date()): number {
  const decades = Math.floor((now.getFullYear() - yearBuilt) / 10);
  return Math.min(0.75, Math.max(0, decades) * 0.15);
}

/** Extra rate for overdue major works, based on years since the last ones. */
export function worksComponent(
  yearBuilt: number,
  lastMajorWorksYear: number | null,
  now: Date = new Date(),
): number {
  const reference = lastMajorWorksYear ?? yearBuilt;
  const years = now.getFullYear() - reference;
  if (years >= 15) return 0.4;
  if (years >= 10) return 0.25;
  if (years >= 5) return 0.1;
  return 0;
}

/** Compute the full recommendation for the given inputs. */
export function recommend(inputs: FundInputs, now: Date = new Date()): FundRecommendation {
  const age = ageComponent(inputs.yearBuilt, now);
  const works = worksComponent(inputs.yearBuilt, inputs.lastMajorWorksYear, now);
  const ratePerSqm = Math.round((BASE_RATE_PER_SQM + age + works) * 100) / 100;
  const recommendedMonthly = Math.round(ratePerSqm * inputs.areaSqm);
  return {
    ratePerSqm,
    recommendedMonthly,
    base: BASE_RATE_PER_SQM,
    ageComponent: age,
    worksComponent: works,
    gap: recommendedMonthly - Math.round(inputs.currentMonthly),
  };
}
