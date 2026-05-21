import type { MajorityRule } from '@/shared/types/domain';

export interface TallyInput {
  /** votes (or weight) per option id */
  counts: Record<string, number>;
  yesOptionId: string;
  noOptionId?: string;
  totalApartments: number;
  quorumPercent: number;
  majorityRule: MajorityRule;
}

export interface TallyResult {
  total: number;
  quorumMet: boolean;
  passed: boolean;
  percentages: Record<string, number>;
}

/** Compute whether a yes/no proposal passes, given quorum and majority rule. */
export function tallyYesNo(input: TallyInput): TallyResult {
  const { counts, yesOptionId, noOptionId, totalApartments, quorumPercent, majorityRule } = input;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const quorumMet = totalApartments === 0 ? false : (total / totalApartments) * 100 >= quorumPercent;

  const yes = counts[yesOptionId] ?? 0;
  const no = noOptionId ? (counts[noOptionId] ?? 0) : 0;

  let passed = false;
  if (quorumMet) {
    switch (majorityRule) {
      case 'simple':
        passed = yes > no;
        break;
      case 'absolute':
        passed = yes > totalApartments / 2;
        break;
      case 'qualified_2_3':
        passed = total > 0 && yes >= (2 / 3) * total;
        break;
    }
  }

  const percentages: Record<string, number> = {};
  for (const [id, c] of Object.entries(counts)) {
    percentages[id] = total === 0 ? 0 : Math.round((c / total) * 100);
  }

  return { total, quorumMet, passed, percentages };
}
