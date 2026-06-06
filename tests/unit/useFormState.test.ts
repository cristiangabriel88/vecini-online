import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFormState } from '@/shared/lib/useFormState';

type Errors = Partial<Record<'name' | 'email' | 'age', string>>;

describe('useFormState', () => {
  it('starts with submitted=false and isValid matching the errors', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: 'required' }),
    );
    expect(result.current.submitted).toBe(false);
    expect(result.current.isValid).toBe(false);
  });

  it('fieldError returns undefined before handleSubmit is called', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: 'required', email: 'invalid' }),
    );
    expect(result.current.fieldError('name')).toBeUndefined();
    expect(result.current.fieldError('email')).toBeUndefined();
  });

  it('fieldError returns the error value after handleSubmit', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: 'required', email: 'invalid' }),
    );
    act(() => { result.current.handleSubmit(); });
    expect(result.current.fieldError('name')).toBe('required');
    expect(result.current.fieldError('email')).toBe('invalid');
  });

  it('fieldError returns undefined for fields without errors after handleSubmit', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: 'required' }),
    );
    act(() => { result.current.handleSubmit(); });
    expect(result.current.fieldError('email')).toBeUndefined();
    expect(result.current.fieldError('age')).toBeUndefined();
  });

  it('handleSubmit returns false when there are errors', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: 'required' }),
    );
    let valid: boolean;
    act(() => { valid = result.current.handleSubmit(); });
    expect(valid!).toBe(false);
  });

  it('handleSubmit returns true when there are no errors', () => {
    const { result } = renderHook(() => useFormState<Errors>({}));
    let valid: boolean;
    act(() => { valid = result.current.handleSubmit(); });
    expect(valid!).toBe(true);
  });

  it('isValid is true when all error values are undefined', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: undefined, email: undefined }),
    );
    expect(result.current.isValid).toBe(true);
  });

  it('isValid is true when all error values are empty strings', () => {
    const { result } = renderHook(() =>
      useFormState<Errors>({ name: '' }),
    );
    expect(result.current.isValid).toBe(true);
  });

  it('submitted becomes true after handleSubmit', () => {
    const { result } = renderHook(() => useFormState<Errors>({}));
    act(() => { result.current.handleSubmit(); });
    expect(result.current.submitted).toBe(true);
  });

  it('reflects updated errors when the parent re-renders with new values', () => {
    let errors: Errors = { name: 'required' };
    const { result, rerender } = renderHook(() => useFormState(errors));
    act(() => { result.current.handleSubmit(); });
    expect(result.current.fieldError('name')).toBe('required');

    errors = {};
    rerender();
    expect(result.current.fieldError('name')).toBeUndefined();
    expect(result.current.isValid).toBe(true);
  });

  it('handles a form with no error keys as valid', () => {
    const { result } = renderHook(() => useFormState<Errors>({}));
    expect(result.current.isValid).toBe(true);
    act(() => { result.current.handleSubmit(); });
    expect(result.current.isValid).toBe(true);
  });
});
