import Image from "next/image";
import { ImageIcon, Trash2 } from "lucide-react";

import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { ManagementShell } from "@/components/admin/management-shell";
import { EmptyPanelState, PanelCard, PanelPageHeader } from "@/components/admin/panel-ui";
import { deleteMediaAsset } from "@/lib/admin/content-actions";
import { requireAdminUser } from "@/lib/admin/data";
import { PANEL_ROUTE_ACCESS } from "@/lib/auth/panel-access";
import { getPayloadClient } from "@/lib/payload";

export const dynamic = "force-dynamic";

function mediaUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return value.startsWith("/") ? value : `/${value}`;
}

export default async function MediaLibraryPage() {
  const user = await requireAdminUser(PANEL_ROUTE_ACCESS.contentMedia);
  const payload = await getPayloadClient();
  const result = await payload.find({ collection: "media", limit: 100, sort: "-createdAt" });

  return (
    <ManagementShell currentPath="/panel/icerik/medya" name={user.name || user.email} role={user.role}>
      <div className="space-y-6">
        <PanelPageHeader action={<span className="admin-status admin-status-info">Yalnızca süper yönetici</span>} description="Kampanya ve haberlerde kullanılacak görselleri yükleyin, açıklamalarını kontrol edin ve kütüphaneyi düzenleyin." eyebrow="İçerik yönetimi" title="Medya kütüphanesi" />
        <MediaUploadForm />
        <PanelCard className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-[var(--admin-border)] p-5"><span className="grid size-9 place-items-center rounded-md bg-[rgb(166_215_178_/_12%)] text-[var(--admin-primary)]"><ImageIcon aria-hidden="true" className="size-5" /></span><div><p className="text-sm font-semibold text-[var(--admin-text)]">Yüklenen görseller</p><p className="mt-1 text-xs text-[var(--admin-muted)]">Son eklenen 100 görsel listelenir.</p></div></div>
          {result.docs.length ? <div className="grid gap-px bg-[var(--admin-border)] sm:grid-cols-2 xl:grid-cols-3">{result.docs.map((document) => {
            const media = document as unknown as Record<string, unknown>;
            const src = mediaUrl(media.url);
            const alt = typeof media.alt === "string" ? media.alt : "Mizan Derneği görseli";
            const filename = typeof media.filename === "string" ? media.filename : "Görsel dosyası";

            return <article className="bg-[var(--admin-surface-muted)] p-4" key={String(media.id)}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--admin-surface-raised)]">
                {src ? <Image alt={alt} className="object-cover" fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" src={src} /> : <ImageIcon aria-hidden="true" className="absolute inset-0 m-auto size-8 text-[var(--admin-muted)]" />}
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-[var(--admin-text)]">{alt}</p>
              <p className="mt-1 truncate font-mono text-[11px] text-[var(--admin-muted)]">{filename}</p>
              <form action={deleteMediaAsset} className="mt-4"><input name="id" type="hidden" value={String(media.id)} /><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--admin-danger)]/40 px-3 text-xs font-semibold text-[var(--admin-danger)] transition-colors hover:bg-[rgb(255_122_115_/_12%)]" type="submit"><Trash2 aria-hidden="true" className="size-3.5" />Sil</button></form>
            </article>;
          })}</div> : <div className="p-5"><EmptyPanelState description="İlk görseli yüklediğinizde burada görünecek." title="Medya bulunmuyor" /></div>}
        </PanelCard>
      </div>
    </ManagementShell>
  );
}
