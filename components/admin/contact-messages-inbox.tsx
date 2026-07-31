"use client";

import Link from "next/link";
import { MailOpen, MessageSquareText, Search, GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContactMessageRecord } from "@/lib/admin/contact-message-data";

function date(value: string) { return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value)) : "-"; }
type TypeFilter = "all" | "student" | "contact";
type StatusFilter = "all" | "unread" | "read" | "archived";

export function ContactMessagesInbox({ messages, page, totalPages, totalDocs }: { messages: ContactMessageRecord[]; page: number; totalPages: number; totalDocs: number }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return messages.filter((message) => (type === "all" || message.type === type) && (status === "all" || message.status === status) && (!needle || [message.name, message.email, message.phone, message.program, message.subject, message.message].some((value) => value.toLocaleLowerCase("tr-TR").includes(needle))));
  }, [messages, query, status, type]);
  const studentCount = messages.filter((message) => message.type === "student").length;
  const contactCount = messages.length - studentCount;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--admin-muted)]">Toplam {totalDocs} kayıt · okunmamışlar önce gösterilir.</p><span className="admin-status admin-status-info">Sayfa {page} / {Math.max(totalPages, 1)}</span></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{([['all', `Tümü (${messages.length})`], ['student', `Talebe Başvuruları (${studentCount})`], ['contact', `İletişim (${contactCount})`]] as const).map(([key, label]) => <button className={type === key ? "admin-action-button" : "admin-secondary-button"} key={key} onClick={() => setType(key)} type="button">{key === "student" ? <GraduationCap className="size-4" /> : null}{label}</button>)}</div><div className="flex flex-wrap gap-2">{([['all', 'Tüm durumlar'], ['unread', 'Okunmamış'], ['read', 'Okundu'], ['archived', 'Arşiv']] as const).map(([key, label]) => <button className={status === key ? "admin-action-button" : "admin-secondary-button"} key={key} onClick={() => setStatus(key)} type="button">{label}</button>)}</div></div>
    <label className="relative block max-w-xl"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-[var(--admin-muted)]" /><input className="admin-input pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="İsim, telefon, e-posta, eğitim programı veya not ara" value={query} /></label>
    {filtered.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map((message) => <Link className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${message.type === "student" ? "border-[#b8d7bf] bg-[#eff8f0] hover:border-[#2f7650]" : "border-[var(--admin-border)] bg-[var(--admin-surface-raised)] hover:border-[var(--admin-primary)]"}`} href={`/panel/mesajlar/${message.id}`} key={message.id}><div className="flex items-start justify-between gap-3"><span className={message.type === "student" ? "admin-status bg-[#dcefe0] text-[#1f6a42]" : message.status === "unread" ? "admin-status admin-status-warning" : "admin-status admin-status-neutral"}>{message.type === "student" ? "Talebe başvurusu" : message.status === "unread" ? "Okunmadı" : message.status === "read" ? "Okundu" : "Arşiv"}</span>{message.type === "student" ? <GraduationCap className="size-5 text-[#2f7650]" /> : <MessageSquareText className="size-5 text-[var(--admin-primary)]" />}</div><h2 className="mt-4 line-clamp-1 text-base font-semibold">{message.subject || (message.type === "student" ? "Talebe ön başvurusu" : "İletişim mesajı")}</h2><p className="mt-1 text-sm font-medium">{message.name}</p>{message.type === "student" && message.program ? <p className="mt-2 rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-[#27633e]">{message.program}</p> : null}<p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-[var(--admin-muted)]">{message.message || message.program}</p><div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border)] pt-3 text-xs text-[var(--admin-muted)]"><span>{date(message.createdAt)}</span>{message.status === "unread" ? <MailOpen className="size-4 text-[var(--admin-primary)]" /> : null}</div></Link>)}</section> : <div className="rounded-2xl border border-dashed border-[var(--admin-border)] p-10 text-center text-sm text-[var(--admin-muted)]">Bu filtreye uygun kayıt bulunamadı.</div>}
    {totalPages > 1 ? <div className="flex justify-end gap-2">{page > 1 ? <Link className="admin-secondary-button" href={`/panel/mesajlar?page=${page - 1}`}>Önceki</Link> : null}{page < totalPages ? <Link className="admin-action-button" href={`/panel/mesajlar?page=${page + 1}`}>Sonraki</Link> : null}</div> : null}
  </div>;
}
