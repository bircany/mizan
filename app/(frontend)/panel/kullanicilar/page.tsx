import { Shield, UserRoundCheck } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader, StatusBadge } from "@/components/admin/panel-ui";
import { UserRecordForm } from "@/components/admin/user-record-form";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { requireAdminUser } from "@/lib/admin/data";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  super_admin: "Süper yönetici",
  finance: "Finans",
  approver: "Onaylayıcı",
  field_operator: "Saha operasyon",
};

export default async function UsersAdminPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.users);
  const payload = await getPayloadClient();
  const users = await payload.find({ collection: "users", limit: 20, sort: "name" });

  return (
    <ManagementShell currentPath="/panel/kullanicilar" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Personel hesaplarını, rol sınırlarını ve aktiflik durumunu yönetin. Finansal kayıtların durumunu buradan değiştiremezsiniz." eyebrow="Yetki yönetimi" title="Kullanıcılar ve roller" />
        <UserRecordForm />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><Shield aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Yetkili kullanıcılar</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Rol matrisi server-side olarak ayrıca doğrulanır.</p></div></div>
          {users.docs.length ? <div className="divide-y divide-[var(--admin-border)]">{users.docs.map((item) => <article className="p-4 transition-colors hover:bg-[var(--admin-surface-raised)] sm:p-5" key={item.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--admin-surface-raised)] text-[var(--admin-primary)]"><UserRoundCheck aria-hidden="true" className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[var(--admin-text)]">{item.name || "İsimsiz kullanıcı"}</p><p className="mt-1 truncate text-xs text-[var(--admin-muted)]">{item.email}</p></div></div><div className="flex items-center gap-3"><span className="text-xs font-medium text-[var(--admin-muted)]">{roleLabels[item.role] || item.role}</span><StatusBadge status={item.isActive ? "approved" : "cancelled"} /></div></div><div className="mt-4"><UserRecordForm record={{ email: item.email, id: String(item.id), isActive: item.isActive !== false, name: item.name || "", role: item.role }} /></div></article>)}</div> : <div className="p-5"><EmptyPanelState description="Yeni personel kullanıcıları eklendiğinde burada listelenir." title="Kullanıcı bulunmuyor" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
