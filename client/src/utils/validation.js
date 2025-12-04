// Form validation utilities

// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  return { valid: true, message: '' };
}

// Password validation rules
export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
];

export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: 'Password is required', strength: 0 };
  }
  
  const passedRules = passwordRules.filter(rule => rule.test(password));
  const strength = passedRules.length;
  
  if (strength < 4) {
    const failedRules = passwordRules.filter(rule => !rule.test(password));
    return { 
      valid: false, 
      message: `Password must have: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}`,
      strength 
    };
  }
  
  return { valid: true, message: '', strength };
}

export function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '', color: '' };
  
  const strength = passwordRules.filter(rule => rule.test(password)).length;
  
  if (strength <= 1) return { level: 1, label: 'Weak', color: 'text-error' };
  if (strength === 2) return { level: 2, label: 'Fair', color: 'text-warning' };
  if (strength === 3) return { level: 3, label: 'Good', color: 'text-amber-400' };
  return { level: 4, label: 'Strong', color: 'text-success' };
}

// Required field validation
export function validateRequired(value, fieldName = 'This field') {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true, message: '' };
}

// URL validation
export function validateUrl(url, required = true) {
  if (!url && !required) {
    return { valid: true, message: '' };
  }
  if (!url && required) {
    return { valid: false, message: 'URL is required' };
  }
  
  try {
    new URL(url);
    return { valid: true, message: '' };
  } catch {
    return { valid: false, message: 'Please enter a valid URL' };
  }
}

// Min length validation
export function validateMinLength(value, minLength, fieldName = 'This field') {
  if (!value || value.length < minLength) {
    return { 
      valid: false, 
      message: `${fieldName} must be at least ${minLength} characters` 
    };
  }
  return { valid: true, message: '' };
}

// Max length validation
export function validateMaxLength(value, maxLength, fieldName = 'This field') {
  if (value && value.length > maxLength) {
    return { 
      valid: false, 
      message: `${fieldName} must be no more than ${maxLength} characters` 
    };
  }
  return { valid: true, message: '' };
}

// Match validation (e.g., confirm password)
export function validateMatch(value, matchValue, fieldName = 'Values') {
  if (value !== matchValue) {
    return { valid: false, message: `${fieldName} do not match` };
  }
  return { valid: true, message: '' };
}

// Combine multiple validations
export function validateAll(...validations) {
  for (const validation of validations) {
    if (!validation.valid) {
      return validation;
    }
  }
  return { valid: true, message: '' };
}

// Form field helper - returns error state for a field
export function getFieldError(touched, error) {
  return touched && error ? error : '';
}

// Sanitize input (basic XSS prevention)
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Trim all string values in an object
export function trimFormValues(values) {
  const trimmed = {};
  for (const [key, value] of Object.entries(values)) {
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  }
  return trimmed;
}
