import { handleError } from './errorHandler';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  maxLength: 128,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumber: true,
  requiresSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  disallowedSequences: ['123', 'abc', 'qwerty', 'password'],
  maxRepeats: 3,
  maxSequentialChars: 3
};

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  // Check length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters`);
  }

  // Check character requirements
  if (PASSWORD_REQUIREMENTS.requiresUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requiresLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (PASSWORD_REQUIREMENTS.requiresNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (PASSWORD_REQUIREMENTS.requiresSpecialChar && !/[!@#$%^&*()_+-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for disallowed sequences
  for (const sequence of PASSWORD_REQUIREMENTS.disallowedSequences) {
    if (password.toLowerCase().includes(sequence.toLowerCase())) {
      errors.push(`Password cannot contain the sequence: ${sequence}`);
    }
  }

  // Check for repeated characters
  const charCounts = new Map<string, number>();
  for (const char of password) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }
  for (const [char, count] of charCounts) {
    if (count > PASSWORD_REQUIREMENTS.maxRepeats) {
      errors.push(`Password cannot have more than ${PASSWORD_REQUIREMENTS.maxRepeats} of the same character in a row`);
    }
  }

  // Check for sequential characters
  for (let i = 0; i < password.length - PASSWORD_REQUIREMENTS.maxSequentialChars; i++) {
    const substring = password.substring(i, i + PASSWORD_REQUIREMENTS.maxSequentialChars);
    if (isSequential(substring)) {
      errors.push('Password cannot contain sequential characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to check if characters are sequential
const isSequential = (str: string): boolean => {
  const chars = str.split('');
  for (let i = 0; i < chars.length - 1; i++) {
    const currentCharCode = chars[i].charCodeAt(0);
    const nextCharCode = chars[i + 1].charCodeAt(0);
    if (Math.abs(nextCharCode - currentCharCode) === 1) {
      return true;
    }
  }
  return false;
};

// Password history management
interface PasswordHistory {
  [userId: string]: string[];
}

const passwordHistory: PasswordHistory = {};

export const addPasswordToHistory = (userId: string, password: string): void => {
  if (!passwordHistory[userId]) {
    passwordHistory[userId] = [];
  }
  passwordHistory[userId].push(password);
  // Keep only last 5 passwords
  if (passwordHistory[userId].length > 5) {
    passwordHistory[userId].shift();
  }
};

export const checkPasswordHistory = (userId: string, password: string): boolean => {
  const history = passwordHistory[userId] || [];
  return !history.includes(password);
};
