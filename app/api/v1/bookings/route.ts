// ============================================
// GET /api/v1/bookings — List bookings (filtered, sorted, paginated)
// POST /api/v1/bookings — Create a new booking
// ============================================

import { NextRequest } from "next/server";
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

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /bookings] DB error:", error.message);
      return serverErrorResponse("Failed to fetch bookings");
    }

    return successResponse({
      items: data || [],
      total: count || 0,
      page: filters.page,
      limit: filters.limit,
      hasMore: (count || 0) > offset + filters.limit,
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

    return successResponse(booking, 201);
  } catch (err) {
    console.error("[POST /bookings] Unexpected error:", err);
    return serverErrorResponse();
  }
}
