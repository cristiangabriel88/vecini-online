import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Photo } from '@/shared/components/Photo';

describe('Photo', () => {
  it('renders an img element when src is provided', () => {
    render(<Photo src="https://example.com/photo.jpg" alt="Test photo" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    expect(img).toHaveAttribute('alt', 'Test photo');
  });

  it('applies loading="lazy" and decoding="async" by default', () => {
    render(<Photo src="https://example.com/photo.jpg" alt="Test photo" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('forwards className to the img element', () => {
    render(
      <Photo src="https://example.com/photo.jpg" alt="Test" className="rounded-full h-10 w-10" />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveClass('rounded-full');
    expect(img).toHaveClass('h-10');
    expect(img).toHaveClass('w-10');
  });

  it('renders the fallback when src is null', () => {
    render(
      <Photo src={null} alt="Avatar" fallback={<div data-testid="fallback">initials</div>} />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders the fallback when src is undefined', () => {
    render(
      <Photo src={undefined} alt="Avatar" fallback={<div data-testid="fallback">initials</div>} />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders the fallback after a load error', () => {
    render(
      <Photo
        src="https://example.com/broken.jpg"
        alt="Broken"
        fallback={<div data-testid="fallback">fallback content</div>}
      />,
    );
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('renders nothing when src is null and no fallback is provided', () => {
    const { container } = render(<Photo src={null} alt="Avatar" />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts width and height props', () => {
    render(
      <Photo src="https://example.com/photo.jpg" alt="Photo" width={100} height={100} />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('width', '100');
    expect(img).toHaveAttribute('height', '100');
  });
});
