/**
 * Email validation utility
 * Validates email format using a standard regex pattern
 * 
 * @param email - The email address to validate
 * @returns boolean - True if email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}; 