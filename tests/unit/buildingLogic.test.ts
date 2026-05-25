import { describe, expect, it } from 'vitest';
import {
  detectEntranceConfig,
  entranceInterval,
  entranceOptions,
  scariList,
} from '@/features/admin/buildingLogic';

describe('buildingLogic — entrance options', () => {
  it('exposes 26 letters and 50 numbers', () => {
    expect(entranceOptions('letters')).toHaveLength(26);
    expect(entranceOptions('letters')[0]).toBe('A');
    expect(entranceOptions('numbers')).toHaveLength(50);
    expect(entranceOptions('numbers')[0]).toBe('1');
  });
});

describe('buildingLogic — entranceInterval', () => {
  it('returns the inclusive letter range', () => {
    expect(entranceInterval('letters', 'A', 'D')).toEqual(['A', 'B', 'C', 'D']);
    expect(entranceInterval('letters', 'C', 'C')).toEqual(['C']);
  });

  it('returns the inclusive number range', () => {
    expect(entranceInterval('numbers', '1', '4')).toEqual(['1', '2', '3', '4']);
  });

  it('tolerates a reversed pair by swapping', () => {
    expect(entranceInterval('letters', 'D', 'A')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('returns an empty list for an unknown bound', () => {
    expect(entranceInterval('letters', 'A', '9')).toEqual([]);
    expect(entranceInterval('numbers', '1', 'Z')).toEqual([]);
  });
});

describe('buildingLogic — detectEntranceConfig', () => {
  it('defaults to a single A for an empty list', () => {
    expect(detectEntranceConfig([])).toEqual({ mode: 'letters', first: 'A', last: 'A' });
  });

  it('recovers a letter interval from the stored list', () => {
    expect(detectEntranceConfig(['A', 'B', 'C'])).toEqual({
      mode: 'letters',
      first: 'A',
      last: 'C',
    });
  });

  it('recovers a number interval only when every entry is numeric', () => {
    expect(detectEntranceConfig(['1', '2', '3'])).toEqual({
      mode: 'numbers',
      first: '1',
      last: '3',
    });
    // Mixed -> treated as letters; numeric entries are then unknown and dropped.
    expect(detectEntranceConfig(['A', '2']).mode).toBe('letters');
  });

  it('sorts by position so order in the stored list does not matter', () => {
    expect(detectEntranceConfig(['C', 'A', 'B'])).toEqual({
      mode: 'letters',
      first: 'A',
      last: 'C',
    });
  });
});

describe('buildingLogic — scariList', () => {
  it('reads a clean string list from the settings bag', () => {
    expect(scariList({ scari: ['A', 'B'] })).toEqual(['A', 'B']);
    expect(scariList({ scari: ['A', '', '  ', 'B'] })).toEqual(['A', 'B']);
  });

  it('returns an empty list for missing or non-array settings', () => {
    expect(scariList(undefined)).toEqual([]);
    expect(scariList({})).toEqual([]);
    expect(scariList({ scari: 'A,B' })).toEqual([]);
  });
});
