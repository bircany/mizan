import Link from "next/link";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { getContactMessage } from "@/lib/admin/contact-message-data";
import { getPayloadClient } from "@/lib/payload";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function ContactMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contactMessages);
  const { id } = await params;
  let message;
  try { message = await getContactMessage(id); } catch { return <ManagementShell currentPath="/panel/mesajlar" name={user.name || user.email} role={user.role}><p className="text-sm">Mesaj bulunamadı.</p></ManagementShell>; }
  if (message.status === "unread") { const payload = await getPayloadClient(); await payload.update({ collection: "contact-messages" as never, id, overrideAccess: true, data: { status: "read", readAt: new Date().toISOString(), readBy: user.id } } as never); }
  return <ManagementShell currentPath="/panel/mesajlar" name={user.name || user.email} role={user.role}><div className="space-y-6"><PanelPageHeader action={<Link className="admin-secondary-button" href="/panel/mesajlar"><ArrowLeft className="size-4" />Listeye dön</Link>} eyebrow="İletişim merkezi" title={message.subject || "İletişim mesajı"} description={`${message.name} tarafından gönderildi.`} /><article className="mx-auto max-w-4xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-6 shadow-sm"><div className="grid gap-5 border-b border-[var(--admin-border)] pb-6 sm:grid-cols-2"><div><p className="admin-label">Gönderen</p><p className="mt-1 font-semibold">{message.name}</p></div><div><p className="admin-label">Form türü</p><p className="mt-1">{message.type === "student" ? "Talebe ön başvurusu" : "İletişim"}</p></div><a className="inline-flex items-center gap-2 text-[var(--admin-primary)] hover:underline" href={`mailto:${message.email}`}><Mail className="size-4" />{message.email}</a>{message.phone ? <a className="inline-flex items-center gap-2 text-[var(--admin-primary)] hover:underline" href={`tel:${message.phone}`}><Phone className="size-4" />{message.phone}</a> : null}</div>{message.program ? <div className="mt-6"><p className="admin-label">Eğitim / birim</p><p className="mt-2">{message.program}</p></div> : null}<div className="mt-6"><p className="admin-label">Mesaj</p><p className="mt-2 whitespace-pre-wrap leading-7">{message.message || "Mesaj metni girilmemiş."}</p></div></article></div></ManagementShell>;
}
