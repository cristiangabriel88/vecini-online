import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ro' },
  }),
}));

import { Button } from '@/shared/components/Button';
import { Input, Textarea } from '@/shared/components/Input';
import { Select } from '@/shared/components/Select';
import { Modal } from '@/shared/components/Modal';
import { Switch } from '@/shared/components/Switch';
import { Checkbox } from '@/shared/components/Checkbox';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('applies variant class', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--danger');
  });

  it('applies size class', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--sm');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled and aria-busy when loading', () => {
    render(<Button loading>Loading</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('does not set aria-busy when not loading', () => {
    render(<Button>Normal</Button>);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Blocked</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

describe('Input', () => {
  it('renders label associated with input', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('does not set aria-invalid when no error', () => {
    render(<Input label="Name" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wires aria-describedby to the error element', () => {
    render(<Input label="Name" error="Required" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Required');
  });

  it('wires aria-describedby to the hint element when no error', () => {
    render(<Input label="Name" hint="Max 50 chars" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Max 50 chars');
  });

  it('hides hint when error is also provided', () => {
    render(<Input label="Name" hint="Max 50 chars" error="Required" />);
    expect(screen.queryByText('Max 50 chars')).not.toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

describe('Textarea', () => {
  it('renders label associated with textarea', () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Textarea label="Notes" error="Too long" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wires aria-describedby to the error element', () => {
    render(<Textarea label="Notes" error="Too long" />);
    const ta = screen.getByRole('textbox');
    const describedBy = ta.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Too long');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Textarea label="Notes" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });
});

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

describe('Select', () => {
  it('renders label associated with select', () => {
    render(
      <Select label="Country">
        <option value="ro">Romania</option>
      </Select>,
    );
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is provided', () => {
    render(
      <Select label="Country" error="Please choose">
        <option value="">-</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('wires aria-describedby to the error element', () => {
    render(
      <Select label="Country" error="Please choose">
        <option value="">-</option>
      </Select>,
    );
    const sel = screen.getByRole('combobox');
    const describedBy = sel.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Please choose');
  });

  it('does not set aria-invalid when no error', () => {
    render(
      <Select label="Country">
        <option value="ro">Romania</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'false');
  });
});

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

describe('Modal', () => {
  it('renders role="dialog" with aria-modal when open', () => {
    render(<Modal open onClose={vi.fn()} title="Confirm"><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('labels the dialog with the title', () => {
    render(<Modal open onClose={vi.fn()} title="My Title"><p>Body</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'My Title' })).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Hidden"><p>Body</p></Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm"><p>Body</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm"><p>Body</p></Modal>);
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onClose when clicking inside the dialog', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Confirm"><p>Inner content</p></Modal>);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm" footer={<button>OK</button>}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

describe('Switch', () => {
  it('has role="switch"', () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Notifications" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('sets aria-checked to true when checked', () => {
    render(<Switch checked onChange={vi.fn()} label="Active" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('sets aria-checked to false when unchecked', () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Active" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with toggled value on click', () => {
    const handler = vi.fn();
    render(<Switch checked={false} onChange={handler} label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when currently checked', () => {
    const handler = vi.fn();
    render(<Switch checked onChange={handler} label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Switch checked={false} onChange={vi.fn()} label="Toggle" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('does not call onChange when disabled', () => {
    const handler = vi.fn();
    render(<Switch checked={false} onChange={handler} label="Toggle" disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

describe('Checkbox', () => {
  it('renders a native checkbox input', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Accept terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('is checked when checked prop is true', () => {
    render(<Checkbox checked onChange={vi.fn()} label="Accept" />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('is unchecked when checked prop is false', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Accept" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls onChange with true when unchecked box is clicked', () => {
    const handler = vi.fn();
    render(<Checkbox checked={false} onChange={handler} label="Accept" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when checked box is clicked', () => {
    const handler = vi.fn();
    render(<Checkbox checked onChange={handler} label="Accept" />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(handler).toHaveBeenCalledWith(false);
  });

  it('renders label text', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Checkbox checked={false} onChange={vi.fn()} label="Accept" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
