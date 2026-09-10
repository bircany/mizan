"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import {
  previewTailGroups,
  saveTailGroups,
} from "@/lib/admin/tail-group-actions";
import type { TailGroupPreview } from "@/lib/donations/tail-groups";

export function TailGroupEditor({ campaignId }: { campaignId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<TailGroupPreview | null>(null);
  const [counts, setCounts] = useState([0, 0]);
  const [prices, setPrices] = useState(["", ""]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const money = (cents: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: data?.currency || "TRY",
    }).format(cents / 100);
  async function open() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setData(null);
    setMessage("");
    setSaved(false);
    setConfirmed(false);
    dialog.current?.showModal();
    try {
      const result = await previewTailGroups(campaignId);
      if (result.success) {
        setData(result.data);
        setCounts(result.data.groups.map((g) => g.count));
        setPrices(
          result.data.groups.map((g) => (g.priceCents / 100).toFixed(2)),
        );
      } else setMessage(result.message);
    } catch {
      setMessage("Önizleme yüklenemedi. Tekrar açın.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const priceCents = prices.map((p) => Math.round(Number(p) * 100));
  const valid =
    data &&
    counts.every(
      (n) => Number.isSafeInteger(n) && n >= data.minimum && n <= data.maximum,
    ) &&
    counts[0] + counts[1] === data.members.length &&
    prices.every(
      (p) =>
        /^\d+(\.\d{1,2})?$/.test(p) &&
        Number(p) >= 1 &&
        Number(p) <= 1_000_000_000,
    );
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !valid || !confirmed || saved) return;
    const form = new FormData(event.currentTarget);
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await saveTailGroups(form);
      setMessage(result.message);
      if (result.success) setSaved(true);
    } catch {
      setMessage(
        "Sonuç alınamadı. Yeniden açıp güncel grupları kontrol edin; körlemesine tekrar kaydetmeyin.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="mt-3 inline-flex min-h-8 w-fit self-center items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        onClick={open}
        type="button"
      >
        Son iki grubu düzenle
      </button>
      <dialog
        aria-labelledby={`tail-title-${campaignId}`}
        className="m-auto max-h-[90vh] w-[min(94vw,52rem)] overflow-auto rounded-2xl bg-[var(--admin-surface)] p-5 text-[var(--admin-text)] backdrop:bg-black/50"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        ref={dialog}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold" id={`tail-title-${campaignId}`}>
            Son iki grup · önizleme
          </h2>
          <button
            aria-label="Pencereyi kapat"
            className="admin-icon-button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            title="Pencereyi kapat"
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="my-4 text-sm">
          Bağış alımı kapalı olmalı, bekleyen ödemeler sonuçlanmalıdır. Hisseler
          silinmez; listede sınırdaki kişiler taşınır. Eski tahsilat ve
          makbuzlar değişmez. Yeni fiyatlar bu iki grubun planlama bedelidir;
          otomatik ek tahsilat veya iade yapılmaz. Bu işlemden sonra kampanya
          yeniden alıma açılamaz.
        </p>
        {busy ? <p role="status">İşleniyor…</p> : null}
        {message ? (
          <p className="my-3 rounded-lg border p-3" role="status">
            {message}
          </p>
        ) : null}
        {data ? (
          <form onSubmit={save}>
            <input name="campaignId" type="hidden" value={campaignId} />
            <input name="version" type="hidden" value={data.version} />
            <fieldset className="space-y-4" disabled={busy || saved}>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.groups.map((group, index) => {
                  const members = data.members.slice(
                    index === 0 ? 0 : counts[0],
                    index === 0 ? counts[0] : data.members.length,
                  );
                  const received = members.reduce(
                    (sum, m) => sum + m.receivedCents,
                    0,
                  );
                  const expected = counts[index] * priceCents[index];
                  return (
                    <section
                      className="min-w-0 rounded-xl border border-[var(--admin-border)] p-4"
                      key={group.id}
                    >
                      <h3 className="font-semibold">{group.code}</h3>
                      <p className="my-2 text-xs">
                        Mevcut: {group.count}/{group.capacity} hisse ·{" "}
                        {money(group.priceCents)}/hisse
                      </p>
                      <label className="block">
                        <span className="admin-label">Yeni hisse sayısı</span>
                        <input
                          className="admin-input"
                          min={data.minimum}
                          max={data.maximum}
                          name={`count${index}`}
                          onChange={(e) => {
                            setCounts(
                              counts.map((n, i) =>
                                i === index ? Number(e.target.value) : n,
                              ),
                            );
                            setConfirmed(false);
                          }}
                          required
                          step="1"
                          type="number"
                          value={counts[index]}
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="admin-label">
                          Hisse bedeli ({data.currency})
                        </span>
                        <input
                          className="admin-input"
                          min="1"
                          max="1000000000"
                          name={`price${index}`}
                          onChange={(e) => {
                            setPrices(
                              prices.map((p, i) =>
                                i === index ? e.target.value : p,
                              ),
                            );
                            setConfirmed(false);
                          }}
                          required
                          step="0.01"
                          type="number"
                          value={prices[index]}
                        />
                      </label>
                      <p className="my-3 text-sm">
                        Plan bedeli: {money(expected)}
                        <br />
                        Mevcut tahsilattan pay: {money(received)}
                        <br />
                        {expected > received ? "Eksik" : "Fazla"}:{" "}
                        {money(Math.abs(expected - received))}
                      </p>
                      <ul className="max-h-52 overflow-auto text-xs">
                        {members.map((m) => (
                          <li className="border-t py-2" key={m.id}>
                            {m.name} · hisse #{m.id}
                            {m.groupId !== group.id
                              ? " → bu gruba taşınacak"
                              : ""}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
              <p className={valid ? "text-sm" : "text-sm text-red-600"}>
                Korunacak toplam: {data.members.length} hisse. Yeni dağılım:{" "}
                {counts[0]} + {counts[1]}. Her grup {data.minimum}–
                {data.maximum} hisse.
              </p>
              <label className="block">
                <span className="admin-label">Düzenleme nedeni *</span>
                <textarea
                  className="admin-input"
                  maxLength={1000}
                  minLength={5}
                  name="reason"
                  required
                />
              </label>
              <label className="flex items-start gap-2">
                <input
                  checked={confirmed}
                  name="confirmed"
                  onChange={(e) => setConfirmed(e.target.checked)}
                  required
                  type="checkbox"
                />
                <span className="text-sm">
                  Eminim: kişi listesini, fiyatları ve farkları kontrol ettim.
                  Geçmiş tahsilatların değişmeyeceğini ve yeni alım için yeni
                  kampanya gerektiğini onaylıyorum.
                </span>
              </label>
              <button
                className="admin-action-button"
                disabled={!valid || !confirmed}
                type="submit"
              >
                Onaylanan dağılımı kaydet
              </button>
            </fieldset>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
