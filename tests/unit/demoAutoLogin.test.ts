import { describe, it, expect, beforeEach } from 'vitest';

const LAST_DEMO_ROLE_KEY = 'vecini:lastDemoRole';

describe('lastDemoRole localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to admin when nothing is stored', () => {
    expect(localStorage.getItem(LAST_DEMO_ROLE_KEY)).toBeNull();
  });

  it('stores and reads back any Role value', () => {
    localStorage.setItem(LAST_DEMO_ROLE_KEY, 'proprietar');
    expect(localStorage.getItem(LAST_DEMO_ROLE_KEY)).toBe('proprietar');
  });

  it('last write wins when role switches', () => {
    localStorage.setItem(LAST_DEMO_ROLE_KEY, 'admin');
    localStorage.setItem(LAST_DEMO_ROLE_KEY, 'cenzor');
    expect(localStorage.getItem(LAST_DEMO_ROLE_KEY)).toBe('cenzor');
  });

  it('stores all valid roles without error', () => {
    const roles = ['admin', 'presedinte', 'comitet', 'cenzor', 'proprietar', 'chirias', 'super_admin'];
    for (const role of roles) {
      localStorage.setItem(LAST_DEMO_ROLE_KEY, role);
      expect(localStorage.getItem(LAST_DEMO_ROLE_KEY)).toBe(role);
    }
  });
});
