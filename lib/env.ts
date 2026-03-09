// ============================================
// Environment variable validation
// Import early in app — fails fast if missing
// ============================================

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "AISENSY_API_KEY",
  "MSG91_AUTH_KEY",
] as const;

const requiredPublic = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
  return value;
}

function getPublicEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing public environment variable: ${key}`);
  }
  return value;
}

export const env = {
  // Supabase
  supabaseUrl: getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // Cloudflare R2
  r2AccountId: getEnv("R2_ACCOUNT_ID"),
  r2AccessKeyId: getEnv("R2_ACCESS_KEY_ID"),
  r2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
  r2BucketName: getEnv("R2_BUCKET_NAME"),
  r2PublicUrl: process.env.R2_PUBLIC_URL || "",

  // Razorpay
  razorpayKeyId: getEnv("RAZORPAY_KEY_ID"),
  razorpayKeySecret: getEnv("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET"),

  // AiSensy (WhatsApp)
  aisensyApiKey: getEnv("AISENSY_API_KEY"),
  aisensyBaseUrl:
    process.env.AISENSY_BASE_URL ||
    "https://backend.aisensy.com/campaign/t1/api/v2",

  // MSG91 (SMS)
  msg91AuthKey: getEnv("MSG91_AUTH_KEY"),
  msg91SenderId: process.env.MSG91_SENDER_ID || "PIXOVA",
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || "",

  // App
  appUrl: getPublicEnv("NEXT_PUBLIC_APP_URL"),
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Pixova",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",
} as const;

/** Validate all required env vars exist — call at app startup */
export function validateEnv(): void {
  const missing: string[] = [];
  for (const key of requiredServer) {
    if (!process.env[key]) missing.push(key);
  }
  for (const key of requiredPublic) {
    if (!process.env[key]) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}`
    );
  }
}
