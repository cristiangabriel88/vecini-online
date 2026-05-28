import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { StageBanner } from '@/shared/components/StageBanner';

vi.mock('@/shared/lib/env', () => ({
  getStage: vi.fn().mockReturnValue('demo'),
}));

const renderBanner = () => render(<StageBanner />);

describe('StageBanner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getStage } = await import('@/shared/lib/env');
    vi.mocked(getStage).mockReturnValue('demo');
  });

  it('renders nothing in prod', async () => {
    const { getStage } = await import('@/shared/lib/env');
    vi.mocked(getStage).mockReturnValue('prod');
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('renders a banner in demo stage', () => {
    const { container } = renderBanner();
    expect(container.querySelector('.stage-banner--demo')).toBeTruthy();
  });

  it('renders a banner in dev stage', async () => {
    const { getStage } = await import('@/shared/lib/env');
    vi.mocked(getStage).mockReturnValue('dev');
    const { container } = renderBanner();
    expect(container.querySelector('.stage-banner--dev')).toBeTruthy();
  });

  it('has aria-hidden on the banner element', () => {
    const { container } = renderBanner();
    const el = container.querySelector('.stage-banner');
    expect(el?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the base stage-banner class', () => {
    const { container } = renderBanner();
    expect(container.querySelector('.stage-banner')).toBeTruthy();
  });
});
