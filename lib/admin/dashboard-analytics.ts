import "server-only";

import { canManageFinance } from "@/lib/auth/roles";
import { qurbaniQuery } from "@/lib/qurbani/db";
import type { UserRole } from "@/lib/auth/roles";

export type DashboardRange = 7 | 30 | 90;
export type DashboardPoint = { date: string; value: number; count: number };
export type DashboardCountryStock = { country: string; remaining: number };

export type DashboardAnalytics = {
  donationTrend: DashboardPoint[];
  qurbaniTrend: DashboardPoint[];
  countries: DashboardCountryStock[];
  queue: { openStock: number; pendingPayments: number; fieldReady: number; readyVideos: number; pendingMessages: number };
  restricted: boolean;
};

export function parseDashboardRange(value: string | undefined): DashboardRange {
  return value === "7" || value === "90" ? Number(value) as DashboardRange : 30;
}

async function safeQuery<T>(query: string, values: unknown[], fallback: T[]): Promise<T[]> {
  try {
    const result = await qurbaniQuery<T & Record<string, unknown>>(query, values);
    return result.rows as T[];
  } catch (error) {
    console.warn("Panel analitik sorgusu okunamadı.", error instanceof Error ? error.message : String(error));
    return fallback;
  }
}

export async function getDashboardAnalytics(role: UserRole, days: DashboardRange): Promise<DashboardAnalytics> {
  if (!canManageFinance(role)) {
    return {
      donationTrend: [], qurbaniTrend: [], countries: [],
      queue: { openStock: 0, pendingPayments: 0, fieldReady: 0, readyVideos: 0, pendingMessages: 0 },
      restricted: true,
    };
  }

  const [donations, qurbani, countries, queue] = await Promise.all([
    safeQuery<DashboardPoint>(`
      select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
             coalesce(sum(net_confirmed_amount), 0)::float as value,
             count(*)::int as count
      from public.donations
      where status in ('paid', 'partially_refunded')
        and created_at >= now() - ($1::int * interval '1 day')
      group by 1 order by 1`, [days], []),
    safeQuery<DashboardPoint>(`
      select to_char(date_trunc('day', confirmed_at), 'YYYY-MM-DD') as date,
             count(*)::float as value, count(*)::int as count
      from public.qurbani_shares
      where status = 'confirmed' and confirmed_at is not null
        and confirmed_at >= now() - ($1::int * interval '1 day')
      group by 1 order by 1`, [days], []),
    safeQuery<DashboardCountryStock>(`
      select coalesce(locale.name, country.iso_code) as country,
             coalesce(sum(batch.available_capacity), 0)::int as remaining
      from public.qurbani_stock_batches batch
      join public.qurbani_countries country on country.id = batch.country_id
      left join public.qurbani_countries_locales locale on locale._parent_id = country.id and locale._locale = 'tr'
      join public.qurbani_seasons season on season.id = batch.season_id
      where batch.status = 'active' and country.is_active = true and season.status = 'active'
      group by country.id, country.iso_code, locale.name
      order by remaining desc, country asc`, [], []),
    safeQuery<{ open_stock: number; pending_payments: number; field_ready: number; ready_videos: number; pending_messages: number }>(`
      select
        (select count(*)::int from public.qurbani_pools where status = 'open') as open_stock,
        (select count(*)::int from public.qurbani_orders where status in ('pending_payment', 'pending_eft_review', 'action_required')) as pending_payments,
        (select count(*)::int from public.qurbani_pools where status = 'full' and locked_at is null) as field_ready,
        (select count(*)::int from public.qurbani_videos where status in ('ready_to_send', 'approved')) as ready_videos,
        (select count(*)::int from public.qurbani_messages where status = 'queued') as pending_messages`, [], []),
  ]);

  const counts = queue[0] || { open_stock: 0, pending_payments: 0, field_ready: 0, ready_videos: 0, pending_messages: 0 };
  return {
    donationTrend: donations,
    qurbaniTrend: qurbani,
    countries,
    queue: { openStock: Number(counts.open_stock || 0), pendingPayments: Number(counts.pending_payments || 0), fieldReady: Number(counts.field_ready || 0), readyVideos: Number(counts.ready_videos || 0), pendingMessages: Number(counts.pending_messages || 0) },
    restricted: false,
  };
}
