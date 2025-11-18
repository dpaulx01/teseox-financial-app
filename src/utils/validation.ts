/**
 * Validation utilities for forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export const validateSlug = (slug: string): string | null => {
  if (!slug) return null;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return 'Slug solo puede contener letras minúsculas, números y guiones';
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return 'Slug no puede comenzar o terminar con guión';
  }

  if (slug.includes('--')) {
    return 'Slug no puede contener guiones consecutivos';
  }

  return null;
};

export const validateUsername = (username: string): string | null => {
  if (!username || !username.trim()) {
    return 'El username es requerido';
  }

  if (username.trim().length < 3) {
    return 'El username debe tener al menos 3 caracteres';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'El username solo puede contener letras, números, guiones y guiones bajos';
  }

  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return 'El email es requerido';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email inválido';
  }

  return null;
};

export const validatePassword = (password: string, isRequired: boolean = true): string | null => {
  if (!password) {
    return isRequired ? 'El password es requerido' : null;
  }

  if (password.length < 6) {
    return 'El password debe tener al menos 6 caracteres';
  }

  return null;
};

export const validateCompanyName = (name: string): string | null => {
  if (!name || !name.trim()) {
    return 'El nombre de la empresa es requerido';
  }

  if (name.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }

  return null;
};

export const validateMaxUsers = (maxUsers: number): string | null => {
  if (maxUsers < 1) {
    return 'max_users debe ser al menos 1';
  }

  if (maxUsers > 10000) {
    return 'max_users no puede exceder 10000';
  }

  return null;
};
