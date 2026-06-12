import {describe, expect, it} from 'vitest';
import {
  passwordResetRequestSchema,
  passwordUpdateSchema,
  registerSchema,
  signInSchema
} from '@/auth/schemas';

describe('auth schemas', () => {
  it('accepts valid registration input', () => {
    const result = registerSchema.safeParse({
      email: 'maker@example.com',
      password: 'secure-password-123',
      confirmPassword: 'secure-password-123',
      locale: 'en',
      next: '/en/account'
    });

    expect(result.success).toBe(true);
  });

  it('rejects registration when passwords do not match', () => {
    const result = registerSchema.safeParse({
      email: 'maker@example.com',
      password: 'secure-password-123',
      confirmPassword: 'different-password-123',
      locale: 'en'
    });

    expect(result.success).toBe(false);
  });

  it('normalizes email and locale defaults for sign in', () => {
    const result = signInSchema.parse({
      email: '  MAKER@EXAMPLE.COM ',
      password: 'secure-password-123'
    });

    expect(result).toMatchObject({
      email: 'maker@example.com',
      locale: 'vi'
    });
  });

  it('accepts reset requests without exposing account existence', () => {
    expect(passwordResetRequestSchema.safeParse({email: 'person@example.com', locale: 'vi'}).success).toBe(
      true
    );
  });

  it('requires a confirmed new password for updates', () => {
    const result = passwordUpdateSchema.safeParse({
      password: 'secure-password-123',
      confirmPassword: 'secure-password-123',
      locale: 'en'
    });

    expect(result.success).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(signInSchema.safeParse({email: 'maker@example.com', password: 'short'}).success).toBe(false);
  });
});
