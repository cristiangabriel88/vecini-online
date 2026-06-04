import { describe, it, expect } from 'vitest';
import { extractPhotoPaths } from '@/features/gdpr/gdprLogic';

describe('extractPhotoPaths', () => {
  it('returns paths from rows with non-null photo_path', () => {
    const rows = [
      { photo_path: 'asoc-1/user-1/pets/cat.jpg' },
      { photo_path: 'asoc-1/user-1/bikes/bike.jpg' },
    ];
    expect(extractPhotoPaths(rows)).toEqual([
      'asoc-1/user-1/pets/cat.jpg',
      'asoc-1/user-1/bikes/bike.jpg',
    ]);
  });

  it('filters out rows with null photo_path', () => {
    const rows = [
      { photo_path: 'asoc-1/user-1/pets/dog.jpg' },
      { photo_path: null },
      { photo_path: 'asoc-1/user-1/lending/drill.jpg' },
    ];
    expect(extractPhotoPaths(rows)).toEqual([
      'asoc-1/user-1/pets/dog.jpg',
      'asoc-1/user-1/lending/drill.jpg',
    ]);
  });

  it('filters out rows with undefined photo_path', () => {
    const rows = [
      { photo_path: undefined },
      { photo_path: 'asoc-2/user-3/marketplace/sofa.png' },
    ];
    expect(extractPhotoPaths(rows)).toEqual(['asoc-2/user-3/marketplace/sofa.png']);
  });

  it('returns empty array for empty input', () => {
    expect(extractPhotoPaths([])).toEqual([]);
  });

  it('returns empty array when all paths are null', () => {
    const rows = [{ photo_path: null }, { photo_path: null }];
    expect(extractPhotoPaths(rows)).toEqual([]);
  });

  it('returns all paths when none are null', () => {
    const rows = [
      { photo_path: 'asoc-1/user-1/pets/cat.jpg' },
      { photo_path: 'asoc-1/user-1/bikes/bike.jpg' },
      { photo_path: 'asoc-1/user-1/visitors/car.jpg' },
    ];
    const result = extractPhotoPaths(rows);
    expect(result).toHaveLength(3);
    expect(result).toContain('asoc-1/user-1/visitors/car.jpg');
  });
});
