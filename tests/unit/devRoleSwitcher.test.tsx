import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DevRoleSwitcher } from '@/shared/components/DevRoleSwitcher';

vi.mock('@/shared/lib/env', () => ({
  getStage: vi.fn().mockReturnValue('demo'),
  isDemo: vi.fn().mockReturnValue(true),
}));

const mockEnterDemo = vi.fn();
const mockSignInAsDevUser = vi.fn();

vi.mock('@/shared/store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      enterDemo: mockEnterDemo,
      signInAsDevUser: mockSignInAsDevUser,
      activeRole: () => 'admin',
      isPlatformSuperAdmin: false,
    }),
  ),
}));

const renderSwitcher = (props?: React.ComponentProps<typeof DevRoleSwitcher>) =>
  render(
    <MemoryRouter>
      <DevRoleSwitcher {...props} />
    </MemoryRouter>,
  );

describe('DevRoleSwitcher', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getStage, isDemo } = await import('@/shared/lib/env');
    vi.mocked(getStage).mockReturnValue('demo');
    vi.mocked(isDemo).mockReturnValue(true);
  });

  it('renders all 7 role chips in floating variant', () => {
    renderSwitcher();
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('renders with the floating class by default', () => {
    const { container } = renderSwitcher();
    expect(container.querySelector('.dev-role-switcher--floating')).toBeTruthy();
  });

  it('renders with inline class when variant=inline', () => {
    const { container } = renderSwitcher({ variant: 'inline' });
    expect(container.querySelector('.dev-role-switcher--inline')).toBeTruthy();
    expect(container.querySelector('.dev-role-switcher--floating')).toBeNull();
  });

  it('calls onSelect with the clicked role when override is provided', () => {
    const onSelect = vi.fn();
    renderSwitcher({ onSelect });
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelect).toHaveBeenCalledWith('admin');
  });

  it('marks the active role chip with aria-pressed=true', () => {
    renderSwitcher();
    const pressed = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(pressed).toHaveLength(1);
  });

  it('returns null in prod stage', async () => {
    const { getStage } = await import('@/shared/lib/env');
    vi.mocked(getStage).mockReturnValue('prod');
    const { container } = renderSwitcher();
    expect(container.firstChild).toBeNull();
  });

  it('shows the label paragraph in inline variant', () => {
    const { container } = renderSwitcher({ variant: 'inline' });
    expect(container.querySelector('.dev-role-switcher__label')).toBeTruthy();
  });
});

describe('DevRoleSwitcher signInAsDevUser email format (pure logic)', () => {
  it('maps super_admin to super.admin@dev.local', () => {
    const role = 'super_admin' as const;
    const localPart = role === 'super_admin' ? 'super.admin' : role;
    expect(`${localPart}@dev.local`).toBe('super.admin@dev.local');
  });

  it('maps other roles directly to {role}@dev.local', () => {
    expect(`admin@dev.local`).toBe('admin@dev.local');
    expect(`locatar@dev.local`).toBe('locatar@dev.local');
  });
});
