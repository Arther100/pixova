// ============================================
// POST /api/v1/enquiries — Submit new enquiry
// Auth: pixova_account_session cookie (set after OTP verify)
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, serverErrorResponse } from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientAccountSession } from '@/lib/clientAuth';
import { notifyNewEnquiry, notifyEnquirySent } from '@/lib/whatsapp';

const enquirySchema = z.object({
  client_name:    z.string().min(2).max(100),
  client_phone:   z.string().min(10).max(15),
  client_email:   z.string().email().nullable().optional(),
  event_type:     z.string().min(1).max(100),
  event_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  event_city:     z.string().min(1).max(100),
  venue_name:     z.string().max(200).nullable().optional(),
  budget_min:     z.number().nonnegative().nullable().optional(),
  budget_max:     z.number().nonnegative().nullable().optional(),
  guest_count:    z.number().int().nonnegative().nullable().optional(),
  message:        z.string().max(500).nullable().optional(),
  studio_ids:     z.array(z.string().uuid()).min(1).max(5),
  // otp is optional — only used if no active session
  otp:            z.string().length(6).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const data = parsed.data;
    const supabase = createSupabaseAdmin();

    // ── 1. Auth: use account session cookie (set after OTP verify) ──
    const session = await getClientAccountSession();
    if (!session) {
      return errorResponse('Please log in to submit an enquiry', 401);
    }

    // ── 2. Get client account ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account } = await (supabase.from('client_accounts') as any)
      .select('*')
      .eq('account_id', session.accountId)
      .single();

    if (!account) {
      return errorResponse('Account not found. Please log in again.', 401);
    }

    // Update last_login_at
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('client_accounts') as any)
      .update({ last_login_at: new Date().toISOString() })
      .eq('account_id', account.account_id);

    // ── 3. Validate studio IDs ──
    const { data: studios, error: studiosError } = await supabase
      .from('studio_profiles')
      .select('id, name, phone, photographer_id')
      .in('id', data.studio_ids)
      .eq('is_listed', true);

    if (studiosError || !studios || studios.length !== data.studio_ids.length) {
      return errorResponse('One or more studios not found or not listed', 400);
    }

    // ── 4. Insert enquiry ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry, error: enquiryError } = await (supabase.from('enquiries') as any)
      .insert({
        account_id:    account?.account_id || null,
        client_name:   data.client_name,
        client_phone:  data.client_phone,
        client_email:  data.client_email || null,
        event_type:    data.event_type,
        event_date:    data.event_date,
        event_end_date: data.event_end_date || null,
        event_city:    data.event_city,
        venue_name:    data.venue_name || null,
        budget_min:    data.budget_min || null,
        budget_max:    data.budget_max || null,
        guest_count:   data.guest_count || null,
        message:       data.message || null,
      })
      .select()
      .single();

    if (enquiryError || !enquiry) {
      console.error('[enquiries] insert error:', enquiryError);
      return serverErrorResponse();
    }

    // ── 5. Insert enquiry_studios rows ──
    const studioRows = studios.map((s: { id: string }) => ({
      enquiry_id: enquiry.enquiry_id,
      studio_id: s.id,
      status: 'PENDING',
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('enquiry_studios') as any).insert(studioRows);

    // ── 6. Notify photographers via WhatsApp ──
    const eventDate = new Date(data.event_date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const budgetStr = data.budget_min && data.budget_max
      ? `₹${Math.round(data.budget_min / 100).toLocaleString('en-IN')} - ₹${Math.round(data.budget_max / 100).toLocaleString('en-IN')}`
      : data.budget_max
      ? `Up to ₹${Math.round(data.budget_max / 100).toLocaleString('en-IN')}`
      : 'Not specified';

    await Promise.allSettled(
      studios.map((studio: { phone: string; id: string }) =>
        notifyNewEnquiry({
          photographerPhone: studio.phone,
          clientName: data.client_name,
          eventType: data.event_type,
          eventDate,
          budget: budgetStr,
          eventCity: data.event_city,
          enquiryUrl: `https://pixova.in/enquiries/${enquiry.enquiry_id}`,
        })
      )
    );

    // ── 7. Confirm to client ──
    await notifyEnquirySent({
      clientPhone: data.client_phone,
      clientName: data.client_name,
      studiosCount: studios.length,
      eventType: data.event_type,
      eventDate,
      enquiryUrl: `https://pixova.in/account/enquiries/${enquiry.enquiry_id}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        enquiry_id: enquiry.enquiry_id,
        studios_notified: studios.length,
      },
    });
  } catch (err) {
    console.error('[enquiries] POST error:', err);
    return serverErrorResponse();
  }
}
