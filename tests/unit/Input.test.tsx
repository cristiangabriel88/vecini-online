import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea, Input } from '@/shared/components/Input';

describe('Input', () => {
  it('links the error paragraph to the input via aria-describedby', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errId = input.getAttribute('aria-describedby');
    expect(errId).toBeTruthy();
    const errEl = document.getElementById(errId!);
    expect(errEl).not.toBeNull();
    expect(errEl).toHaveTextContent('Invalid email');
  });

  it('omits aria-describedby when there is no error', () => {
    render(<Input label="Name" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('Textarea', () => {
  it('links the error paragraph to the textarea via aria-describedby', () => {
    render(<Textarea label="Message" error="Required" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    const errId = textarea.getAttribute('aria-describedby');
    expect(errId).toBeTruthy();
    const errEl = document.getElementById(errId!);
    expect(errEl).not.toBeNull();
    expect(errEl).toHaveTextContent('Required');
  });

  it('omits aria-describedby when there is no error', () => {
    render(<Textarea label="Notes" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
    expect(textarea).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders the hint when no error is present', () => {
    render(<Textarea label="Bio" hint="Max 500 chars" />);
    expect(screen.getByText('Max 500 chars')).toBeInTheDocument();
  });

  it('hides the hint when an error is present', () => {
    render(<Textarea label="Bio" hint="Max 500 chars" error="Too long" />);
    expect(screen.queryByText('Max 500 chars')).not.toBeInTheDocument();
    expect(screen.getByText(/Too long/)).toBeInTheDocument();
  });
});
