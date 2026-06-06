import { useState } from 'react';

/**
 * Manages the "submitted" gate for hand-rolled form validation.
 *
 * The component computes errors on every render; this hook tracks whether the
 * user has attempted to submit and gates error display behind that flag so a
 * pristine form never shows red text on first paint.
 *
 * Usage:
 *   const errors = validateMyForm(input);
 *   const { fieldError, handleSubmit } = useFormState(errors);
 *   // in JSX:    error={fieldError('myField') ? t('key') : undefined}
 *   // in save(): if (!handleSubmit()) { toast.error(...); return; }
 */
export function useFormState<TErrors extends Record<string, string | undefined>>(
  errors: TErrors,
): {
  submitted: boolean;
  fieldError: (key: keyof TErrors) => string | undefined;
  handleSubmit: () => boolean;
  isValid: boolean;
} {
  const [submitted, setSubmitted] = useState(false);

  const isValid = Object.values(errors).every((v) => v === undefined || v === '');

  const fieldError = (key: keyof TErrors): string | undefined =>
    submitted ? errors[key] : undefined;

  const handleSubmit = (): boolean => {
    setSubmitted(true);
    return isValid;
  };

  return { submitted, fieldError, handleSubmit, isValid };
}
