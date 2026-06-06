import { describe, expect, it } from 'vitest';
import {
  clampStep,
  isLastCarouselStep,
  nextCarouselStep,
  prevCarouselStep,
} from '@/features/welcome/welcomeLogic';

const TOTAL = 3;

describe('clampStep', () => {
  it('returns the step unchanged when in range', () => {
    expect(clampStep(0, TOTAL)).toBe(0);
    expect(clampStep(1, TOTAL)).toBe(1);
    expect(clampStep(2, TOTAL)).toBe(2);
  });

  it('clamps negative values to 0', () => {
    expect(clampStep(-1, TOTAL)).toBe(0);
    expect(clampStep(-99, TOTAL)).toBe(0);
  });

  it('clamps values beyond the last slide', () => {
    expect(clampStep(3, TOTAL)).toBe(2);
    expect(clampStep(99, TOTAL)).toBe(2);
  });
});

describe('nextCarouselStep', () => {
  it('advances by one', () => {
    expect(nextCarouselStep(0, TOTAL)).toBe(1);
    expect(nextCarouselStep(1, TOTAL)).toBe(2);
  });

  it('stops at the last slide', () => {
    expect(nextCarouselStep(2, TOTAL)).toBe(2);
  });
});

describe('prevCarouselStep', () => {
  it('goes back by one', () => {
    expect(prevCarouselStep(2, TOTAL)).toBe(1);
    expect(prevCarouselStep(1, TOTAL)).toBe(0);
  });

  it('stops at the first slide', () => {
    expect(prevCarouselStep(0, TOTAL)).toBe(0);
  });
});

describe('isLastCarouselStep', () => {
  it('is false for non-final slides', () => {
    expect(isLastCarouselStep(0, TOTAL)).toBe(false);
    expect(isLastCarouselStep(1, TOTAL)).toBe(false);
  });

  it('is true on the final slide', () => {
    expect(isLastCarouselStep(2, TOTAL)).toBe(true);
  });

  it('works for a single-slide carousel', () => {
    expect(isLastCarouselStep(0, 1)).toBe(true);
  });
});
