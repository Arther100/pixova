// ============================================
// POST /api/v1/agreements/generate/[bookingId]
// Generate agreement snapshot for a confirmed booking
// PDF is generated lazily on first download (see /pdf route)
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/api-helpers";
import { deleteFromR2 } from "@/lib/r2";
import {
  generateAgreementRef,
  DEFAULT_CANCELLATION_POLICY,
  formatEventType,
} from "@/lib/agreements";
import type { AgreementSnapshot } from "@/types";

interface Params {
  params: { bookingId: string };
}

// Typed booking result from the query
interface BookingResult {
  id: string;
  booking_ref: string | null;
  event_type: string | null;
  event_date: string | null;
  event_end_date: string | null;
  venue: string | null;
  city: string | null;
  status: string;
  total_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  notes: string | null;
  client: { id: string; name: string; phone: string; email: string | null };
  package: { id: string; name: string; deliverables: string | null; price: number } | null;
}

interface StudioResult {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  gstin: string | null;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const supabase = createSupabaseAdmin();

    // 1. Fetch booking with client + package joins
    const { data: rawBooking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        client:clients!inner(id, name, phone, email),
        package:studio_packages(id, name, deliverables, price)
      `)
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (fetchError || !rawBooking) {
      return notFoundResponse("Booking not found");
    }

    const booking = rawBooking as unknown as BookingResult;

    // 2. Fetch studio profile
    const { data: rawStudio, error: studioError } = await supabase
      .from("studio_profiles")
      .select("id, name, slug, phone, email, address_line, city, state, gstin")
      .eq("photographer_id", session.photographerId)
      .single();

    if (studioError || !rawStudio) {
      console.error("[POST /agreements/generate] Studio fetch error:", studioError?.message);
      return notFoundResponse("Studio not found");
    }

    const studio = rawStudio as unknown as StudioResult;

    // 3. Validate status
    const allowedStatuses = ["confirmed", "in_progress", "delivered", "completed"];
    if (!allowedStatuses.includes(booking.status)) {
      if (booking.status === "enquiry") {
        return errorResponse("Confirm the booking before generating agreement");
      }
      return errorResponse("Cannot generate agreement for cancelled booking");
    }

    // 4. Check existing agreement
    const { data: existingAgreement } = await supabase
      .from("agreements")
      .select("agreement_id, client_viewed_at, pdf_r2_key")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingAgreement) {
      if (existingAgreement.client_viewed_at) {
        return NextResponse_conflict({
          code: "ALREADY_VIEWED",
          message: "Client has already viewed this agreement. Cannot regenerate.",
        });
      }
      // Delete old agreement + PDF
      if (existingAgreement.pdf_r2_key) {
        try {
          await deleteFromR2(existingAgreement.pdf_r2_key);
        } catch {
          // non-critical
        }
      }
      await supabase
        .from("agreements")
        .delete()
        .eq("agreement_id", existingAgreement.agreement_id);
    }

    // 5. Get cancellation policy
    const { data: policyRow } = await supabase
      .from("cancellation_policies")
      .select("policy_text")
      .eq("studio_id", studio.id)
      .maybeSingle();

    const cancellationPolicy = policyRow?.policy_text || DEFAULT_CANCELLATION_POLICY;

    // 6. Generate agreement ref
    const agreementRef = await generateAgreementRef(supabase, studio.id, studio.name);

    // 7. Build snapshot
    const snapshot: AgreementSnapshot = {
      agreement_ref: agreementRef,
      generated_at: new Date().toISOString(),
      studio_name: studio.name,
      studio_address: studio.address_line || null,
      studio_mobile: studio.phone || null,
      studio_city: studio.city || "",
      gstin: studio.gstin || null,
      client_name: booking.client.name,
      client_mobile: booking.client.phone,
      client_email: booking.client.email || null,
      booking_ref: booking.booking_ref || bookingId.slice(0, 8).toUpperCase(),
      event_type: formatEventType(booking.event_type),
      event_date: booking.event_date || "",
      event_end_date: booking.event_end_date || null,
      venue_name: booking.venue || null,
      venue_city: booking.city || null,
      package_name: booking.package?.name || null,
      package_inclusions: booking.package?.deliverables || null,
      total_amount: booking.total_amount,
      advance_paid: booking.paid_amount || booking.advance_amount || 0,
      balance_amount: booking.balance_amount,
      cancellation_policy: cancellationPolicy,
      notes: booking.notes || null,
    };

    // 8. Insert agreement record (PDF generated lazily on download)
    const agreementId = crypto.randomUUID();

    const { data: agreement, error: insertError } = await supabase
      .from("agreements")
      .insert({
        agreement_id: agreementId,
        booking_id: bookingId,
        studio_id: studio.id,
        agreement_ref: agreementRef,
        agreement_data: JSON.parse(JSON.stringify(snapshot)),
        status: "GENERATED",
      })
      .select("agreement_id, agreement_ref, status, generated_at")
      .single();

    if (insertError || !agreement) {
      console.error("[POST /agreements/generate] Insert error:", JSON.stringify(insertError));
      return errorResponse(
        `Failed to save agreement: ${insertError?.message || "unknown"}`,
        500
      );
    }

    return successResponse({
      agreement: {
        ...agreement,
        booking_ref: snapshot.booking_ref,
      },
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /agreements/generate] Unexpected error:", message);
    return errorResponse(`Agreement generation failed: ${message}`, 500);
  }
}

// Helper for 409 response
function NextResponse_conflict(data: { code: string; message: string }) {
  return NextResponse.json(
    { success: false, error: data.message, code: data.code },
    { status: 409 }
  );
}
