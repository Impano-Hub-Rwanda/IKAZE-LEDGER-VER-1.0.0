/** Generic validation return type — a string error or empty when valid. */
export type FieldError = string | undefined;

export function required(value: string): FieldError {
  return value.trim().length === 0 ? 'This field is required' : undefined;
}

export function minLength(value: string, min: number): FieldError {
  return value.length < min ? `Must be at least ${min} characters` : undefined;
}

export function maxLength(value: string, max: number): FieldError {
  return value.length > max ? `Must be at most ${max} characters` : undefined;
}

export function isEmail(value: string): FieldError {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !re.test(value) ? 'Invalid email address' : undefined;
}

export function isPhone(value: string): FieldError {
  const clean = value.replace(/[\s-]/g, '');
  const re = /^\+?\d{8,15}$/;
  return !re.test(clean) ? 'Invalid phone number' : undefined;
}

/** No-op validator used as a placeholder when a field is optional. */
export function optional(_value: string): FieldError {
  return undefined;
}

/** Validates that a value parses to a non-negative number. */
export function isNonNegativeNumber(value: string): FieldError {
  if (value.trim().length === 0) return 'This field is required';
  const n = Number(value);
  return Number.isNaN(n) || n < 0 ? 'Enter a valid number' : undefined;
}

/** Validates that a value parses to a positive integer. */
export function isPositiveInteger(value: string): FieldError {
  if (value.trim().length === 0) return 'This field is required';
  const n = Number(value);
  return Number.isNaN(n) || !Number.isInteger(n) || n < 0 ? 'Enter a whole number' : undefined;
}

export function passwordsMatch(a: string, b: string): FieldError {
  return a !== b ? 'Passwords do not match' : undefined;
}

/** Runs a list of validators on a value and returns the first error encountered. */
export function validate(value: string, ...validators: ((v: string) => FieldError)[]): FieldError {
  for (const v of validators) {
    const err = v(value);
    if (err) return err;
  }
  return undefined;
}
