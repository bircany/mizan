"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  CirclePause,
  FilePlus2,
  LoaderCircle,
  MapPinned,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useFormStatus } from "react-dom";

import { EmptyPanelState, StatusBadge } from "@/components/admin/panel-ui";
import {
  adjustQurbaniStock,
  createManualPaidQurbaniOrder,
  createQurbaniFieldPackage,
  importManualQurbaniCsv,
  finalizePartialQurbaniPool,
  createQurbaniStockBatch,
  saveQurbaniCountry,
  setQurbaniStockBatchStatus,
  updateQurbaniStockPrice,
  type QurbaniActionState,
} from "@/lib/admin/qurbani-actions";
import type { QurbaniAdminSnapshot } from "@/lib/admin/qurbani-data";
import {
  groupQurbaniImportRows,
  parseQurbaniImportCsv,
} from "@/lib/qurbani/manual-import-csv";
import { formatCurrency } from "@/lib/utils";

type Mode =
  "countries" | "stock" | "sales" | "placement" | "manual" | "packages" | "documents";
type QuickRow = {
  id: string;
  productId: string;
  kind: "cattle" | "small_livestock";
  animalCount: number;
  capacity: number;
  price: number;
  currency: string;
  salesStartAt: string;
  salesEndAt: string;
};
const initialState: QurbaniActionState = { success: false, message: null };

function Submit({
  children,
  secondary = false,
  danger = false,
}: {
  children: React.ReactNode;
  secondary?: boolean;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={
        danger
          ? "admin-danger-button"
          : secondary
            ? "admin-secondary-button"
            : "admin-action-button"
      }
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function Message({ state }: { state: QurbaniActionState }) {
  return state.message ? (
    <p
      aria-live="polite"
      className={
        state.success
          ? "text-xs text-[var(--admin-primary)]"
          : "text-xs text-[var(--admin-danger)]"
      }
    >
      {state.message}
    </p>
  ) : null;
}

function emptyRow(): QuickRow {
  return {
    id: crypto.randomUUID(),
    productId: "",
    kind: "cattle",
    animalCount: 1,
    capacity: 7,
    price: 0,
    currency: "TRY",
    salesStartAt: "",
    salesEndAt: "",
  };
}

function QuickStockWizard({ initialOpen = false, snapshot }: { initialOpen?: boolean; snapshot: QurbaniAdminSnapshot }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<QuickRow[]>([]);
  const [singlePrice, setSinglePrice] = useState(true);
  const [sharedPrice, setSharedPrice] = useState(0);
  const [currency, setCurrency] = useState("TRY");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [batch, setBatch] = useState({
    seasonId: "",
    countryId: "",
    regionId: "",
    name: "",
    nature: "planned",
    startsAt: "",
    endsAt: "",
    notes: "",
  });
  const [state, action] = useActionState(createQurbaniStockBatch, initialState);
  const completed = state.success && state.requestKey === idempotencyKey;
  const payloadRows = rows.map((row, index) => ({
    ...row,
    sortOrder: index,
    price: singlePrice ? sharedPrice : row.price,
    currency: singlePrice ? currency : row.currency,
  }));
  const totalAnimals = rows.reduce((sum, row) => sum + row.animalCount, 0);
  const totalCapacity = rows.reduce(
    (sum, row) => sum + row.animalCount * row.capacity,
    0,
  );
  const productUseCounts = rows.reduce((counts, row) => {
    if (row.productId)
      counts.set(row.productId, (counts.get(row.productId) || 0) + 1);
    return counts;
  }, new Map<string, number>());
  const duplicateProductIds = new Set(
    [...productUseCounts]
      .filter(([, count]) => count > 1)
      .map(([productId]) => productId),
  );
  const hasDuplicateProduct = duplicateProductIds.size > 0;
  function patchRow(id: string, patch: Partial<QuickRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  function close() {
    setOpen(false);
    setStep(1);
    setRows([]);
    setIdempotencyKey("");
    setBatch({
      seasonId: "",
      countryId: "",
      regionId: "",
      name: "",
      nature: "planned",
      startsAt: "",
      endsAt: "",
      notes: "",
    });
  }
  function openWizard() {
    const activeSeason = snapshot.seasons.find((season) => season.status === "active") || snapshot.seasons[0];
    const initialCountry = activeSeason ? snapshot.countries.find((country) => snapshot.regions.some((region) => region.isActive && region.seasonId === activeSeason.id && region.countryId === country.id)) : undefined;
    const initialRegion = activeSeason && initialCountry ? snapshot.regions.find((region) => region.isActive && region.seasonId === activeSeason.id && region.countryId === initialCountry.id) : undefined;
    setStep(1);
    setRows([emptyRow()]);
    setIdempotencyKey(crypto.randomUUID());
    setBatch((current) => ({ ...current, seasonId: activeSeason?.id || "", countryId: initialCountry?.id || "", regionId: initialRegion?.id || "" }));
    setOpen(true);
  }
  useEffect(() => {
    if (!initialOpen || open) return;
    const timer = window.setTimeout(() => openWizard(), 0);
    return () => window.clearTimeout(timer);
    // The URL action is consumed on the first mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpen, open]);
  return (
    <>
      <button
        className="admin-action-button"
        onClick={openWizard}
        type="button"
      >
        <PackagePlus className="size-4" />
        Hızlı Kurbanlık Ekle
      </button>
      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[90] overflow-y-auto bg-[#173c30]/40 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="mx-auto my-8 max-w-5xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="admin-eyebrow">Hızlı stok sihirbazı</p>
                <h2 className="mt-2 text-xl font-semibold">
                  Karışık kurbanlık partisi oluştur
                </h2>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  Büyükbaş ve küçükbaş satırlarını aynı işlemde ekleyin. İşlem
                  anahtarı tekrar gönderimleri engeller.
                </p>
              </div>
              <button
                className="admin-secondary-button"
                onClick={close}
                type="button"
              >
                Kapat
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 rounded-xl bg-[var(--admin-surface)] p-1">
              {["Parti", "Satırlar", "Özet"].map((label, index) => (
                <span
                  className={
                    step === index + 1
                      ? "admin-tab admin-tab-active justify-center"
                      : "admin-tab justify-center"
                  }
                  key={label}
                >
                  {index + 1}. {label}
                </span>
              ))}
            </div>
            <form action={action} className="mt-6">
              <input
                name="idempotencyKey"
                type="hidden"
                value={idempotencyKey}
              />
              <input
                name="rows"
                type="hidden"
                value={JSON.stringify(payloadRows)}
              />
              {Object.entries(batch).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
              ))}
              {step === 1 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="admin-label">Sezon *</span>
                    <select
                      className="admin-input"
                      onChange={(event) => {
                        const seasonId = event.target.value;
                        const regionId = snapshot.regions.find(
                          (region) =>
                            region.isActive &&
                            region.seasonId === seasonId &&
                            region.countryId === batch.countryId,
                        )?.id || "";
                        setBatch((current) => ({
                          ...current,
                          seasonId,
                          regionId,
                        }));
                        setRows((current) =>
                          current.map((row) => ({ ...row, productId: "" })),
                        );
                      }}
                      required
                      value={batch.seasonId}
                    >
                      <option value="">Seçin</option>
                      {snapshot.seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="admin-label">Ülke *</span>
                    <select
                      className="admin-input"
                      onChange={(event) => {
                        const countryId = event.target.value;
                        const regionId = snapshot.regions.find(
                          (region) =>
                            region.isActive &&
                            region.seasonId === batch.seasonId &&
                            region.countryId === countryId,
                        )?.id || "";
                        setBatch((current) => ({
                          ...current,
                          countryId,
                          regionId,
                        }));
                        setRows((current) =>
                          current.map((row) => ({ ...row, productId: "" })),
                        );
                      }}
                      required
                      value={batch.countryId}
                    >
                      <option value="">Seçin</option>
                      {snapshot.countries
                        .filter((country) => country.isActive)
                        .map((country) => (
                          <option key={country.id} value={country.id}>
                            {country.name} · {country.isoCode}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span className="admin-label">Parti adı *</span>
                    <input
                      className="admin-input"
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                      value={batch.name}
                    />
                  </label>
                  <label>
                    <span className="admin-label">Sezon–ülke yapılandırması *</span>
                    <select
                      className="admin-input"
                      disabled={!batch.countryId || !batch.seasonId}
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          regionId: event.target.value,
                        }))
                      }
                      required
                      value={batch.regionId}
                    >
                      <option value="">Önce sezon için ülkeyi tanımlayın</option>
                      {snapshot.regions
                        .filter(
                          (region) =>
                            region.isActive &&
                            region.seasonId === batch.seasonId &&
                            region.countryId === batch.countryId,
                        )
                        .map((region) => (
                          <option key={region.id} value={region.id}>
                            {region.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span className="admin-label">Stok niteliği</span>
                    <select
                      className="admin-input"
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          nature: event.target.value,
                        }))
                      }
                      value={batch.nature}
                    >
                      <option value="planned">Planlanan</option>
                      <option value="secured">Tedariki kesin</option>
                    </select>
                  </label>
                  <label>
                    <span className="admin-label">Başlangıç</span>
                    <input
                      className="admin-input"
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          startsAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={batch.startsAt}
                    />
                  </label>
                  <label>
                    <span className="admin-label">Bitiş</span>
                    <input
                      className="admin-input"
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          endsAt: event.target.value,
                        }))
                      }
                      type="datetime-local"
                      value={batch.endsAt}
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="admin-label">Operasyon notu</span>
                    <textarea
                      className="admin-input"
                      onChange={(event) =>
                        setBatch((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      value={batch.notes}
                    />
                  </label>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-4">
                  <label className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-sm font-semibold">
                    <input
                      checked={singlePrice}
                      onChange={(event) => setSinglePrice(event.target.checked)}
                      type="checkbox"
                    />
                    Tüm satırlara tek fiyat uygula
                  </label>
                  {singlePrice ? (
                    <div className="grid gap-3 rounded-xl border border-[var(--admin-border)] p-4 sm:grid-cols-2">
                      <label>
                        <span className="admin-label">Ortak birim fiyat</span>
                        <input
                          className="admin-input"
                          min="0.01"
                          onChange={(event) =>
                            setSharedPrice(Number(event.target.value))
                          }
                          step="0.01"
                          type="number"
                          value={sharedPrice || ""}
                        />
                      </label>
                      <label>
                        <span className="admin-label">Para birimi</span>
                        <select
                          className="admin-input"
                          onChange={(event) => setCurrency(event.target.value)}
                          value={currency}
                        >
                          {["TRY", "USD", "EUR", "GBP"].map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {rows.map((row, index) => (
                    <article
                      className="rounded-xl border border-[var(--admin-border)] p-4"
                      key={row.id}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Satır {index + 1}
                        </p>
                        <button
                          aria-label="Satırı kaldır"
                          className="admin-icon-button"
                          disabled={rows.length === 1}
                          onClick={() =>
                            setRows((current) =>
                              current.filter((item) => item.id !== row.id),
                            )
                          }
                          type="button"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label>
                          <span className="admin-label">Kurbanlık seçeneği *</span>
                          <select
                            className="admin-input"
                            onChange={(event) =>
                              patchRow(row.id, {
                                productId: event.target.value,
                              })
                            }
                            required
                            value={row.productId}
                          >
                            <option value="">Seçin</option>
                            {!snapshot.products.some(
                              (product) =>
                                product.isActive &&
                                product.seasonId === batch.seasonId &&
                                product.countryId === batch.countryId &&
                                product.animalType === row.kind &&
                                product.capacity === row.capacity,
                            ) ? (
                              <option disabled>
                                Bu ülke, tür ve kapasite için kurbanlık seçeneği tanımlı değil
                              </option>
                            ) : null}
                            {snapshot.products
                              .filter(
                                (product) =>
                                  product.isActive &&
                                  product.seasonId === batch.seasonId &&
                                  product.countryId === batch.countryId &&
                                  product.animalType === row.kind &&
                                  product.capacity === row.capacity,
                              )
                              .map((product) => (
                                <option
                                  disabled={
                                    product.id !== row.productId &&
                                    productUseCounts.has(product.id)
                                  }
                                  key={product.id}
                                  value={product.id}
                                >
                                  {product.title} ·{" "}
                                  {product.animalType === "cattle"
                                    ? "Büyükbaş"
                                    : "Küçükbaş"}{" "}
                                  · {product.capacity} kapasiteli
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          <span className="admin-label">Tür</span>
                          <select
                            className="admin-input"
                            onChange={(event) => {
                              const kind = event.target
                                .value as QuickRow["kind"];
                              patchRow(row.id, {
                                kind,
                                capacity: kind === "small_livestock" ? 1 : 7,
                                productId: "",
                              });
                            }}
                            value={row.kind}
                          >
                            <option value="cattle">Büyükbaş</option>
                            <option value="small_livestock">Küçükbaş</option>
                          </select>
                        </label>
                        <label>
                          <span className="admin-label">Hayvan adedi</span>
                          <input
                            className="admin-input"
                            min="1"
                            onChange={(event) =>
                              patchRow(row.id, {
                                animalCount: Number(event.target.value),
                              })
                            }
                            type="number"
                            value={row.animalCount}
                          />
                        </label>
                        <label>
                          <span className="admin-label">Hayvan kapasitesi</span>
                          <input
                            className="admin-input"
                            disabled={row.kind === "small_livestock"}
                            max={row.kind === "cattle" ? 7 : 1}
                            min="1"
                            onChange={(event) =>
                              patchRow(row.id, {
                                capacity: Number(event.target.value),
                                productId: "",
                              })
                            }
                            type="number"
                            value={row.capacity}
                          />
                        </label>
                        {!singlePrice ? (
                          <>
                            <label>
                              <span className="admin-label">Birim fiyat</span>
                              <input
                                className="admin-input"
                                min="0.01"
                                onChange={(event) =>
                                  patchRow(row.id, {
                                    price: Number(event.target.value),
                                  })
                                }
                                step="0.01"
                                type="number"
                                value={row.price || ""}
                              />
                            </label>
                            <label>
                              <span className="admin-label">Para birimi</span>
                              <select
                                className="admin-input"
                                onChange={(event) =>
                                  patchRow(row.id, {
                                    currency: event.target.value,
                                  })
                                }
                                value={row.currency}
                              >
                                {["TRY", "USD", "EUR", "GBP"].map((item) => (
                                  <option key={item}>{item}</option>
                                ))}
                              </select>
                            </label>
                          </>
                        ) : null}
                        <label>
                          <span className="admin-label">Satış başlangıcı</span>
                          <input
                            className="admin-input"
                            onChange={(event) =>
                              patchRow(row.id, {
                                salesStartAt: event.target.value,
                              })
                            }
                            type="datetime-local"
                            value={row.salesStartAt}
                          />
                        </label>
                        <label>
                          <span className="admin-label">Satış bitişi</span>
                          <input
                            className="admin-input"
                            onChange={(event) =>
                              patchRow(row.id, {
                                salesEndAt: event.target.value,
                              })
                            }
                            type="datetime-local"
                            value={row.salesEndAt}
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs text-[var(--admin-muted)]">
                          Adedi hızlı seç:
                        </span>
                        {[1, 5, 10, 25].map((amount) => (
                          <button
                            className="admin-secondary-button px-2 py-1 text-xs"
                            key={amount}
                            onClick={() =>
                              patchRow(row.id, { animalCount: amount })
                            }
                            type="button"
                          >
                            +{amount}
                          </button>
                        ))}
                        <label className="inline-flex items-center gap-2 text-xs">
                          <span>Özel</span>
                          <input
                            className="admin-input h-8 w-20"
                            min="1"
                            onChange={(event) =>
                              patchRow(row.id, {
                                animalCount: Number(event.target.value),
                              })
                            }
                            type="number"
                            value={row.animalCount}
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                  {hasDuplicateProduct ? (
                    <p className="rounded-xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5 p-3 text-sm text-[var(--admin-danger)]">
                      Aynı kurbanlık seçeneği birden fazla stok satırında
                      kullanılamaz. Her ülke, tür ve kapasite seçeneğini yalnız
                      bir satırda seçin.
                    </p>
                  ) : null}
                  <button
                    className="admin-secondary-button"
                    onClick={() =>
                      setRows((current) => [...current, emptyRow()])
                    }
                    type="button"
                  >
                    <Plus className="size-4" />
                    Karışık satır ekle
                  </button>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="admin-metric">
                      <p className="admin-eyebrow">Satır</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {rows.length}
                      </p>
                    </div>
                    <div className="admin-metric">
                      <p className="admin-eyebrow">Hayvan</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {totalAnimals}
                      </p>
                    </div>
                    <div className="admin-metric">
                      <p className="admin-eyebrow">Toplam kapasite</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {totalCapacity}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--admin-border)]">
                    <div className="divide-y divide-[var(--admin-border)]">
                      {payloadRows.map((row, index) => (
                        <div
                          className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                          key={row.id}
                        >
                          <span>
                            {index + 1}.{" "}
                            {row.kind === "cattle" ? "Büyükbaş" : "Küçükbaş"} ·{" "}
                            {row.animalCount} hayvan × {row.capacity} kapasite
                          </span>
                          <span>{formatCurrency(row.price, row.currency)}</span>
                          <span className="font-mono text-xs">
                            {row.animalCount * row.capacity} slot
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="font-mono text-[11px] text-[var(--admin-muted)]">
                    İşlem anahtarı: {idempotencyKey}
                  </p>
                  <Message
                    state={completed || !state.success ? state : initialState}
                  />
                  {completed ? (
                    <div className="rounded-xl bg-[var(--admin-surface)] p-4 text-sm text-[var(--admin-primary)]">
                      <CheckCircle2 className="mb-2 size-5" />
                      Stok partisi, satırlar, fiyat revizyonları ve boş havuzlar
                      tek işlemde oluşturuldu.
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {step > 1 && !completed ? (
                  <button
                    className="admin-secondary-button"
                    onClick={() => setStep((value) => value - 1)}
                    type="button"
                  >
                    Geri
                  </button>
                ) : null}
                {step < 3 ? (
                  <button
                    className="admin-action-button"
                    disabled={
                      (step === 1 &&
                        (!batch.seasonId ||
                          !batch.countryId ||
                          !batch.name.trim())) ||
                      (step === 2 &&
                        (hasDuplicateProduct ||
                          !rows.length ||
                          payloadRows.some(
                            (row) =>
                              !row.productId ||
                              row.animalCount < 1 ||
                              row.capacity < 1 ||
                              row.price <= 0,
                          )))
                    }
                    onClick={() => setStep((value) => value + 1)}
                    type="button"
                  >
                    Devam
                  </button>
                ) : null}
                {step === 3 && !completed ? (
                  <Submit>
                    <PackagePlus className="size-4" />
                    Stoku tek işlemde oluştur
                  </Submit>
                ) : null}
                {completed ? (
                  <button
                    className="admin-action-button"
                    onClick={close}
                    type="button"
                  >
                    Tamamla
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CountryPanel({ snapshot }: { snapshot: QurbaniAdminSnapshot }) {
  const [state, action] = useActionState(saveQurbaniCountry, initialState);
  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <form action={action} className="admin-card h-fit space-y-4">
        <div>
          <p className="admin-eyebrow">Operasyon ülkesi</p>
          <h3 className="mt-2 font-semibold">Yeni ülke ekle</h3>
        </div>
        <label>
          <span className="admin-label">Sezon *</span>
          <select className="admin-input" name="seasonId" required>
            <option value="">Seçin</option>
            {snapshot.seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.year} · {season.status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="admin-label">ISO kodu *</span>
          <input
            className="admin-input uppercase"
            maxLength={2}
            name="isoCode"
            required
          />
        </label>
        <label>
          <span className="admin-label">Türkçe ad *</span>
          <input className="admin-input" name="name_tr" required />
        </label>
        <label>
          <span className="admin-label">İngilizce ad</span>
          <input className="admin-input" name="name_en" />
        </label>
        <label>
          <span className="admin-label">Arapça ad</span>
          <input className="admin-input" dir="rtl" name="name_ar" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="admin-label">Satış başlangıcı</span>
            <input className="admin-input" name="salesStartAt" type="datetime-local" />
          </label>
          <label>
            <span className="admin-label">Satış bitişi</span>
            <input className="admin-input" name="salesEndAt" type="datetime-local" />
          </label>
        </div>
        <label>
          <span className="admin-label">Saha hazırlık tarihi</span>
          <input className="admin-input" name="fieldPreparationAt" type="datetime-local" />
          <span className="mt-1 block text-xs text-[var(--admin-muted)]">
            Boş bırakılırsa ülkenin sayacı satış bitiş tarihinde tamamlanır.
          </span>
        </label>
        <label className="flex gap-2 text-sm">
          <input defaultChecked name="isActive" type="checkbox" />
          Aktif
        </label>
        <Submit>Ülkeyi kaydet</Submit>
        <Message state={state} />
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {snapshot.countries.map((country) => (
          <article className="admin-card" key={country.id}>
            <div className="flex justify-between">
              <span className="font-mono text-xs text-[var(--admin-primary)]">
                {country.isoCode}
              </span>
              <StatusBadge status={country.isActive ? "active" : "stopped"} />
            </div>
            <h3 className="mt-3 font-semibold">{country.name}</h3>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              /{country.slug}
            </p>
          </article>
        ))}
        {!snapshot.countries.length ? (
          <EmptyPanelState
            description="Stok partisini ülke ve bölge bazında yönetmek için ilk ülkeyi ekleyin."
            title="Ülke bulunmuyor"
          />
        ) : null}
      </div>
    </div>
  );
}

function BatchCard({
  batch,
  lines,
}: {
  batch: QurbaniAdminSnapshot["stockBatches"][number];
  lines: QurbaniAdminSnapshot["stockLines"];
}) {
  const [stockState, stockAction] = useActionState(
    adjustQurbaniStock,
    initialState,
  );
  const [statusState, statusAction] = useActionState(
    setQurbaniStockBatchStatus,
    initialState,
  );
  const [priceState, priceAction] = useActionState(
    updateQurbaniStockPrice,
    initialState,
  );
  const batchLines = lines.filter((line) => line.batchId === batch.id);
  return (
    <article className="admin-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-[var(--admin-primary)]">
            {batch.code}
          </p>
          <h3 className="mt-2 font-semibold">{batch.name}</h3>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {batch.countryName} ·{" "}
            {batch.nature === "secured" ? "Tedariki kesin" : "Planlanan"}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-[var(--admin-surface)] p-3">
          <strong className="block text-base">{batch.animalCount}</strong>hayvan
        </div>
        <div className="rounded-lg bg-[var(--admin-surface)] p-3">
          <strong className="block text-base">{batch.totalCapacity}</strong>
          kapasite
        </div>
        <div className="rounded-lg bg-[var(--admin-surface)] p-3">
          <strong className="block text-base">{batch.availableCapacity}</strong>
          boş
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {batchLines.map((line) => (
          <div
            className="rounded-lg border border-[var(--admin-border)] p-3 text-xs"
            key={line.id}
          >
            <div className="flex justify-between">
              <span>
                {line.kind === "cattle" ? "Büyükbaş" : "Küçükbaş"} ·{" "}
                {line.animalCount} × {line.capacity}
              </span>
              <strong>{formatCurrency(line.unitPrice, line.currency)}</strong>
            </div>
          </div>
        ))}
      </div>
      <details className="mt-4 rounded-xl border border-[var(--admin-border)] p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Hızlı stok işlemleri
        </summary>
        <div className="mt-4 space-y-4">
          <form action={stockAction} className="space-y-2">
            <input name="batchId" type="hidden" value={batch.id} />
            <label>
              <span className="admin-label">Kurbanlık seçeneği *</span>
              <select className="admin-input" name="batchLineId" required>
                <option value="">Seçin</option>
                {batchLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.productTitle} · {line.animalCount} × {line.capacity}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[var(--admin-muted)]">
              Boş stok ekle / azalt
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 5, 10, 25].map((amount) => (
                <button
                  className="admin-secondary-button"
                  key={amount}
                  name="delta"
                  type="submit"
                  value={amount}
                >
                  +{amount}
                </button>
              ))}
              <button
                className="admin-secondary-button"
                name="delta"
                type="submit"
                value="-1"
              >
                <Minus className="size-4" />1
              </button>
              <input
                className="admin-input w-24"
                name="customDelta"
                placeholder="Özel"
                type="number"
              />
              <button className="admin-secondary-button" type="submit">
                Özel farkı uygula
              </button>
            </div>
            <input
              className="admin-input"
              name="reason"
              placeholder="Azaltma veya düzeltme nedeni"
            />
            <Message state={stockState} />
          </form>
          <form
            action={statusAction}
            className="flex flex-wrap items-center gap-2"
          >
            <input name="batchId" type="hidden" value={batch.id} />
            <button
              className="admin-secondary-button"
              name="status"
              type="submit"
              value={batch.status === "paused" ? "active" : "paused"}
            >
              <CirclePause className="size-4" />
              {batch.status === "paused" ? "Devam ettir" : "Stoku duraklat"}
            </button>
            <button
              className="admin-secondary-button"
              name="status"
              type="submit"
              value="archived"
            >
              <Archive className="size-4" />
              Arşivle
            </button>
            <Message state={statusState} />
          </form>
          <form
            action={priceAction}
            className="grid gap-2 sm:grid-cols-[1fr_8rem_7rem_auto]"
          >
            <select className="admin-input" name="batchLineId" required>
              <option value="">Fiyat satırı</option>
              {batchLines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.productTitle} · {line.kind}
                </option>
              ))}
            </select>
            <input
              className="admin-input"
              min="0.01"
              name="unitPrice"
              placeholder="Yeni fiyat"
              required
              step="0.01"
              type="number"
            />
            <select className="admin-input" name="currency">
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
            <Submit secondary>
              <RefreshCw className="size-4" />
              Fiyatı değiştir
            </Submit>
            <input
              className="admin-input sm:col-span-4"
              name="reason"
              placeholder="Fiyat değişikliği nedeni *"
              required
            />
            <Message state={priceState} />
          </form>
        </div>
      </details>
    </article>
  );
}

function ManualPanel({ snapshot }: { snapshot: QurbaniAdminSnapshot }) {
  const [state, action] = useActionState(
    createManualPaidQurbaniOrder,
    initialState,
  );
  return (
    <form action={action} className="admin-card mx-auto max-w-4xl">
      <div>
        <p className="admin-eyebrow">Yetkili manuel kayıt</p>
        <h3 className="mt-2 text-lg font-semibold">
          Kesin ödenmiş kurban kaydı
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Bu akış yalnız final “paid” kayıt üretir. Fiyat değişikliği gerekirse
          neden zorunludur ve denetime yazılır.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="admin-label">Kurbanlık seçeneği *</span>
          <select className="admin-input" name="productId" required>
            <option value="">Seçin</option>
            {snapshot.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="admin-label">Hisse sayısı *</span>
          <input
            className="admin-input"
            max="7"
            min="1"
            name="shareCount"
            required
            type="number"
          />
        </label>
        <label>
          <span className="admin-label">Alıcı adı *</span>
          <input className="admin-input" name="buyerName" required />
        </label>
        <label>
          <span className="admin-label">Telefon *</span>
          <input
            className="admin-input"
            name="buyerPhone"
            required
            type="tel"
          />
        </label>
        <label>
          <span className="admin-label">E-posta</span>
          <input className="admin-input" name="buyerEmail" type="email" />
        </label>
        <label>
          <span className="admin-label">Kimlik / pasaport</span>
          <input className="admin-input" name="identityNumber" />
        </label>
        <label>
          <span className="admin-label">Vekâlet yöntemi *</span>
          <select className="admin-input" name="proxyMethod" required>
            <option value="phone">Telefon</option>
            <option value="written">Yazılı</option>
            <option value="digital">Dijital</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Vekâlet tarihi *</span>
          <input
            className="admin-input"
            name="proxyAt"
            required
            type="datetime-local"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="admin-label">Adres</span>
          <textarea className="admin-input" name="address" />
        </label>
        <label>
          <span className="admin-label">Fiyat override</span>
          <input
            className="admin-input"
            min="0"
            name="overridePrice"
            step="0.01"
            type="number"
          />
        </label>
        <label>
          <span className="admin-label">Override nedeni</span>
          <input className="admin-input" name="overrideReason" />
        </label>
        <label className="sm:col-span-2">
          <span className="admin-label">Not</span>
          <textarea className="admin-input" name="note" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Message state={state} />
        <Submit>
          <Users className="size-4" />
          Paid kaydı oluştur
        </Submit>
      </div>
    </form>
  );
}

function ManualCsvImportPanel() {
  const [state, action] = useActionState(importManualQurbaniCsv, initialState);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [preview, setPreview] = useState<{ rows: number; groups: number; error: string } | null>(null);
  return (
    <form action={action} className="admin-card mx-auto mt-5 max-w-4xl">
      <input name="idempotencyKey" type="hidden" value={requestKey} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="admin-eyebrow">Toplu manuel kayıt</p>
          <h3 className="mt-2 text-lg font-semibold">CSV ile kesin ödenmiş kayıt aktar</h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Önizlemede bütün satırlar geçmeden kaydetme başlamaz; herhangi bir hata oluşursa hiçbir grup yazılmaz.
          </p>
        </div>
        <Link className="admin-secondary-button" href="/api/qurbani/manual-import/template" prefetch={false}>
          CSV şablonunu indir
        </Link>
      </div>
      <label className="mt-5 block">
        <span className="admin-label">Doldurulmuş CSV *</span>
        <input
          accept=".csv,text/csv"
          className="admin-input"
          name="file"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return setPreview(null);
            try {
              const rows = parseQurbaniImportCsv(await file.text());
              const groups = groupQurbaniImportRows(rows);
              setPreview({ rows: rows.length, groups: groups.length, error: "" });
            } catch (error) {
              setPreview({ rows: 0, groups: 0, error: error instanceof Error ? error.message : "CSV okunamadı." });
            }
          }}
          required
          type="file"
        />
      </label>
      {preview ? (
        <div className="mt-4 rounded-xl border border-[var(--admin-border)] p-4 text-sm">
          {preview.error ? (
            <p className="text-[var(--admin-danger)]">{preview.error}</p>
          ) : (
            <p><strong>{preview.rows}</strong> satır · <strong>{preview.groups}</strong> ödeme grubu · doğrulama başarılı</p>
          )}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <Message state={state} />
        <button className="admin-action-button" disabled={!preview || Boolean(preview.error)} type="submit">
          <Users className="size-4" />Tümünü transaction ile içe aktar
        </button>
      </div>
    </form>
  );
}

function ArchiveDocumentButton({ documentId }: { documentId: string }) {
  const [pending, setPending] = useState(false);
  async function archive() {
    const reason = window.prompt("Belgeyi arşivleme nedeni:")?.trim();
    if (!reason) return;
    setPending(true);
    const response = await fetch(
      `/api/qurbani/documents/${encodeURIComponent(documentId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      },
    );
    setPending(false);
    if (response.ok) window.location.reload();
    else window.alert("Belge arşivlenemedi.");
  }
  return (
    <button
      className="admin-secondary-button"
      disabled={pending}
      onClick={archive}
      type="button"
    >
      <Archive className="size-4" />
      {pending ? "Arşivleniyor…" : "Arşivle"}
    </button>
  );
}

function DocumentPanel({ snapshot }: { snapshot: QurbaniAdminSnapshot }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/qurbani/documents", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Belge yüklenemedi.");
      setMessage("Belge güvenli depoya yüklendi.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Belge yüklenemedi.");
    } finally {
      setPending(false);
    }
  }
  return <div className="space-y-4"><form action={upload} className="admin-card"><div className="flex items-center gap-3"><FilePlus2 className="size-5 text-[var(--admin-primary)]"/><div><p className="font-semibold">Parti belgesi yükle</p><p className="text-xs text-[var(--admin-muted)]">PDF/JPG/PNG, en fazla 25 MB; varsayılan private ve yalnız seçilen stok partisine bağlıdır.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Stok partisi *</span><select className="admin-input" name="stockBatchId" required><option value="">Seçin</option>{snapshot.stockBatches.map((batch)=><option key={batch.id} value={batch.id}>{batch.code} · {batch.name}</option>)}</select></label><label><span className="admin-label">Belge türü *</span><select className="admin-input" name="kind" required><option value="invoice">Fatura</option><option value="veterinary">Veteriner belgesi</option><option value="contract">Sözleşme</option><option value="slaughterhouse">Kesimhane belgesi</option><option value="ear_tag_list">Küpe listesi</option><option value="transport">Nakliye</option><option value="other">Diğer</option></select></label><label><span className="admin-label">Başlık *</span><input className="admin-input" name="title" required/></label><label><span className="admin-label">Dosya *</span><input accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" className="admin-input" name="file" required type="file"/></label><label className="flex items-center gap-2 text-sm"><input name="isPublic" type="checkbox"/>Public görüntülenebilir</label><label><span className="admin-label">Not</span><input className="admin-input" name="notes"/></label></div><div className="mt-5 flex items-center justify-end gap-3">{message?<p aria-live="polite" className="text-xs text-[var(--admin-muted)]">{message}</p>:null}<button className="admin-action-button" disabled={pending} type="submit"><FilePlus2 className="size-4"/>{pending?"Yükleniyor…":"Belgeyi yükle"}</button></div></form><div className="grid gap-3 md:grid-cols-2">{snapshot.documents.map((document)=><article className="admin-card" key={document.id}><div className="flex justify-between"><span className="font-mono text-xs">{document.kind}</span><StatusBadge status={document.status}/></div><h3 className="mt-3 font-semibold">{document.title}</h3><p className="mt-1 text-xs text-[var(--admin-muted)]">{document.fileName||"Dosya bilgisi yok"}</p><div className="mt-4 flex flex-wrap gap-2"><a className="admin-secondary-button" href={`/api/qurbani/documents/${encodeURIComponent(document.id)}`} rel="noreferrer" target="_blank">Belgeyi aç</a>{document.status === "active" ? <ArchiveDocumentButton documentId={document.id} /> : null}</div></article>)}{!snapshot.documents.length?<EmptyPanelState description="Fatura, veteriner, sözleşme, kesimhane, küpe listesi ve nakliye belgeleri burada tutulur." title="Belge bulunmuyor"/>:null}</div></div>;
}

function FieldPackagePanel({ snapshot }: { snapshot: QurbaniAdminSnapshot }) {
  const [state, action] = useActionState(createQurbaniFieldPackage, initialState);
  const [requestKey] = useState(() => crypto.randomUUID());
  const readyPools = snapshot.pools.filter(
    (pool) =>
      pool.status === "full" &&
      !pool.lockedAt &&
      !pool.code &&
      !snapshot.packagedPoolIds.includes(pool.id),
  );
  return (
    <div className="space-y-5">
      <form action={action} className="admin-card">
        <input name="idempotencyKey" type="hidden" value={requestKey} />
        <div>
          <p className="admin-eyebrow">Toplu saha devri</p>
          <h3 className="mt-2 text-lg font-semibold">Saha görev paketi oluştur</h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Yalnız kesin ödemeyle dolmuş havuzlar seçilebilir. Onaydan sonra MD kodları üretilir ve yerleşimler kilitlenir.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="admin-label">Paket adı *</span>
            <input className="admin-input" name="name" required />
          </label>
          <label>
            <span className="admin-label">Saha görevlisi *</span>
            <select className="admin-input" name="operatorId" required>
              <option value="">Seçin</option>
              {snapshot.operators.map((operator) => (
                <option key={operator.value} value={operator.value}>{operator.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="admin-label">Teslim tarihi</span>
            <input className="admin-input" name="dueAt" type="datetime-local" />
          </label>
          <label>
            <span className="admin-label">Operasyon notu</span>
            <input className="admin-input" name="notes" />
          </label>
        </div>
        <fieldset className="mt-5 grid gap-2 md:grid-cols-2">
          <legend className="admin-label mb-2">Hazır kurbanlar *</legend>
          {readyPools.map((pool) => (
            <label className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-3 text-sm" key={pool.id}>
              <input name="poolIds" type="checkbox" value={pool.id} />
              <span><strong>{pool.productTitle}</strong><br/><span className="text-xs text-[var(--admin-muted)]">Slot {pool.ordinal} · {pool.capacity}/{pool.capacity} kesin</span></span>
            </label>
          ))}
        </fieldset>
        {!readyPools.length ? <p className="mt-4 text-sm text-[var(--admin-muted)]">Paketlenmeye hazır, tam dolu havuz bulunmuyor.</p> : null}
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input name="allowEarly" type="checkbox" />
          <span>Ülkenin saha hazırlık tarihi gelmeden erken devir başlat.</span>
        </label>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Message state={state} />
          <Submit><PackagePlus className="size-4" />Paketi oluştur ve devret</Submit>
        </div>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.fieldPackages.map((item) => (
          <article className="admin-card" key={item.id}>
            <div className="flex justify-between"><span className="font-mono text-xs">{item.code}</span><StatusBadge status={item.status} /></div>
            <p className="mt-3 text-sm">{item.animalCount} hayvan</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="admin-secondary-button" href={`/api/qurbani/field-packages/${item.id}/export?format=pdf`}>PDF indir</a>
              <a className="admin-secondary-button" href={`/api/qurbani/field-packages/${item.id}/export?format=excel`}>Excel indir</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FinalizePartialPoolForm({ poolId }: { poolId: string }) {
  const [state, action] = useActionState(finalizePartialQurbaniPool, initialState);
  return (
    <form action={action} className="mt-3 space-y-2 border-t border-[var(--admin-border)] pt-3">
      <input name="poolId" type="hidden" value={poolId} />
      <input className="admin-input" name="reason" placeholder="Kapasite düşürme nedeni *" required />
      <Submit secondary>Eksik grubu bu kapasitede kesinleştir</Submit>
      <Message state={state} />
    </form>
  );
}

export function QurbaniStockManager({
  mode,
  openQuickStock = false,
  snapshot,
}: {
  mode: Mode;
  openQuickStock?: boolean;
  snapshot: QurbaniAdminSnapshot;
}) {
  if (mode === "countries") return <CountryPanel snapshot={snapshot} />;
  if (mode === "manual")
    return <div><ManualPanel snapshot={snapshot} /><ManualCsvImportPanel /></div>;
  if (mode === "stock" || mode === "sales")
    return (
      <div className="space-y-5">
        <div className="flex justify-end">
          <QuickStockWizard initialOpen={openQuickStock} snapshot={snapshot} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.stockBatches.map((batch) => (
            <BatchCard
              batch={batch}
              key={batch.id}
              lines={snapshot.stockLines}
            />
          ))}
          {!snapshot.stockBatches.length ? (
            <EmptyPanelState
              description="Hızlı Kurbanlık Ekle sihirbazıyla ilk karışık stok partisini oluşturun."
              title="Stok partisi yok"
            />
          ) : null}
        </div>
        {mode === "sales" ? <details className="admin-card"><summary className="cursor-pointer text-sm font-semibold">Manuel kesin ödenmiş kayıt ve CSV aktarımı</summary><div className="mt-5"><ManualPanel snapshot={snapshot} /><ManualCsvImportPanel /></div></details> : null}
      </div>
    );
  if (mode === "placement")
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="admin-metric">
            <p className="admin-eyebrow">Hayvan / slot</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot.pools.length}
            </p>
          </div>
          <div className="admin-metric">
            <p className="admin-eyebrow">Boş</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot.pools.filter((pool) => pool.status === "open").length}
            </p>
          </div>
          <div className="admin-metric">
            <p className="admin-eyebrow">Dolu / atanmış</p>
            <p className="mt-2 text-2xl font-semibold">
              {
                snapshot.pools.filter((pool) =>
                  ["full", "assigned", "in_progress"].includes(pool.status),
                ).length
              }
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.pools.map((pool) => (
            <article className="admin-card" key={pool.id}>
              <div className="flex justify-between">
                <span className="font-mono text-xs">
                  {pool.code || `Slot ${pool.ordinal}`}
                </span>
                <StatusBadge status={pool.status} />
              </div>
              <p className="mt-3 font-semibold">{pool.productTitle}</p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {pool.paidCount}/{pool.capacity} kesin · {pool.reservedCount}{" "}
                rezerve
              </p>
              {pool.status === "open" &&
              pool.paidCount > 0 &&
              pool.paidCount < pool.capacity &&
              pool.reservedCount === 0 ? (
                <FinalizePartialPoolForm poolId={pool.id} />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    );
  if (mode === "packages")
    return <FieldPackagePanel snapshot={snapshot} />;
  return <DocumentPanel snapshot={snapshot} />;
}
