export const dynamic = 'force-dynamic';

// ============================================
// GET /api/v1/admin/revenue
// Admin: revenue dashboard data
// ============================================

import { getAdminSession } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import { successResponse, unauthorizedResponse } from '@/lib/api-helpers';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const supabase = createSupabaseAdmin();

  // Subscription stats
  const [
    { data: allSubs },
    { data: recentEvents },
    { data: plans },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('subscriptions')
      .select('id, photographer_id, status, plan_id, created_at'),
    supabase
      .from('subscription_events')
      .select('event_id, event_type, new_plan, old_plan, amount_paise, created_at, performed_by')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('plans').select('id, name, price_monthly'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planMap = Object.fromEntries((plans ?? []).map((p: any) => [p.id, p]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs = (allSubs ?? []) as any[];

  const activeSubs = subs.filter((s) => s.status === 'ACTIVE');
  const trialSubs = subs.filter((s) => s.status === 'TRIAL');
  const graceSubs = subs.filter((s) => s.status === 'GRACE');

  // MRR: sum of active subscription monthly prices
  const mrrPaise = activeSubs.reduce((sum, s) => {
    const plan = planMap[s.plan_id];
    return sum + (plan?.price_monthly ?? 0);
  }, 0);

  // Plan breakdown
  const planBreakdown: Record<string, number> = { TRIAL: 0, STARTER: 0, PRO: 0, STUDIO: 0 };
  subs.forEach((s) => {
    if (s.status === 'TRIAL') { planBreakdown.TRIAL++; return; }
    const plan = planMap[s.plan_id];
    if (plan) {
      const key = plan.name.toUpperCase();
      if (key in planBreakdown) planBreakdown[key]++;
    }
  });

  // Churned this month (CANCELLED in last 30 days)
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Revenue by month (last 6 months from subscription_events)
  const { data: chargeEvents } = await supabase
    .from('subscription_events')
    .select('event_type, amount_paise, created_at')
    .in('event_type', ['SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_RENEWED'])
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueByMonth: Record<string, { month: string; revenue_paise: number; new_subs: number }> = {};
  (chargeEvents ?? []).forEach((e) => {
    const month = e.created_at.slice(0, 7); // YYYY-MM
    if (!revenueByMonth[month]) revenueByMonth[month] = { month, revenue_paise: 0, new_subs: 0 };
    revenueByMonth[month].revenue_paise += e.amount_paise ?? 0;
    if (e.event_type === 'SUBSCRIPTION_ACTIVATED') revenueByMonth[month].new_subs++;
  });

  const totalRevenuePaise = Object.values(revenueByMonth).reduce((s, m) => s + m.revenue_paise, 0);

  return successResponse({
    total_revenue_paise: totalRevenuePaise,
    mrr_paise: mrrPaise,
    arr_paise: mrrPaise * 12,
    active_subscribers: activeSubs.length,
    trial_users: trialSubs.length,
    grace_users: graceSubs.length,
    plan_breakdown: planBreakdown,
    revenue_by_month: Object.values(revenueByMonth).slice(-6),
    recent_upgrades: (recentEvents ?? []).filter(
      (e) => e.event_type === 'PLAN_UPGRADED' || e.event_type === 'PLAN_CHANGED_BY_ADMIN'
    ).slice(0, 10),
  });
}
