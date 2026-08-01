import { z } from "zod";

const lineSchema = z.object({
  LINE_CHANNEL_SECRET: z.string().min(1),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
  LINE_CHANNEL_ID: z.string().optional(),
  LIFF_ID: z.string().optional(),
});

const openaiSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
});

/** Fix common Vercel paste mistakes before URL validation. */
export function normalizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  // Users sometimes paste API URL with /rest/v1 or a trailing slash
  u = u.replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1$/i, "");
  u = u.replace(/\/+$/, "");
  // Project ref without scheme
  if (!/^https?:\/\//i.test(u) && /^[a-z0-9-]+\.supabase\.co$/i.test(u)) {
    u = `https://${u}`;
  }
  return u;
}

const supabaseSchema = z.object({
  SUPABASE_URL: z.preprocess(
    (v) => (typeof v === "string" ? normalizeSupabaseUrl(v) : v),
    z.string().url(),
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().optional(),
});

const newebpaySchema = z.object({
  NEWEBPAY_MERCHANT_ID: z.string().min(1),
  NEWEBPAY_HASH_KEY: z.string().min(1),
  NEWEBPAY_HASH_IV: z.string().min(1),
  NEWEBPAY_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
  NEWEBPAY_GATEWAY_URL: z.string().url().optional(),
});

const appSchema = z.object({
  PUBLIC_BASE_URL: z.string().url(),
  MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(5_242_880),
  SUPPORT_EMAIL: z.string().email().optional(),
  TZ: z.string().default("Asia/Taipei"),
});

const envSchema = lineSchema
  .merge(openaiSchema)
  .merge(supabaseSchema)
  .merge(newebpaySchema)
  .merge(appSchema);

export type AppEnv = z.infer<typeof envSchema>;
export type LineEnv = z.infer<typeof lineSchema>;
export type OpenAIEnv = z.infer<typeof openaiSchema>;
export type SupabaseEnv = z.infer<typeof supabaseSchema>;
export type NewebpayEnv = z.infer<typeof newebpaySchema>;
export type AppOnlyEnv = z.infer<typeof appSchema>;

export type EnvConfigStatus = {
  line: boolean;
  openai: boolean;
  supabase: boolean;
  newebpay: boolean;
};

let cachedFull: AppEnv | null = null;
let cachedLine: LineEnv | null = null;
let cachedOpenAI: OpenAIEnv | null = null;
let cachedSupabase: SupabaseEnv | null = null;
let cachedNewebpay: NewebpayEnv | null = null;
let cachedApp: AppOnlyEnv | null = null;

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}

function parseOrThrow<T>(schema: z.ZodTypeAny, label: string): T {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid ${label} environment variables: ${formatIssues(parsed.error)}`,
    );
  }
  return parsed.data as T;
}

export function clearEnvCache(): void {
  cachedFull = null;
  cachedLine = null;
  cachedOpenAI = null;
  cachedSupabase = null;
  cachedNewebpay = null;
  cachedApp = null;
}

/** LINE Messaging API only — enough for webhook verify / reply / content download. */
export function getLineEnv(): LineEnv {
  if (cachedLine) return cachedLine;
  cachedLine = parseOrThrow<LineEnv>(lineSchema, "LINE");
  return cachedLine;
}

export function getOpenAIEnv(): OpenAIEnv {
  if (cachedOpenAI) return cachedOpenAI;
  cachedOpenAI = parseOrThrow<OpenAIEnv>(openaiSchema, "OpenAI");
  return cachedOpenAI;
}

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedSupabase) return cachedSupabase;
  cachedSupabase = parseOrThrow<SupabaseEnv>(supabaseSchema, "Supabase");
  return cachedSupabase;
}

export function getNewebpayEnv(): NewebpayEnv {
  if (cachedNewebpay) return cachedNewebpay;
  cachedNewebpay = parseOrThrow<NewebpayEnv>(newebpaySchema, "NewebPay");
  return cachedNewebpay;
}

export function getAppOnlyEnv(): AppOnlyEnv {
  if (cachedApp) return cachedApp;
  cachedApp = parseOrThrow<AppOnlyEnv>(appSchema, "app");
  return cachedApp;
}

/** Full stack — use when a feature truly needs every integration. */
export function getEnv(): AppEnv {
  if (cachedFull) return cachedFull;
  cachedFull = parseOrThrow<AppEnv>(envSchema, "application");
  return cachedFull;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function supabaseUrlLooksValid(): boolean {
  const raw = process.env.SUPABASE_URL;
  if (!nonEmpty(raw)) return false;
  try {
    const normalized = normalizeSupabaseUrl(raw!);
    new URL(normalized);
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized);
  } catch {
    return false;
  }
}

/** Soft presence flags for health — booleans only, never values. */
export function getEnvConfigStatus(): EnvConfigStatus {
  return {
    line:
      nonEmpty(process.env.LINE_CHANNEL_SECRET) &&
      nonEmpty(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    openai: nonEmpty(process.env.OPENAI_API_KEY),
    supabase:
      supabaseUrlLooksValid() &&
      nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY),
    newebpay:
      nonEmpty(process.env.NEWEBPAY_MERCHANT_ID) &&
      nonEmpty(process.env.NEWEBPAY_HASH_KEY) &&
      nonEmpty(process.env.NEWEBPAY_HASH_IV),
  };
}

/** Soft read for health checks — does not throw on missing secrets. */
export function peekNewebpayMode(): "sandbox" | "production" | "unset" {
  const mode = process.env.NEWEBPAY_MODE;
  if (mode === "sandbox" || mode === "production") return mode;
  return "unset";
}
