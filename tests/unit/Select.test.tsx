import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select } from '@/shared/components/Select';

describe('Select', () => {
  it('links label to select via htmlFor/id', () => {
    render(
      <Select label="Category">
        <option value="a">A</option>
      </Select>,
    );
    const select = screen.getByRole('combobox');
    const labelEl = screen.getByText('Category');
    expect(labelEl.tagName).toBe('LABEL');
    expect((labelEl as HTMLLabelElement).htmlFor).toBe(select.id);
  });

  it('sets aria-invalid and links error paragraph via aria-describedby', () => {
    render(
      <Select label="Status" error="Required field">
        <option value="">Choose</option>
      </Select>,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    const errId = select.getAttribute('aria-describedby');
    expect(errId).toBeTruthy();
    const errEl = document.getElementById(errId!);
    expect(errEl).not.toBeNull();
    expect(errEl).toHaveTextContent('Required field');
  });

  it('sets aria-invalid to false and omits aria-describedby when no error', () => {
    render(
      <Select label="Role">
        <option value="admin">Admin</option>
      </Select>,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'false');
    expect(select).not.toHaveAttribute('aria-describedby');
  });
});
