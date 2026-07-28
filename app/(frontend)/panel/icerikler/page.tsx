import Link from "next/link";
import { FileText, Images, Newspaper, Tags } from "lucide-react";

import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";

export const dynamic = "force-dynamic";

const contentLinks = [
  { href: "/panel/icerik/haberler", icon: Newspaper, title: "Haberler", description: "Haberleri ve haber kategorilerini yönetin." },
  { href: "/panel/icerik/kategoriler", icon: Tags, title: "Bağış kategorileri", description: "Bağışları sitede gruplandıran kategorileri düzenleyin." },
  { href: "/panel/icerik/sayfalar", icon: FileText, title: "Sayfalar", description: "Sabit sayfaları ve bağış başarı mesajını düzenleyin." },
  { href: "/panel/icerik/medya", icon: Images, title: "Fotoğraflar", description: "Site genelinde kullanılan görselleri yükleyin ve yönetin." },
] as const;

export default async function UnifiedContentPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.content);
  return (
    <ManagementShell currentPath="/panel/icerikler" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader description="Sitede ziyaretçilerin gördüğü bütün metin ve görseller dört anlaşılır bölümde toplanır." eyebrow="Site yönetimi" title="İçerikler" />
        <section className="grid gap-4 sm:grid-cols-2">
          {contentLinks.map((item) => {
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
