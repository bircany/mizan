"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";

import type { ContactMessageRecord } from "@/lib/admin/contact-message-data";

export function AdminContactMessageNotifier() {
  const [message, setMessage] = useState<ContactMessageRecord | null>(null);
  const dismissed = useRef<string>("");
  useEffect(() => {
    let active = true;
    async function check() {
      try { const response = await fetch("/api/admin/contact-messages/unread", { cache: "no-store" }); const payload = await response.json() as { message?: ContactMessageRecord | null }; if (active && payload.message && payload.message.id !== dismissed.current) setMessage(payload.message); } catch { /* Next poll retries. */ }
    }
    void check(); const timer = window.setInterval(check, 20_000); return () => { active = false; window.clearInterval(timer); };
  }, []);
  if (!message) return null;
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-4"><section aria-labelledby="new-message-title" className="w-full max-w-md rounded-2xl bg-[var(--admin-surface-raised)] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--admin-primary)] text-white"><BellRing className="size-5" /></span><div><h2 className="font-semibold" id="new-message-title">Yeni mesajınız var</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">Gönderen: {message.name}</p></div></div><button aria-label="Bildirimi kapat" className="admin-icon-button" onClick={() => { dismissed.current = message.id; setMessage(null); }} type="button"><X className="size-5" /></button></div><p className="mt-5 text-sm font-medium">{message.subject || "İletişim mesajı"}</p><p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--admin-muted)]">{message.message || message.program}</p><div className="mt-6 flex justify-end gap-2"><button className="admin-secondary-button" onClick={() => { dismissed.current = message.id; setMessage(null); }} type="button">Kapat</button><Link className="admin-action-button" href={`/panel/mesajlar/${message.id}`}>Mesajı aç</Link></div></section></div>;
}
