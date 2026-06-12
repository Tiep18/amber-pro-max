import {z} from 'zod';
import {locales} from '@/i18n/routing';

const localeSchema = z.enum(locales).default('vi');
const nextSchema = z.string().optional();
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    locale: localeSchema,
    next: nextSchema
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwords_must_match'
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  locale: localeSchema,
  next: nextSchema
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
  locale: localeSchema
});

export const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
    locale: localeSchema,
    next: nextSchema
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwords_must_match'
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;
