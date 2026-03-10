// ============================================
// GET /api/v1/bookings — List bookings (filtered, sorted, paginated)
// POST /api/v1/bookings — Create a new booking
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import {
  createBookingSchema,
  bookingFilterSchema,
} from "@/lib/validations";
import { normalizePhone } from "@/utils/phone";

// ── GET: List bookings with filters ──
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { searchParams } = request.nextUrl;
    const rawFilters = Object.fromEntries(searchParams.entries());
    const parsed = bookingFilterSchema.safeParse(rawFilters);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid filters");
    }

    const filters = parsed.data;
    const supabase = createSupabaseAdmin();
    const offset = (filters.page - 1) * filters.limit;

    // Build query — join client data
    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        client:clients!inner(id, name, phone, email, whatsapp)
      `,
        { count: "exact" }
      )
      .eq("photographer_id", session.photographerId);

    // ── Apply filters ──
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.dateFrom) {
      query = query.gte("event_date", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("event_date", filters.dateTo);
    }

    if (filters.eventType) {
      query = query.eq("event_type", filters.eventType);
    }

    // ── Search: client name, client phone, or booking_ref ──
    if (filters.search) {
      const s = filters.search.trim();
      // Check if search looks like a booking ref (PX prefix)
      if (s.toUpperCase().startsWith("PX")) {
        query = query.ilike("booking_ref", `%${s}%`);
      } else {
        // Search in client name or phone
        const normalizedSearch = s.replace(/\D/g, "");
        if (normalizedSearch.length >= 10) {
          // Looks like a phone number
          const phone10 = normalizedSearch.length === 12 && normalizedSearch.startsWith("91")
            ? normalizedSearch.slice(2)
            : normalizedSearch;
          query = query.eq("client.phone", phone10);
        } else {
          query = query.ilike("client.name", `%${s}%`);
        }
      }
    }

    // ── Sort ──
    const sortColumn = filters.sortBy;
    const ascending = filters.sortOrder === "asc";
    query = query.order(sortColumn, { ascending }).range(offset, offset + filters.limit - 1);

    // Run bookings query and quota query in parallel
    const [bookingsResult, subResult] = await Promise.all([
      query,
      supabase
        .from("subscriptions")
        .select("id, bookings_this_cycle, current_period_end, plan_id")
        .eq("photographer_id", session.photographerId)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const { data, error, count } = bookingsResult;

    if (error) {
      console.error("[GET /bookings] DB error:", error.message);
      return serverErrorResponse("Failed to fetch bookings");
    }

    const subData = subResult.data;
    let quotaLimit = -1;
    if (subData?.plan_id) {
      const { data: quotaPlan } = await supabase
        .from("plans")
        .select("booking_limit")
        .eq("id", subData.plan_id)
        .single();
      quotaLimit = quotaPlan?.booking_limit ?? -1;
    }

    return successResponse({
      items: data || [],
      total: count || 0,
      page: filters.page,
      limit: filters.limit,
      hasMore: (count || 0) > offset + filters.limit,
      quota: {
        used: subData?.bookings_this_cycle ?? 0,
        limit: quotaLimit,
        resetDate: subData?.current_period_end ?? null,
      },
    });
  } catch (err) {
    console.error("[GET /bookings] Unexpected error:", err);
    return serverErrorResponse();
  }
}

// ── POST: Create a booking ──
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Invalid input");
    }

    const data = parsed.data;

    // ── Validate: advance ≤ total ──
    if (data.advanceAmount > data.totalAmount) {
      return errorResponse("Advance amount cannot exceed total amount");
    }

    // ── Validate: event_date must be in the future ──
    if (data.eventDate) {
      const eventDateObj = new Date(data.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDateObj < today) {
        return errorResponse("Event date must be today or in the future");
      }
    }

    // ── Validate: event_end_date ≥ event_date ──
    if (data.eventDate && data.eventEndDate) {
      if (new Date(data.eventEndDate) < new Date(data.eventDate)) {
        return errorResponse("End date must be on or after start date");
      }
    }

    const supabase = createSupabaseAdmin();

    // --- QUOTA CHECK ---
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, bookings_this_cycle, status, plan_id")
      .eq("photographer_id", session.photographerId)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SUBSCRIPTION_INACTIVE",
            message:
              "Your subscription is inactive. Please reactivate to add bookings.",
          },
        },
        { status: 403 }
      );
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("booking_limit, overage_enabled, overage_price")
      .eq("id", subscription.plan_id)
      .single();

    const bookingLimit = plan?.booking_limit ?? -1;
    const usedCount = subscription.bookings_this_cycle ?? 0;

    // -1 = unlimited (Studio plan)
    if (bookingLimit !== -1 && usedCount >= bookingLimit) {
      if (plan?.overage_enabled) {
        if (!data.confirmOverage) {
          const overageRupees = Math.round((plan.overage_price ?? 0) / 100);
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "OVERAGE_REQUIRED",
                message: `You have used all ${bookingLimit} bookings this cycle. This booking costs ₹${overageRupees} extra.`,
                requiresOverage: true,
                overageAmount: plan.overage_price,
                used: usedCount,
                limit: bookingLimit,
              },
            },
            { status: 402 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "QUOTA_EXCEEDED",
              message: `You have reached your ${bookingLimit} booking limit for this cycle. Upgrade your plan to add more.`,
              used: usedCount,
              limit: bookingLimit,
            },
          },
          { status: 429 }
        );
      }
    }
    // --- END QUOTA CHECK ---

    const phone = normalizePhone(data.clientMobile);

    // ── Check event_date conflicts with calendar_blocks ──
    if (data.eventDate) {
      const { data: blocks } = await supabase
        .from("calendar_blocks")
        .select("id, title")
        .eq("photographer_id", session.photographerId)
        .lte("start_date", data.eventDate)
        .gte("end_date", data.eventDate);

      if (blocks && blocks.length > 0) {
        return errorResponse(
          `Date conflict: ${data.eventDate} overlaps with "${blocks[0].title}". Please choose another date.`
        );
      }
    }

    // ── Client upsert: find existing by phone or create new ──
    let clientId: string;

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("photographer_id", session.photographerId)
      .eq("phone", phone)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
      // Update name/email if provided (don't overwrite with empty)
      const updateFields: Record<string, unknown> = {};
      if (data.clientName) updateFields.name = data.clientName;
      if (data.clientEmail) updateFields.email = data.clientEmail;
      if (Object.keys(updateFields).length > 0) {
        await supabase.from("clients").update(updateFields).eq("id", clientId);
      }
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          photographer_id: session.photographerId,
          name: data.clientName,
          phone,
          email: data.clientEmail || null,
          whatsapp: phone, // default WhatsApp same as phone
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        console.error("[POST /bookings] Client creation error:", clientError?.message);
        return serverErrorResponse("Failed to create client");
      }
      clientId = newClient.id;
    }

    // ── Generate booking_ref: PX{NNNN}-{YYYY} ──
    const year = new Date().getFullYear();
    const { data: lastBooking } = await supabase
      .from("bookings")
      .select("booking_ref")
      .eq("photographer_id", session.photographerId)
      .not("booking_ref", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1;
    if (lastBooking?.booking_ref) {
      const match = lastBooking.booking_ref.match(/PX(\d+)-/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const bookingRef = `PX${String(nextNum).padStart(4, "0")}-${year}`;

    // ── Insert booking ──
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        photographer_id: session.photographerId,
        client_id: clientId,
        package_id: data.packageId || null,
        booking_ref: bookingRef,
        title: data.title,
        event_type: data.eventType || null,
        event_date: data.eventDate || null,
        event_end_date: data.eventEndDate || null,
        event_time: data.eventTime || null,
        venue: data.venue || null,
        venue_address: data.venueAddress || null,
        city: data.city || null,
        status: "enquiry",
        total_amount: data.totalAmount,
        advance_amount: data.advanceAmount ?? 0,
        notes: data.notes || null,
        internal_notes: data.internalNotes || null,
        team_members: data.teamMembers || [],
      })
      .select(
        `
        *,
        client:clients!inner(id, name, phone, email, whatsapp)
      `
      )
      .single();

    if (bookingError || !booking) {
      console.error("[POST /bookings] Insert error:", bookingError?.message);
      return serverErrorResponse("Failed to create booking");
    }

    // --- WRITE CALENDAR BLOCK ---
    if (booking && data.eventDate) {
      const bookingRecord = booking as Record<string, unknown>;
      await supabase.from("calendar_blocks").insert({
        photographer_id: session.photographerId,
        title: data.title,
        start_date: data.eventDate,
        end_date: data.eventEndDate || data.eventDate,
        status: "ENQUIRY",
        source: "BOOKING",
        booking_id: bookingRecord.id as string,
      });
    }
    // --- END CALENDAR BLOCK ---

    // --- INCREMENT QUOTA COUNTER ---
    if (subscription) {
      await supabase
        .from("subscriptions")
        .update({
          bookings_this_cycle: (subscription.bookings_this_cycle ?? 0) + 1,
        })
        .eq("id", subscription.id);
    }
    // --- END INCREMENT QUOTA ---

    return successResponse(booking, 201);
  } catch (err) {
    console.error("[POST /bookings] Unexpected error:", err);
    return serverErrorResponse();
  }
}
