export const dynamic = 'force-dynamic';

// ============================================
// POST /api/v1/subscription/upgrade
// Auth: Photographer JWT
// Creates a Razorpay subscription for upgrade
// ============================================

import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { logSubscriptionEvent } from '@/lib/adminAuth';
import Razorpay from 'razorpay';
import { z } from 'zod';

const PLAN_RAZORPAY_IDS: Record<string, string | undefined> = {
  STARTER: process.env.RAZORPAY_PLAN_STARTER,
  PRO: process.env.RAZORPAY_PLAN_PRO,
  STUDIO: process.env.RAZORPAY_PLAN_STUDIO,
};

const PLAN_AMOUNTS: Record<string, number> = {
  STARTER: 39900,  // ₹399
  PRO:     69900,  // ₹699
  STUDIO:  129900, // ₹1299
};

const upgradeSchema = z.object({
  plan_name: z.enum(['STARTER', 'PRO', 'STUDIO']),
  payment_method: z.enum(['subscription', 'payment_link']).default('subscription'),
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
  }

  const { plan_name, payment_method } = parsed.data;
  const supabase = createSupabaseAdmin();

  // Verify photographer is not suspended
  const { data: photographer } = await supabase
    .from('photographers')
    .select('id, is_suspended, full_name')
    .eq('id', session.photographerId)
    .single();

  if (!photographer) return unauthorizedResponse();
  if (photographer.is_suspended) {
    return errorResponse('Your account is suspended. Contact support@pixova.in', 403);
  }

  // Get studio
  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id, name, phone, email')
    .eq('photographer_id', session.photographerId)
    .single();

  if (!studio) return serverErrorResponse('Studio profile not found');

  // Get plan record
  const { data: plan } = await supabase
    .from('plans')
    .select('id, name, price_monthly')
    .ilike('name', plan_name)
    .single();

  if (!plan) return errorResponse('Plan not found', 404);

  const razorpayPlanId = PLAN_RAZORPAY_IDS[plan_name];
  const amountPaise = PLAN_AMOUNTS[plan_name];

  if (payment_method === 'subscription') {
    if (!razorpayPlanId) {
      return errorResponse(`Razorpay plan ID not configured for ${plan_name}. Add RAZORPAY_PLAN_${plan_name} to environment variables.`, 500);
    }

    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzpSub = await (rzp.subscriptions as any).create({
        plan_id: razorpayPlanId,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        addons: [],
        notes: {
          photographer_id: session.photographerId,
          studio_id: studio.id,
          plan_name,
        },
      });

      // Save to razorpay_subscriptions
      await supabase.from('razorpay_subscriptions').insert({
        photographer_id: session.photographerId,
        studio_id: studio.id,
        plan_id: plan.id,
        razorpay_sub_id: rzpSub.id,
        razorpay_plan_id: razorpayPlanId,
        status: rzpSub.status,
        amount_paise: amountPaise,
      });

      // Log event
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentSub } = await (supabase as any)
        .from('subscriptions')
        .select('status, plans(name)')
        .eq('photographer_id', session.photographerId)
        .single();

      await logSubscriptionEvent({
        photographerId: session.photographerId,
        studioId: studio.id,
        eventType: 'PLAN_UPGRADED',
        oldPlan: (currentSub?.plans as { name: string } | null)?.name ?? undefined,
        newPlan: plan_name,
        oldStatus: currentSub?.status,
        amountPaise,
        razorpaySubId: rzpSub.id,
      });

      return successResponse({
        subscription_url: rzpSub.short_url,
        razorpay_sub_id: rzpSub.id,
      });
    } catch (err) {
      console.error('[subscription/upgrade] Razorpay error:', err);
      return serverErrorResponse('Failed to create Razorpay subscription');
    }
  }

  // payment_link method — one-time payment for first month
  const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentLink = await (rzp.paymentLink as any).create({
      amount: amountPaise,
      currency: 'INR',
      description: `Pixova ${plan_name} Plan - First Month`,
      customer: {
        name: photographer.full_name,
        contact: studio.phone,
        email: studio.email || '',
      },
      notify: { sms: false, email: !!studio.email, whatsapp: false },
      reminder_enable: false,
      notes: {
        photographer_id: session.photographerId,
        studio_id: studio.id,
        plan_name,
        payment_type: 'SUBSCRIPTION_FIRST_MONTH',
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?upgraded=1`,
      callback_method: 'get',
    });

    return successResponse({ payment_url: paymentLink.short_url });
  } catch (err) {
    console.error('[subscription/upgrade] Payment link error:', err);
    return serverErrorResponse('Failed to create payment link');
  }
}
