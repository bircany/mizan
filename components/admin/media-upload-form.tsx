"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { ImageUp, LoaderCircle, Upload } from "lucide-react";

export function MediaUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Yüklenecek bir görsel seçin.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/media", {
          body: data,
          credentials: "same-origin",
          method: "POST",
        });

        if (!response.ok) {
          setError("Görsel yüklenemedi. Dosya türünü ve açıklama alanını kontrol edin.");
          return;
        }

        form.reset();
        router.refresh();
      } catch {
        setError("Görsel yüklenirken bağlantı sorunu oluştu. Lütfen tekrar deneyin.");
      }
    });
  }

  return (
    <form className="grid gap-4 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" onSubmit={submit}>
      <label>
        <span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Görsel dosyası *</span>
        <input accept="image/*" className="admin-input" disabled={isPending} name="file" type="file" />
      </label>
      <label>
        <span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Alternatif metin *</span>
        <input className="admin-input" disabled={isPending} name="alt" required type="text" />
      </label>
      <button className="admin-action-button sm:w-auto" disabled={isPending} type="submit">
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
        {isPending ? "Yükleniyor" : "Görsel yükle"}
      </button>
      {error ? <p aria-live="polite" className="sm:col-span-3 text-sm text-[var(--admin-danger)]">{error}</p> : <p className="sm:col-span-3 flex items-center gap-2 text-xs leading-5 text-[var(--admin-muted)]"><ImageUp aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> Yalnızca görsel dosyaları kabul edilir. Her görsel için anlamlı alternatif metin girin.</p>}
    </form>
  );
}
