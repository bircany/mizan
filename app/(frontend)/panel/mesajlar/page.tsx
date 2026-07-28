import { ManagementShell } from "@/components/admin/management-shell";
import { ContactMessagesInbox } from "@/components/admin/contact-messages-inbox";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { getContactMessages } from "@/lib/admin/contact-message-data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contactMessages);
  const { page: rawPage } = await searchParams;
  const data = await getContactMessages(Math.max(1, Number(rawPage) || 1));
  return <ManagementShell currentPath="/panel/mesajlar" name={user.name || user.email} role={user.role}><div className="space-y-6"><PanelPageHeader eyebrow="İletişim merkezi" title="Mesajlar" description="İletişim formu ve talebe ön başvuru mesajlarını burada takip edin." /><ContactMessagesInbox {...data} /></div></ManagementShell>;
}
