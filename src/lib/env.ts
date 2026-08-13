import { z } from 'zod';

// Parsing happens only inside validateEnv() (called at runtime startup), never at import time,
// so the production build stays decoupled from runtime configuration.
const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, 'is required')
      .refine((v) => v.startsWith('postgres'), 'must be a PostgreSQL connection string (postgres://…)'),
    AUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'azure']).default('local'),
    AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
    AZURE_STORAGE_CONTAINER: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    EMAIL_FROM: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
    AZURE_OPENAI_API_VERSION: z.string().optional(),
    AI_MODEL_VERSION: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_SECRET'],
        message: 'is required in production and must be at least 32 characters',
      });
    }
    if (isProd && !env.NEXTAUTH_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['NEXTAUTH_URL'],
        message: 'is required in production',
      });
    }

    if (env.STORAGE_PROVIDER === 'azure') {
      if (!env.AZURE_STORAGE_CONNECTION_STRING) {
        ctx.addIssue({
          code: 'custom',
          path: ['AZURE_STORAGE_CONNECTION_STRING'],
          message: 'is required when STORAGE_PROVIDER=azure',
        });
      }
      if (!env.AZURE_STORAGE_CONTAINER) {
        ctx.addIssue({
          code: 'custom',
          path: ['AZURE_STORAGE_CONTAINER'],
          message: 'is required when STORAGE_PROVIDER=azure',
        });
      }
    }

    const aiKeys = [env.AZURE_OPENAI_ENDPOINT, env.AZURE_OPENAI_API_KEY, env.AZURE_OPENAI_DEPLOYMENT];
    const someAi = aiKeys.some(Boolean);
    const allAi = aiKeys.every(Boolean);
    if (someAi && !allAi) {
      ctx.addIssue({
        code: 'custom',
        path: ['AZURE_OPENAI_ENDPOINT'],
        message:
          'AI validation requires AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT to be set together',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Validates process.env once and reports every problem in a single, readable error.
export function validateEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}
