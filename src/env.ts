import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  DEV_MODE: z.coerce.boolean().default(false),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().default(""),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !skipValidation) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data as z.infer<typeof envSchema> & {
  DATABASE_URL: string;
  NEXTAUTH_SECRET: string;
};
