"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, ListChecks, QrCode, Search } from "lucide-react";

type PoolOption = {
  id: string;
  code: string;
  productTitle: string;
  taskTitle: string;
};

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

function destinationFromQr(value: string) {
  try {
    const url = new URL(value, window.location.origin);
    if (url.pathname !== "/panel/kurban/yukle") return null;
    if (!url.searchParams.get("pool")) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function QurbaniUploadSelector({ pools }: { pools: PoolOption[] }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) return pools;
    return pools.filter((pool) =>
      [pool.code, pool.productTitle, pool.taskTitle].some((value) =>
        value.toLocaleLowerCase("tr-TR").includes(normalized),
      ),
    );
  }, [pools, query]);

  async function scanQr(file: File | undefined) {
    if (!file) return;
    setMessage("");
    try {
      const Detector = (
        window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }
      ).BarcodeDetector;
      if (!Detector) {
        throw new Error(
          "Bu tarayıcı QR okumayı desteklemiyor. Kodu elle yazın veya listeden seçin.",
        );
      }
      const bitmap = await createImageBitmap(file);
      const [result] = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      bitmap.close();
      const destination = destinationFromQr(result?.rawValue || "");
      if (!destination) throw new Error("Görev QR kodu okunamadı.");
      window.location.assign(destination);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "QR kodu okunamadı.");
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <div className="admin-card">
        <p className="admin-eyebrow">Saha videosu</p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--admin-text)]">
          Kurbanı seçin veya QR kodunu okutun
        </h1>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Yalnız size devredilmiş görevler görünür. MD kodunu arayabilir, listeden
          seçebilir veya görev kağıdındaki imzalı QR kodunu kamerayla okutabilirsiniz.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-muted)]"
            />
            <input
              className="admin-input pl-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="MD-2026-0001 kodunu yazın"
              value={query}
            />
          </label>
          <label className="admin-action-button cursor-pointer justify-center">
            <Camera className="size-4" />
            QR okut
            <input
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => void scanQr(event.target.files?.[0])}
              type="file"
            />
          </label>
        </div>
        {message ? (
          <p aria-live="polite" className="mt-3 text-sm text-[var(--admin-danger)]">
            {message}
          </p>
        ) : null}
      </div>

      <div className="admin-card">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-[var(--admin-primary)]" />
          <h2 className="font-semibold">Atanmış kurbanlar</h2>
        </div>
        <div className="mt-4 divide-y divide-[var(--admin-border)]">
          {filtered.map((pool) => (
            <Link
              className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-[var(--admin-primary)]"
              href={`/panel/kurban/yukle?pool=${encodeURIComponent(pool.id)}`}
              key={pool.id}
            >
              <span>
                <strong className="block font-mono text-sm">{pool.code}</strong>
                <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                  {pool.productTitle} · {pool.taskTitle}
                </span>
              </span>
              <QrCode className="size-5 shrink-0" />
            </Link>
          ))}
          {!filtered.length ? (
            <p className="py-8 text-center text-sm text-[var(--admin-muted)]">
              Aramanızla eşleşen atanmış kurban bulunamadı.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
