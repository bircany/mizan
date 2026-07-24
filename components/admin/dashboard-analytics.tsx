import { BarChart3, Beef, CreditCard, MessageCircle, PackageCheck, Video } from "lucide-react";

import { PanelCard } from "@/components/admin/panel-ui";
import type { DashboardAnalytics, DashboardPoint, DashboardRange } from "@/lib/admin/dashboard-analytics";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Sparkline({ points, tone = "var(--admin-primary)" }: { points: DashboardPoint[]; tone?: string }) {
  const values = points.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);
  const coordinates = values.length ? values.map((value, index) => `${values.length === 1 ? 50 : (index / (values.length - 1)) * 100},${36 - (value / max) * 32}`).join(" ") : "0,36 100,36";
  return <svg aria-label="Dönem eğilimi" className="h-12 w-full overflow-visible" preserveAspectRatio="none" role="img" viewBox="0 0 100 40"><polyline fill="none" points={coordinates} stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}

const ranges: DashboardRange[] = [7, 30, 90];

export function DashboardAnalyticsPanel({ analytics, range }: { analytics: DashboardAnalytics; range: DashboardRange }) {
  if (analytics.restricted) return null;
  const donationTotal = analytics.donationTrend.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const donationCount = analytics.donationTrend.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const qurbaniShares = analytics.qurbaniTrend.reduce((sum, item) => sum + Number(item.count || 0), 0);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="admin-eyebrow">Analitikler</p><h3 className="mt-1 text-lg font-semibold">Dönem görünümü</h3></div><div className="flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-1">{ranges.map((item) => <a className={cn("rounded-md px-3 py-1.5 text-xs font-semibold", item === range ? "bg-[var(--admin-primary)] text-white" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]")} href={item === 30 ? "/panel" : `/panel?range=${item}`} key={item}>{item} gün</a>)}</div></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <PanelCard><div className="flex items-start justify-between gap-3"><div><p className="admin-eyebrow">Tahsilat</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(donationTotal)}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{donationCount} onaylanmış işlem</p></div><CreditCard className="size-5 text-[var(--admin-primary)]" /></div><div className="mt-5"><Sparkline points={analytics.donationTrend} /></div></PanelCard>
      <PanelCard><div className="flex items-start justify-between gap-3"><div><p className="admin-eyebrow">Kurban hisseleri</p><p className="mt-2 text-2xl font-semibold">{qurbaniShares}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Seçilen dönemde kesinleşen hisse</p></div><Beef className="size-5 text-[var(--admin-gold)]" /></div><div className="mt-5"><Sparkline points={analytics.qurbaniTrend} tone="var(--admin-gold)" /></div></PanelCard>
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]"><PanelCard><div className="flex items-center gap-2"><BarChart3 className="size-4 text-[var(--admin-primary)]"/><h3 className="text-sm font-semibold">Aktif sezon: ülke bazında kalan hisse</h3></div><div className="mt-4 space-y-3">{analytics.countries.map((item) => <div className="flex items-center justify-between gap-3" key={item.country}><span className="text-sm">{item.country}</span><strong className="font-mono text-sm">{item.remaining}</strong></div>)}{!analytics.countries.length ? <p className="text-sm text-[var(--admin-muted)]">Satışa açık aktif kurban stoğu bulunmuyor.</p> : null}</div></PanelCard><PanelCard><p className="admin-eyebrow">Kurban kuyruğu</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Queue label="Açık stok" value={analytics.queue.openStock} icon={PackageCheck}/><Queue label="Ödeme bekleyen" value={analytics.queue.pendingPayments} icon={CreditCard}/><Queue label="Saha devri" value={analytics.queue.fieldReady} icon={Beef}/><Queue label="Gönderilecek" value={analytics.queue.readyVideos + analytics.queue.pendingMessages} icon={MessageCircle}/></div></PanelCard></div>
  </section>;
}

function Queue({ icon: Icon, label, value }: { icon: typeof Video; label: string; value: number }) { return <div className="rounded-xl bg-[var(--admin-surface)] p-3"><Icon aria-hidden="true" className="size-4 text-[var(--admin-primary)]"/><p className="mt-2 font-mono text-lg font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">{label}</p></div>; }
