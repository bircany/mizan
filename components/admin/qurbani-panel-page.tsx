import Link from "next/link";
import { Boxes, ClipboardList, MapPinned, PackagePlus, Settings2, ShoppingBag, Truck } from "lucide-react";
import { notFound } from "next/navigation";

import { ManagementShell } from "@/components/admin/management-shell";
import { PanelPageHeader } from "@/components/admin/panel-ui";
import { QurbaniManager, type QurbaniWhatsAppStatus } from "@/components/admin/qurbani-manager";
import { getQurbaniAdminSnapshot, requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getEvolutionConnectionStatus } from "@/lib/qurbani/evolution";

export type QurbaniSection = "sales" | "stock" | "orders" | "field" | "delivery" | "settings";

const sections: Array<{ href: string; icon: typeof ShoppingBag; id: QurbaniSection; label: string; text: string }> = [
  { id: "sales", href: "/panel/kurban/satis", icon: ShoppingBag, label: "Satış", text: "Satış durumu ve görünürlük" },
  { id: "stock", href: "/panel/kurban/stok", icon: PackagePlus, label: "Stok", text: "Partiler, kapasite ve fiyatlar" },
  { id: "orders", href: "/panel/kurban/siparisler", icon: ClipboardList, label: "Siparişler", text: "Ödeme, vekâlet ve hissedarlar" },
  { id: "field", href: "/panel/kurban/saha", icon: MapPinned, label: "Saha", text: "Havuz, paket ve görevler" },
  { id: "delivery", href: "/panel/kurban/teslimat", icon: Truck, label: "Teslimat", text: "Video, bağlantı ve mesajlar" },
  { id: "settings", href: "/panel/kurban/ayarlar", icon: Settings2, label: "Ayarlar", text: "Sezon, ülke ve bağlantılar" },
];

async function getWhatsAppStatus(): Promise<QurbaniWhatsAppStatus> {
  const configured = Boolean(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE_NAME);
  return configured ? getEvolutionConnectionStatus() : { state: "unconfigured", message: "Evolution API henüz yapılandırılmadı." };
}

export async function QurbaniPanelPage({ section, root = false }: { section: QurbaniSection; root?: boolean }) {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.qurbani);
  if (user.role === "field_operator" && section !== "field") notFound();
  const canManage = user.role === "admin";
  const [snapshot, whatsapp] = await Promise.all([
    getQurbaniAdminSnapshot(user),
    canManage ? getWhatsAppStatus() : Promise.resolve({ state: "unconfigured" } as QurbaniWhatsAppStatus),
  ]);

  return <ManagementShell currentPath="/panel/kurban" name={user.name || user.email} role={user.role}>
    <div className="space-y-6">
      <PanelPageHeader eyebrow="Kurban operasyonu" title={canManage ? "Kurban Yönetim Merkezi" : "Kurban görevlerim"} description={canManage ? "Satıştan teslimata tüm Kurban operasyonunu ayrı, güvenli çalışma alanlarında yönetin." : "Size atanmış saha paketlerini, görevleri ve video yükleme akışını yönetin."} />
      {canManage ? <nav aria-label="Kurban bölümleri" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {sections.map(({ href, icon: Icon, id, label, text }) => <Link key={id} href={href} className={`admin-card min-h-28 transition ${section === id && !root ? "border-[var(--admin-primary)] bg-[rgb(166_215_178_/_12%)]" : "hover:-translate-y-0.5"}`}>
          <Icon aria-hidden="true" className="size-5 text-[var(--admin-primary)]" />
          <p className="mt-3 font-semibold text-[var(--admin-text)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">{text}</p>
        </Link>)}
      </nav> : <div className="admin-card flex items-center gap-3"><Boxes className="size-5 text-[var(--admin-primary)]" /><p className="text-sm text-[var(--admin-muted)]">Saha paketinizi seçip güvenli video yükleme akışını başlatın.</p></div>}
      <QurbaniManager canManage={canManage} initialSection={section} showNavigation={false} snapshot={snapshot} whatsapp={whatsapp} />
    </div>
  </ManagementShell>;
}
