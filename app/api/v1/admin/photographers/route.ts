export const dynamic = 'force-dynamic';

// ============================================
// GET /api/v1/admin/photographers
// Admin: list all photographers with filters
// ============================================

import { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import { successResponse, unauthorizedResponse } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { searchParams } = request.nextUrl;
  const search = searchParams.get('search') || '';
  const planFilter = searchParams.get('plan') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
  const offset = (page - 1) * limit;

  const supabase = createSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('photographers')
    .select('id, full_name, phone, email, is_active, is_suspended, last_login_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  if (statusFilter === 'SUSPENDED') query = query.eq('is_suspended', true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: photographers, count } = await query as { data: any[]; count: number };

  if (!photographers?.length) {
    return successResponse({ photographers: [], total: count ?? 0, page, limit, has_more: false });
  }

  const ids: string[] = photographers.map((p) => p.id);

  const [{ data: studios }, { data: subs }] = await Promise.all([
    supabase.from('studio_profiles').select('id, photographer_id, name, storage_used_bytes').in('photographer_id', ids),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('subscriptions').select('id, photographer_id, status, bookings_this_cycle, plan_id').in('photographer_id', ids),
  ]);

  const planIds = Array.from(new Set<string>((subs ?? []).map((s: { plan_id: string }) => s.plan_id)));
  const { data: plans } = planIds.length ? await supabase.from('plans').select('id, name').in('id', planIds) : { data: [] };

  const studioMap = Object.fromEntries((studios ?? []).map((s) => [s.photographer_id, s]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subMap: Record<string, any> = {};
  (subs ?? []).forEach((s: { photographer_id: string }) => { if (!subMap[s.photographer_id]) subMap[s.photographer_id] = s; });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planMap = Object.fromEntries((plans ?? []).map((p: any) => [p.id, p]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = photographers.map((p: any) => {
    const studio = studioMap[p.id];
    const sub = subMap[p.id];
    const plan = sub ? planMap[sub.plan_id] : null;
    return {
      id: p.id,
      name: p.full_name,
      phone: p.phone,
      email: p.email,
      studio_name: studio?.name ?? null,
      studio_id: studio?.id ?? null,
      plan: plan?.name ?? 'TRIAL',
      status: p.is_suspended ? 'SUSPENDED' : (sub?.status ?? 'UNKNOWN'),
      bookings_count: sub?.bookings_this_cycle ?? 0,
      storage_used: studio?.storage_used_bytes ?? 0,
      joined_at: p.created_at,
      last_active: p.last_login_at,
      is_suspended: p.is_suspended ?? false,
    };
  });

  const filtered = planFilter ? rows.filter((r) => r.plan.toUpperCase() === planFilter.toUpperCase()) : rows;
  const finalRows = statusFilter && statusFilter !== 'SUSPENDED'
    ? filtered.filter((r) => r.status.toUpperCase() === statusFilter.toUpperCase())
    : filtered;

  return successResponse({ photographers: finalRows, total: count ?? 0, page, limit, has_more: (count ?? 0) > offset + limit });
}
