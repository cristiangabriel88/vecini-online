import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ro' },
  }),
}));

vi.mock('@/shared/store/themeStore', () => ({
  useThemeStore: vi.fn(() => ({ theme: 'light', toggle: vi.fn(), apply: vi.fn() })),
}));

vi.mock('@/shared/store/tintStore', () => ({
  useTintStore: vi.fn(() => ({ tint: 'sage', setTint: vi.fn(), apply: vi.fn() })),
}));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: (node: unknown) => node,
  };
});

import ComponentGalleryPage from '@/features/dev/ComponentGalleryPage';

afterEach(cleanup);

describe('ComponentGalleryPage', () => {
  it('renders without crashing', () => {
    render(<ComponentGalleryPage />);
    expect(screen.getByText('gallery.title')).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<ComponentGalleryPage />);
    expect(screen.getByText('gallery.buttons')).toBeInTheDocument();
    expect(screen.getByText('gallery.badges')).toBeInTheDocument();
    expect(screen.getByText('gallery.inputs')).toBeInTheDocument();
    expect(screen.getByText('gallery.select')).toBeInTheDocument();
    expect(screen.getByText('gallery.textarea')).toBeInTheDocument();
    expect(screen.getByText('gallery.switches')).toBeInTheDocument();
    expect(screen.getByText('gallery.cards')).toBeInTheDocument();
    expect(screen.getByText('gallery.modals')).toBeInTheDocument();
  });

  it('renders all five palette swatch buttons', () => {
    render(<ComponentGalleryPage />);
    const paletteGroup = screen.getByRole('group', { name: 'gallery.palette' });
    const swatches = paletteGroup.querySelectorAll('button');
    expect(swatches).toHaveLength(5);
    const labels = Array.from(swatches).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Sage', 'Terracotta', 'Ocean', 'Indigo', 'Plum']);
  });

  it('marks the active palette swatch as pressed', () => {
    render(<ComponentGalleryPage />);
    const sage = screen.getByRole('button', { name: 'Sage' });
    expect(sage).toHaveAttribute('aria-pressed', 'true');
    const ocean = screen.getByRole('button', { name: 'Ocean' });
    expect(ocean).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders theme toggle button', () => {
    render(<ComponentGalleryPage />);
    const themeBtn = screen.getByRole('button', { name: 'gallery.switchDark' });
    expect(themeBtn).toBeInTheDocument();
  });

  it('renders button variants and sizes', () => {
    render(<ComponentGalleryPage />);
    const smButtons = screen.getAllByRole('button', { name: 'sm' });
    expect(smButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('modal opens on button click', () => {
    render(<ComponentGalleryPage />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const openBtn = screen.getByRole('button', { name: 'gallery.openModal' });
    fireEvent.click(openBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('modal enters closing state when dismissed', () => {
    render(<ComponentGalleryPage />);
    fireEvent.click(screen.getByRole('button', { name: 'gallery.openModal' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-state', 'open');
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(dialog).toHaveAttribute('data-state', 'closing');
  });

  it('switch toggles on click', () => {
    render(<ComponentGalleryPage />);
    const switchOn = screen.getByRole('switch', { name: 'gallery.switchOn' });
    expect(switchOn).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(switchOn);
    expect(switchOn).toHaveAttribute('aria-checked', 'false');
  });

  it('checkbox toggles on click', () => {
    render(<ComponentGalleryPage />);
    const cb = screen.getByRole('checkbox', { name: 'gallery.checkboxOn' });
    expect(cb).toBeChecked();
    fireEvent.click(cb);
    expect(cb).not.toBeChecked();
  });

  it('disabled controls are not interactive', () => {
    render(<ComponentGalleryPage />);
    const disabledSwitch = screen.getByRole('switch', { name: 'gallery.disabled' });
    expect(disabledSwitch).toBeDisabled();
    const disabledCheckbox = screen.getByRole('checkbox', { name: 'gallery.disabled' });
    expect(disabledCheckbox).toBeDisabled();
  });
});
