"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { videoQuery, type VideoFilters, type VideoTab } from "@/lib/admin/video-filters";

export function VideoViewSwitch({ filters, tab }: { filters: VideoFilters; tab: VideoTab }) {
  const router = useRouter();
  const [view, setView] = useOptimistic(filters.view);
  const [pending, startTransition] = useTransition();
  return <div aria-label="Teslimat görünümü" aria-busy={pending} role="group" className="relative isolate inline-grid grid-cols-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-1">
    <span aria-hidden="true" className={`pointer-events-none absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-full bg-[var(--admin-primary-strong)] shadow-sm transition-transform duration-200 motion-reduce:transition-none ${view === "table" ? "translate-x-full" : "translate-x-0"}`} />
    {(["cards", "table"] as const).map(mode => {
      const Icon = mode === "cards" ? LayoutGrid : List;
      return <button key={mode} type="button" aria-pressed={view === mode} disabled={pending} onClick={() => startTransition(() => {
        setView(mode);
        router.push(`/panel/video-teslimat?${videoQuery({ ...filters, view: mode }, tab, filters.page)}`, { scroll: false });
      })} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${view === mode ? "text-[var(--admin-primary-ink)]" : "text-[var(--admin-muted)]"}`}><Icon className="size-4" />{mode === "cards" ? "Kartlar" : "Tablo"}</button>;
    })}
  </div>;
}
