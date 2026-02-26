/**
 * Input sanitization utilities
 * Prevents XSS attacks by escaping dangerous characters in user input
 */

/**
 * Escape HTML entities to prevent XSS in rendered content
 */
export const escapeHtml = (str: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char] || char);
};

/**
 * Sanitize a user input string:
 * - Trims whitespace
 * - Removes null bytes
 * - Limits length
 */
export const sanitizeInput = (input: string, maxLength = 5000): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/\0/g, '') // Remove null bytes
    .slice(0, maxLength);
};

/**
 * Sanitize an email address
 */
export const sanitizeEmail = (email: string): string => {
  const cleaned = sanitizeInput(email, 254);
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Sanitize a phone number
 */
export const sanitizePhone = (phone: string): string => {
  // Allow digits, spaces, dashes, parens, plus
  return sanitizeInput(phone, 20).replace(/[^\d\s\-\(\)\+]/g, '');
};
