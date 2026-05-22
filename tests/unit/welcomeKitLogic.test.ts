import { describe, expect, it } from 'vitest';
import {
  completion,
  isComplete,
  isValidItem,
  nextOrder,
  sortItems,
} from '@/features/welcomekit/welcomeKitLogic';
import type { WelcomeKitItem } from '@/shared/types/domain';

const item = (id: string, order: number): WelcomeKitItem => ({
  id,
  asociatie_id: 'a',
  order,
  title: `Pas ${id}`,
  body: 'Descriere',
});

const items: WelcomeKitItem[] = [item('c', 3), item('a', 1), item('b', 2)];

describe('isValidItem', () => {
  it('requires a 3+ char title and body', () => {
    expect(isValidItem('Citește regulamentul', 'Vezi în arhivă.')).toBe(true);
    expect(isValidItem('ab', 'Descriere')).toBe(false);
    expect(isValidItem('Titlu', 'ab')).toBe(false);
    expect(isValidItem('   ', '   ')).toBe(false);
  });
});

describe('sortItems', () => {
  it('orders by ascending order field', () => {
    expect(sortItems(items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('nextOrder', () => {
  it('returns one past the highest order', () => {
    expect(nextOrder(items)).toBe(4);
    expect(nextOrder([])).toBe(1);
  });
});

describe('completion', () => {
  it('counts done items and rounds the percent', () => {
    expect(completion(items, new Set(['a', 'b']))).toEqual({ done: 2, total: 3, percent: 67 });
    expect(completion(items, new Set())).toEqual({ done: 0, total: 3, percent: 0 });
    expect(completion([], new Set())).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('isComplete', () => {
  it('is true only when every step is checked', () => {
    expect(isComplete(items, new Set(['a', 'b', 'c']))).toBe(true);
    expect(isComplete(items, new Set(['a', 'b']))).toBe(false);
    expect(isComplete([], new Set())).toBe(false);
  });
});
