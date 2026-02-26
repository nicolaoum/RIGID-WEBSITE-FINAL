/**
 * Input sanitization utilities for Lambda functions.
 *
 * SECURITY: All user-supplied input should be sanitized before storage or display
 * to prevent XSS, injection attacks, and data corruption.
 */

/**
 * Strip HTML tags from a string to prevent stored XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a generic text input: trim, strip HTML, limit length.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).trim().slice(0, maxLength);
}

/**
 * Sanitize an email address: lowercase, trim, basic format check.
 * Returns null if the email is clearly invalid.
 */
export function sanitizeEmail(input: string): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  // Basic email regex — not exhaustive but catches obvious junk
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return null;
  if (trimmed.length > 320) return null; // RFC 5321 max length
  return trimmed;
}

/**
 * Sanitize a phone number: keep only digits, +, -, spaces, parens.
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\d+\-() ]/g, '').trim().slice(0, 30);
}

/**
 * Validate and sanitize a priority value against allowed values.
 */
export function sanitizeEnum<T extends string>(input: string, allowed: T[]): T | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase() as T;
  return allowed.includes(trimmed) ? trimmed : null;
}
