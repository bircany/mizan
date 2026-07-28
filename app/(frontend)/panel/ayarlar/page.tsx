import Link from "next/link";
import { CircleDollarSign, FileClock, ReceiptText, RotateCcw } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

const settingsLinks = [
  { href: "/panel/denetim", icon: FileClock, title: "Denetim kayıtları", description: "Yönetici işlemlerini ve kritik değişiklikleri inceleyin." },
  { href: "/panel/odemeler", icon: CircleDollarSign, title: "Ödeme izleme", description: "Kart ödeme oturumlarını ve sağlayıcı sonuçlarını görün." },
  { href: "/panel/teslimatlar", icon: ReceiptText, title: "Makbuz ve e-posta", description: "Makbuz üretimi ile e-posta teslimlerini takip edin." },
  { href: "/panel/iadeler", icon: RotateCcw, title: "İade işlemleri", description: "Kanıtlı iade ve iptal taleplerini yönetin." },
] as const;

export default async function UnifiedSettingsPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.settings);
  return (
    <ManagementShell currentPath="/panel/ayarlar" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Günlük kullanımda az ihtiyaç duyulan finans ve denetim araçlarını bu bölümden açın." eyebrow="Yönetici araçları" title="Denetim ve Ayarlar" />
        <section className="grid gap-4 sm:grid-cols-2">
          {settingsLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="admin-card group flex min-h-36 items-start gap-4 transition hover:-translate-y-0.5 hover:border-[var(--admin-primary)]" href={item.href} key={item.href}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[rgb(166_215_178_/_14%)] text-[var(--admin-primary-strong)]"><Icon aria-hidden="true" className="size-5" /></span>
                <span>
                  <span className="block text-base font-semibold text-[var(--admin-text)] group-hover:text-[var(--admin-primary-strong)]">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-[var(--admin-muted)]">{item.description}</span>
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </ManagementShell>
  );
}
