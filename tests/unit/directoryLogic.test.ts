import { describe, expect, it } from 'vitest';
import { visibleEntry, isListed, searchDirectory } from '@/features/directory/directoryLogic';
import type { DirectoryEntry } from '@/shared/types/domain';

function entry(over: Partial<DirectoryEntry>): DirectoryEntry {
  return {
    id: 'x', asociatie_id: 'a', user_id: 'u', name: 'Popescu Andrei', apartment: 'Ap. 5',
    phone: '+40 700 000 000', email: 'a@b.ro',
    show_name: false, show_apartment: false, show_phone: false, show_email: false, ...over,
  };
}

describe('directory consent', () => {
  it('masks fields the resident did not consent to show', () => {
    const v = visibleEntry(entry({ show_name: true, show_phone: true }));
    expect(v.name).toBe('Popescu Andrei');
    expect(v.phone).toBe('+40 700 000 000');
    expect(v.apartment).toBeNull();
    expect(v.email).toBeNull();
  });

  it('lists only residents exposing their name', () => {
    expect(isListed(entry({ show_name: true }))).toBe(true);
    expect(isListed(entry({ show_name: false, show_phone: true }))).toBe(false);
  });

  it('searches over visible fields only', () => {
    const entries = [
      entry({ id: '1', name: 'Popescu Andrei', show_name: true, apartment: 'Ap. 5', show_apartment: true }),
      entry({ id: '2', name: 'Georgescu Elena', show_name: true }),
      entry({ id: '3', name: 'Ascuns', show_name: false }),
    ];
    expect(searchDirectory(entries, '').map((v) => v.id)).toEqual(['1', '2']);
    expect(searchDirectory(entries, 'popescu').map((v) => v.id)).toEqual(['1']);
    expect(searchDirectory(entries, 'ap. 5').map((v) => v.id)).toEqual(['1']);
  });
});
