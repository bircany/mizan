"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Check, ExternalLink, Settings2 } from "lucide-react";

import { PanelCard } from "@/components/admin/panel-ui";
import { savePanelQuickLinks, type PanelSettingsActionState } from "@/lib/admin/panel-settings-actions";
import { PANEL_QUICK_ACCESS_ITEMS, type PanelQuickAccessItem } from "@/lib/auth/panel-access";
import type { UserRole } from "@/lib/auth/roles";

const initialState: PanelSettingsActionState = { success: false, message: null };

export function DashboardQuickAccess({ items }: { items: PanelQuickAccessItem[] }) {
  return <PanelCard>
    <div className="flex items-center justify-between gap-3"><div><p className="admin-eyebrow">Hızlı erişim</p><h3 className="mt-1 text-base font-semibold">Sık kullanılan araçlar</h3></div></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <Link className="group flex min-h-20 items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 transition hover:border-[var(--admin-primary)]" href={item.href} key={item.key}>
        <span className="text-sm font-semibold text-[var(--admin-text)]">{item.label}</span><ExternalLink aria-hidden="true" className="size-4 text-[var(--admin-muted)] transition group-hover:text-[var(--admin-primary)]" />
      </Link>)}
      {!items.length ? <p className="text-sm text-[var(--admin-muted)]">Rolünüz için seçilmiş hızlı erişim bulunmuyor.</p> : null}
    </div>
  </PanelCard>;
}

export function QuickAccessSettings({ selectedKeys, role }: { selectedKeys: string[]; role: UserRole }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(savePanelQuickLinks, initialState);
  if (role !== "super_admin") return null;
  return <div className="relative">
    <button className="admin-icon-button" aria-expanded={open} aria-label="Hızlı erişimi düzenle" onClick={() => setOpen((value) => !value)} type="button"><Settings2 className="size-4" /></button>
    {open ? <div className="absolute right-0 z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4 shadow-xl">
      <p className="text-sm font-semibold">Ortak hızlı erişim</p><p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">Tüm ekip için en fazla altı araç seçin.</p>
      <form action={action} className="mt-4 space-y-2">
        {PANEL_QUICK_ACCESS_ITEMS.map((item) => <label className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-[var(--admin-surface)]" key={item.key}>
          <input defaultChecked={selectedKeys.includes(item.key)} name="quickLinks" type="checkbox" value={item.key} />{item.label}
        </label>)}
        {state.message ? <p aria-live="polite" className={state.success ? "text-xs text-[var(--admin-primary)]" : "text-xs text-[var(--admin-danger)]"}>{state.message}</p> : null}
        <button className="admin-action-button w-full justify-center" type="submit"><Check className="size-4" />Kaydet</button>
      </form>
    </div> : null}
  </div>;
}
