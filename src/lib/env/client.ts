import {z} from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1)
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export function getClientEnv(source: NodeJS.ProcessEnv = process.env): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  });
}
