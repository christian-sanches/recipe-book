import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_SECRET: z.string(),
    NEXTAUTH_URL: z.string().url().optional(),
    DEV_MODE: z.coerce.boolean().default(false),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    ADMIN_EMAILS: z.string().default(""),
  },
  client: {
    NEXT_PUBLIC_DEV_MODE: z.coerce.boolean().default(false),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DEV_MODE: process.env.DEV_MODE,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    NEXT_PUBLIC_DEV_MODE: process.env.DEV_MODE,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
