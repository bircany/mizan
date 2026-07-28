"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Pencil, X } from "lucide-react";
import { saveChildDonationSettings, type ChildDonationSettingsActionState } from "@/lib/admin/child-donation-actions";

type Settings = { campaign: string; usdCampaign: string; eurCampaign: string; foodPrice: number; stationeryPrice: number; toyPrice: number; clothingPrice: number; foodUsdPrice: number; stationeryUsdPrice: number; toyUsdPrice: number; clothingUsdPrice: number; foodEurPrice: number; stationeryEurPrice: number; toyEurPrice: number; clothingEurPrice: number };
const initial: ChildDonationSettingsActionState = { success: false, message: null };
const packages = [["food", "Yemek"], ["stationery", "Kırtasiye"], ["toy", "Oyuncak"], ["clothing", "Giyecek"]] as const;

export function ChildDonationSettingsCard({ settings }: { settings: Settings | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveChildDonationSettings, initial);
  const field = (key: string, currency: "TRY" | "USD" | "EUR") => `${key}${currency === "TRY" ? "Price" : currency === "USD" ? "UsdPrice" : "EurPrice"}` as keyof Settings;

  return <>
    <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#e8f2ea]"><Image alt="Ahmet" height={38} src="/images/orphan/kid/head_happy.svg" width={38} /></span><div><p className="truncate text-base font-semibold text-[var(--admin-text)]">Ahmet&apos;e Destek</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Sabit paket bağışı · Çoklu para birimi</p></div></div>
        <span className="rounded-full bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold uppercase text-[var(--admin-muted)]">{settings ? "Aktif" : "Ayar bekliyor"}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg bg-[var(--admin-surface)] p-3"><dt className="text-[11px] text-[var(--admin-muted)]">Paket türleri</dt><dd className="mt-1 text-sm font-semibold">4 paket</dd></div><div className="rounded-lg bg-[var(--admin-surface)] p-3"><dt className="text-[11px] text-[var(--admin-muted)]">Para birimleri</dt><dd className="mt-1 font-mono text-sm font-semibold">TRY · USD · EUR</dd></div></dl>
      <button className="admin-action-button mt-5 w-full justify-center" onClick={() => setOpen(true)} type="button"><Pencil className="size-4" />Kampanyayı düzenle</button>
    </article>
    {open ? <div aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" role="dialog"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--admin-surface)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="admin-eyebrow">Ana sayfa sabit bağışı</p><h2 className="mt-1 text-xl font-semibold">Ahmet paketlerini düzenle</h2><p className="mt-2 text-sm text-[var(--admin-muted)]">Bu yardım kampanyası otomatik yönetilir; yalnızca paket fiyatlarını belirlersiniz.</p></div><button aria-label="Kapat" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div><section className="mt-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--admin-muted)]">Yönetilen tahsilat havuzları</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[["TRY", settings?.campaign], ["USD", settings?.usdCampaign], ["EUR", settings?.eurCampaign]].map(([currency, id]) => <div className="rounded-lg bg-[var(--admin-surface)] p-3" key={currency}><strong className="block text-sm">{currency}</strong><span className="mt-1 block text-xs text-[var(--admin-muted)]">{id ? `Kampanya #${id}` : "İlk kayıtta oluşturulacak"}</span></div>)}</div></section><form action={action} className="mt-6 space-y-6">{(["TRY", "USD", "EUR"] as const).map((currency) => <fieldset className="rounded-xl border border-[var(--admin-border)] p-4" key={currency}><legend className="px-2 font-semibold">{currency} paketleri</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{packages.map(([key, label]) => <label key={key}><span className="admin-label">{label} ({currency})</span><input className="admin-input mt-1" defaultValue={settings?.[field(key, currency)] ?? ""} min="0.01" name={field(key, currency)} required step="0.01" type="number" /></label>)}</div></fieldset>)}{state.message ? <p aria-live="polite" className={state.success ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}<div className="flex justify-end gap-3"><button className="admin-button-secondary" onClick={() => setOpen(false)} type="button">Vazgeç</button><button className="admin-button-primary" disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Kaydet"}</button></div></form></div></div> : null}
  </>;
}
