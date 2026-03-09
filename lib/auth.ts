// ============================================
// Auth helpers — session management, profile score
// Used by API routes and middleware
// ============================================

import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import type { Photographer } from "@/types";

// ---------- Session limits by plan tier ----------
export const SESSION_LIMITS: Record<string, number> = {
  starter: 1,
  professional: 2,
  studio: 5,
};

const DEFAULT_SESSION_LIMIT = 1;

// ---------- Get authenticated photographer ----------
export async function getAuthenticatedPhotographer(): Promise<{
  photographer: Photographer;
  authId: string;
} | null> {
  const session = await getSessionFromCookie();
  if (!session) return null;

  const admin = createSupabaseAdmin();
  const { data: photographer } = await admin
    .from("photographers")
    .select("*")
    .eq("id", session.photographerId)
    .single();

  if (!photographer) return null;

  return { photographer: photographer as Photographer, authId: session.authId };
}

// ---------- Get session limit for photographer ----------
export async function getSessionLimit(photographerId: string): Promise<number> {
  const supabase = createSupabaseAdmin();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("photographer_id", photographerId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) return DEFAULT_SESSION_LIMIT;

  const { data: plan } = await supabase
    .from("plans")
    .select("tier")
    .eq("id", subscription.plan_id)
    .single();

  if (!plan) return DEFAULT_SESSION_LIMIT;

  return SESSION_LIMITS[plan.tier] ?? DEFAULT_SESSION_LIMIT;
}

// ---------- Enforce session limit ----------
export async function enforceSessionLimit(
  photographerId: string,
  limit: number
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Get all active sessions, oldest first
  const { data: sessions } = await supabase
    .from("active_sessions")
    .select("id, created_at")
    .eq("photographer_id", photographerId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (!sessions || sessions.length < limit) return;

  // Delete oldest sessions to make room (keep limit - 1, new one will be added)
  const toDelete = sessions.slice(0, sessions.length - limit + 1);
  const idsToDelete = toDelete.map((s) => s.id);

  await supabase
    .from("active_sessions")
    .delete()
    .in("id", idsToDelete);
}

// ---------- Create active session ----------
export async function createActiveSession(
  photographerId: string,
  request: Request
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "0.0.0.0";

  // Device info from user-agent (simplified)
  const deviceInfo = parseDeviceInfo(userAgent);

  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  ).toISOString();

  const { data, error } = await supabase
    .from("active_sessions")
    .insert({
      photographer_id: photographerId,
      device_info: deviceInfo,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data.id;
}

// ---------- Profile completion score ----------
interface ProfileScoreFields {
  full_name?: string | null;
  avatar_url?: string | null;
  studio_name?: string | null;
  studio_bio?: string | null;
  studio_tagline?: string | null;
  studio_logo?: string | null;
  studio_city?: string | null;
  studio_phone?: string | null;
  studio_specializations?: string[] | null;
  has_packages?: boolean;
}

export function calculateProfileScore(fields: ProfileScoreFields): number {
  const weights: { key: keyof ProfileScoreFields; weight: number }[] = [
    { key: "full_name", weight: 10 },
    { key: "avatar_url", weight: 5 },
    { key: "studio_name", weight: 15 },
    { key: "studio_bio", weight: 10 },
    { key: "studio_tagline", weight: 5 },
    { key: "studio_logo", weight: 10 },
    { key: "studio_city", weight: 10 },
    { key: "studio_phone", weight: 10 },
    { key: "studio_specializations", weight: 10 },
    { key: "has_packages", weight: 15 },
  ];

  let earned = 0;
  const total = weights.reduce((sum, w) => sum + w.weight, 0);

  for (const { key, weight } of weights) {
    const value = fields[key];
    if (key === "studio_specializations") {
      if (Array.isArray(value) && value.length > 0) earned += weight;
    } else if (key === "has_packages") {
      if (value === true) earned += weight;
    } else if (value && typeof value === "string" && value.trim().length > 0) {
      earned += weight;
    }
  }

  return Math.round((earned / total) * 100);
}

// ---------- Slug helpers ----------
export function generateSlug(studioName: string): string {
  return studioName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("studio_profiles")
    .select("id")
    .eq("slug", slug)
    .limit(1)
    .single();

  return !data;
}

export async function generateUniqueSlug(studioName: string): Promise<string> {
  let slug = generateSlug(studioName);
  let available = await isSlugAvailable(slug);
  let suffix = 1;

  while (!available) {
    slug = `${generateSlug(studioName)}-${suffix}`;
    available = await isSlugAvailable(slug);
    suffix++;
    if (suffix > 20) {
      // Fallback: append random string
      slug = `${generateSlug(studioName)}-${Date.now().toString(36).slice(-4)}`;
      break;
    }
  }

  return slug;
}

export function isSlugLocked(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}

// ---------- Create trial subscription ----------
export async function createTrialSubscription(
  photographerId: string
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Get the starter plan
  const { data: starterPlan } = await supabase
    .from("plans")
    .select("id")
    .eq("slug", "starter")
    .single();

  if (!starterPlan) {
    console.error("[auth] Starter plan not found for trial subscription");
    return;
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day trial

  await supabase.from("subscriptions").insert({
    photographer_id: photographerId,
    plan_id: starterPlan.id,
    status: "trialing",
    billing_cycle: "monthly",
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    trial_ends_at: trialEnd.toISOString(),
  });
}

// ---------- Device info parser ----------
function parseDeviceInfo(ua: string): string {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown Device";
}
