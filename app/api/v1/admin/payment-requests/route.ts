// GET /api/v1/admin/payment-requests
// Returns subscription payment requests for the admin dashboard.
// Only accessible to the admin phone number.

export const dynamic = "force-dynamic";

import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

async function isAdmin(photographerId: string): Promise<boolean> {
  const adminPhone = (process.env.ADMIN_PHONE || "918778667396").replace(/\D/g, "");
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("studio_profiles")
    .select("phone")
    .eq("photographer_id", photographerId)
    .single();
  if (!data?.phone) return false;
  const phone = data.phone.replace(/\D/g, "");
  return phone === adminPhone || phone === adminPhone.slice(2); // with or without 91
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();
    if (!(await isAdmin(session.photographerId))) return unauthorizedResponse();

    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from("subscription_payment_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return serverErrorResponse();

    // Cast — table not yet in generated Supabase types
    return successResponse({ requests: (data ?? []) as unknown[] });
  } catch (err) {
    console.error("[admin/payment-requests]", err);
    return serverErrorResponse();
  }
}
