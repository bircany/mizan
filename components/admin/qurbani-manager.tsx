"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Beef,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
  X,
} from "lucide-react";

import {
  EmptyPanelState,
  PanelMetric,
  StatusBadge,
} from "@/components/admin/panel-ui";
import { QurbaniVideoUploader } from "@/components/admin/qurbani-video-uploader";
import { QurbaniStockManager } from "@/components/admin/qurbani-stock-manager";
import {
  approveQurbaniEft,
  approveQurbaniVideoRecord,
  assignQurbaniPool,
  disconnectQurbaniWhatsApp,
  markPowerOfAttorneyConfirmed,
  prepareQurbaniMessages,
  saveQurbaniProduct,
  saveQurbaniSeason,
  sendQurbaniMessages,
  setQurbaniMessageDispatchState,
  transferQurbaniOrderToPool,
  revokeQurbaniTrackingLink,
  type QurbaniActionState,
} from "@/lib/admin/qurbani-actions";
import type {
  QurbaniAdminSnapshot,
  QurbaniPoolAdminRecord,
} from "@/lib/admin/qurbani-data";
import { formatCurrency } from "@/lib/utils";

const initialState: QurbaniActionState = { success: false, message: null };
const legacyTabs = [
  ["overview", "Genel durum"],
  ["catalog", "Sezon ve kurbanlık seçenekleri"],
  ["countries", "Ülke / bölge"],
  ["stock", "Stok partileri"],
  ["placement", "Havuz yerleşimi"],
  ["manual", "Manuel kayıt"],
  ["orders", "Sipariş / dekont"],
  ["shares", "Hissedarlar"],
  ["pools", "Havuzlar"],
  ["field", "Saha ve videolar"],
  ["packages", "Saha paketleri"],
  ["documents", "Belgeler"],
  ["messages", "Mesajlar"],
  ["whatsapp", "WhatsApp"],
] as const;
const tabs = [
  ["sales", "Satış ve stok"],
  ["orders", "Siparişler"],
  ["field", "Saha"],
  ["delivery", "Teslimat"],
  ["settings", "Kurban Ayarları"],
] as const;
type Tab = (typeof tabs)[number][0];

export type QurbaniWhatsAppStatus = {
  state: "connected" | "connecting" | "disconnected" | "unconfigured" | "error";
  instanceName?: string;
  phone?: string;
  qrCodeDataUrl?: string;
  message?: string;
};

function SubmitButton({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={danger ? "admin-danger-button" : "admin-action-button"}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : null}
      {children}
    </button>
  );
}

function ActionMessage({ state }: { state: QurbaniActionState }) {
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

function ActionForm({
  action,
  children,
  fields,
  danger = false,
}: {
  action: (
    state: QurbaniActionState,
    data: FormData,
  ) => Promise<QurbaniActionState>;
  children: React.ReactNode;
  fields: Record<string, string>;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <SubmitButton danger={danger}>{children}</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose(): void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#19362c]/35 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <button
        aria-label="Pencereyi kapat"
        className="absolute inset-0"
        onClick={onClose}
        type="button"
      />
      <section className="relative my-8 w-full max-w-3xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              {description}
            </p>
          </div>
          <button
            aria-label="Pencereyi kapat"
            className="admin-icon-button"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function localDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function SeasonForm({
  onClose,
  record,
}: {
  onClose(): void;
  record?: QurbaniAdminSnapshot["seasons"][number];
}) {
  const [state, action] = useActionState(saveQurbaniSeason, initialState);
  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);
  return (
    <Modal
      description="Satış takvimi, bayram tarihi ve EFT bilgilerini tek sezonda yönetin."
      onClose={onClose}
      title={record ? "Kurban sezonunu düzenle" : "Yeni kurban sezonu"}
    >
      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
        {record ? <input name="id" type="hidden" value={record.id} /> : null}
        <label>
          <span className="admin-label">Yıl *</span>
          <input
            className="admin-input"
            defaultValue={record?.year ?? new Date().getFullYear()}
            min="2020"
            name="year"
            required
            type="number"
          />
        </label>
        <label>
          <span className="admin-label">Durum</span>
          <select
            className="admin-input"
            defaultValue={record?.status || "draft"}
            name="status"
          >
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="sales_closed">Satış kapalı</option>
            <option value="completed">Tamamlandı</option>
            <option value="archived">Arşiv</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Satış başlangıcı *</span>
          <input
            className="admin-input"
            defaultValue={localDateTime(record?.salesStartAt || "")}
            name="salesStartAt"
            required
            type="datetime-local"
          />
        </label>
        <label>
          <span className="admin-label">Satış bitişi *</span>
          <input
            className="admin-input"
            defaultValue={localDateTime(record?.salesEndAt || "")}
            name="salesEndAt"
            required
            type="datetime-local"
          />
        </label>
        <label>
          <span className="admin-label">Bayram tarihi *</span>
          <input
            className="admin-input"
            defaultValue={localDateTime(record?.feastAt || "")}
            name="feastAt"
            required
            type="datetime-local"
          />
        </label>
        <label>
          <span className="admin-label">Banka</span>
          <input
            className="admin-input"
            defaultValue={record?.bankName}
            name="bankName"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="admin-label">IBAN</span>
          <input
            className="admin-input font-mono"
            defaultValue={record?.iban}
            name="iban"
            placeholder="TR00 0000 0000 0000 0000 0000 00"
          />
        </label>
        <label>
          <span className="admin-label">Türkçe başlık *</span>
          <input
            className="admin-input"
            defaultValue={record?.titles.tr}
            name="title_tr"
            required
          />
        </label>
        <label>
          <span className="admin-label">İngilizce başlık</span>
          <input
            className="admin-input"
            defaultValue={record?.titles.en}
            name="title_en"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="admin-label">Arapça başlık</span>
          <input
            className="admin-input"
            defaultValue={record?.titles.ar}
            dir="rtl"
            name="title_ar"
          />
        </label>
        <label>
          <span className="admin-label">Vekâlet metni sürümü *</span>
          <input
            className="admin-input"
            defaultValue={record?.proxyTextVersion || "1.0"}
            name="proxyTextVersion"
            required
          />
        </label>
        <label className="sm:col-span-2">
          <span className="admin-label">Dijital vekâlet metni *</span>
          <textarea
            className="admin-input min-h-28"
            defaultValue={record?.proxyText}
            name="proxyText_tr"
            required
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
          <ActionMessage state={state} />
          <button
            className="admin-secondary-button"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <SubmitButton>Sezonu kaydet</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function ProductForm({
  onClose,
  onCreateSeason,
  seasons,
  campaigns,
  fundingPools,
  record,
}: {
  onClose(): void;
  onCreateSeason(): void;
  seasons: QurbaniAdminSnapshot["seasons"];
  campaigns: QurbaniAdminSnapshot["campaigns"];
  fundingPools: QurbaniAdminSnapshot["fundingPools"];
  record?: QurbaniAdminSnapshot["products"][number];
}) {
  const [state, action] = useActionState(saveQurbaniProduct, initialState);
  const [kind, setKind] = useState(record?.animalType || "cattle");
  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  if (!seasons.length) {
    return (
      <Modal
        description="Kurbanlık seçeneği fiyat, tarih ve kod sırasını bir sezondan alır. Bu nedenle önce sezon kaydı oluşturulmalıdır."
        onClose={onClose}
        title="Önce kurban sezonu oluşturun"
      >
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">
            Henüz kullanılabilir sezon bulunmuyor.
          </p>
          <p className="mt-2 leading-6">
            Satış başlangıç/bitiş tarihini, bayram tarihini ve vekâlet metnini
            kaydettikten sonra kurbanlık seçeneği ekleyebilirsiniz.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="admin-secondary-button"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <button
            className="admin-action-button"
            onClick={onCreateSeason}
            type="button"
          >
            <CalendarDays className="size-4" />
            Yeni sezon oluştur
          </button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal
      description="Fiyat tarayıcıdan değil, bu kayıttan sunucuda hesaplanır."
      onClose={onClose}
      title={record ? "Kurbanlık seçeneğini düzenle" : "Yeni kurbanlık seçeneği"}
    >
      <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
        {record ? <input name="id" type="hidden" value={record.id} /> : null}
        <label>
          <span className="admin-label">Sezon *</span>
          <select
            className="admin-input"
            defaultValue={record?.seasonId}
            name="seasonId"
            required
          >
            <option value="">Seçin</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.year} · {season.titles.tr || "Başlıksız"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="admin-label">Başlık *</span>
          <input
            className="admin-input"
            defaultValue={record?.title}
            name="title"
            required
          />
        </label>
        <label>
          <span className="admin-label">Bağış alanı *</span>
          <select
            className="admin-input"
            defaultValue={record?.campaignId}
            name="campaignId"
            required
          >
            <option value="">Seçin</option>
            {campaigns.map((campaign) => (
              <option key={campaign.value} value={campaign.value}>
                {campaign.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="admin-label">Finans havuzu *</span>
          <select
            className="admin-input"
            defaultValue={record?.fundingPoolId}
            name="fundingPoolId"
            required
          >
            <option value="">Seçin</option>
            {fundingPools.map((pool) => (
              <option key={pool.value} value={pool.value}>
                {pool.label} · {pool.currency}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="admin-label">Bölge *</span>
          <input
            className="admin-input"
            defaultValue={record?.region}
            name="region"
            required
          />
        </label>
        <label>
          <span className="admin-label">Tür</span>
          <select
            className="admin-input"
            name="animalType"
            onChange={(event) => setKind(event.target.value)}
            value={kind}
          >
            <option value="cattle">Büyükbaş</option>
            <option value="small_livestock">Küçükbaş</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Birim fiyat *</span>
          <input
            className="admin-input"
            defaultValue={record?.price}
            min="0.01"
            name="price"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label>
          <span className="admin-label">Para birimi</span>
          <select
            className="admin-input"
            defaultValue={record?.currency || "TRY"}
            name="currency"
          >
            <option>TRY</option>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Havuz kapasitesi</span>
          <input
            className="admin-input"
            defaultValue={record?.capacity ?? (kind === "cattle" ? 7 : 1)}
            key={kind}
            max={kind === "cattle" ? 7 : 1}
            min="1"
            name="capacity"
            required
            type="number"
          />
        </label>
        <label className="flex items-center gap-3 self-end rounded-xl border border-[var(--admin-border)] p-3 text-sm">
          <input
            defaultChecked={record?.isActive ?? true}
            name="isActive"
            type="checkbox"
          />
          Satışa açık
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
          <ActionMessage state={state} />
          <button
            className="admin-secondary-button"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
          <SubmitButton>Kurbanlık seçeneğini kaydet</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}

function PoolAssignment({
  operators,
  pool,
}: {
  operators: QurbaniAdminSnapshot["operators"];
  pool: QurbaniPoolAdminRecord;
}) {
  const [state, action] = useActionState(assignQurbaniPool, initialState);
  return (
    <form action={action} className="mt-4 grid gap-2">
      <input name="poolId" type="hidden" value={pool.id} />
      <select
        aria-label="Saha görevlisi"
        className="admin-input"
        defaultValue={pool.fieldOperatorId}
        name="operatorId"
        required
      >
        <option value="">Saha görevlisi seçin</option>
        {operators.map((operator) => (
          <option key={operator.value} value={operator.value}>
            {operator.label}
          </option>
        ))}
      </select>
      <SubmitButton>
        <FileCheck2 className="size-4" />
        Görev ata
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function OrderOperations({
  order,
  pools,
}: {
  order: QurbaniAdminSnapshot["orders"][number];
  pools: QurbaniAdminSnapshot["pools"];
}) {
  const [eftState, eftAction] = useActionState(approveQurbaniEft, initialState);
  const [transferState, transferAction] = useActionState(
    transferQurbaniOrderToPool,
    initialState,
  );
  const targets = pools.filter(
    (pool) =>
      pool.id !== order.poolId &&
      pool.status === "open" &&
      pool.productId === order.productId &&
      pool.seasonId === order.seasonId &&
      pool.capacity - pool.reservedCount >= order.shareCount,
  );
  return (
    <div className="space-y-2">
      {order.paymentMethod === "eft" &&
      order.proofPath &&
      ["pending_eft_review", "expired"].includes(order.paymentStatus) ? (
        <form action={eftAction} className="space-y-2">
          <input name="orderId" type="hidden" value={order.id} />
          <SubmitButton>
            <FileCheck2 className="size-4" />
            EFT dekontunu onayla
          </SubmitButton>
          <ActionMessage state={eftState} />
        </form>
      ) : null}
      {targets.length ? (
        <form action={transferAction} className="grid gap-2">
          <input name="orderId" type="hidden" value={order.id} />
          <select
            aria-label="Hedef kurban havuzu"
            className="admin-input"
            name="targetPoolId"
            required
          >
            <option value="">Hedef açık havuzu seçin</option>
            {targets.map((pool) => (
              <option key={pool.id} value={pool.id}>
                {pool.code || `Havuz ${pool.id}`} · {pool.reservedCount}/
                {pool.capacity}
              </option>
            ))}
          </select>
          <SubmitButton>
            <PackageCheck className="size-4" />
            Siparişin tüm hisselerini taşı
          </SubmitButton>
          <ActionMessage state={transferState} />
        </form>
      ) : null}
    </div>
  );
}

function Overview({ snapshot }: { snapshot: QurbaniAdminSnapshot }) {
  const countrySales = snapshot.countries.filter((country) => country.isActive).map((country) => {
    const batches = snapshot.stockBatches.filter((batch) => batch.countryId === country.id && batch.status === "active");
    return { country, remaining: batches.reduce((sum, batch) => sum + batch.availableCapacity, 0), batches: batches.length };
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <PanelMetric
          detail="Satışa açık dönem"
          label="Aktif sezon"
          value={
            snapshot.metrics.activeSeason
              ? String(snapshot.metrics.activeSeason)
              : "—"
          }
        />
        <PanelMetric
          detail="Ödeme bekleyen"
          label="Rezerve hisse"
          tone="warning"
          value={String(snapshot.metrics.reservedShares)}
        />
        <PanelMetric
          detail="Kesin ödeme"
          label="Onaylı hisse"
          value={String(snapshot.metrics.paidShares)}
        />
        <PanelMetric
          detail="Kapasitesi açık"
          label="Açık havuz"
          value={String(snapshot.metrics.openPools)}
        />
        <PanelMetric
          detail="Onay / bildirim hazır"
          label="Hazır video"
          value={String(snapshot.metrics.readyVideos)}
        />
        <PanelMetric
          detail="Gönderim veya tekrar"
          label="Mesaj kuyruğu"
          tone="warning"
          value={String(snapshot.metrics.pendingMessages)}
        />
      </div>
      <section className="admin-card">
        <div className="flex items-center justify-between gap-3"><div><p className="admin-eyebrow">Satış görünümü</p><h3 className="mt-1 font-semibold">Ülke bazında aktif stok</h3></div><Beef className="size-5 text-[var(--admin-primary)]" /></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{countrySales.map(({ country, remaining, batches }) => <article className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4" key={country.id}><div className="flex items-start justify-between gap-3"><p className="font-semibold">{country.name}</p><StatusBadge status={country.isActive ? "active" : "stopped"} /></div><p className="mt-4 font-mono text-2xl font-semibold">{remaining}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">kalan hisse · {batches} aktif stok partisi</p></article>)}{!countrySales.length ? <EmptyPanelState description="Satışa açılacak ülkeyi Kurban Ayarları bölümünden ekleyin." title="Aktif ülke yok" /> : null}</div>
      </section>
      <section className="admin-card">
        <div className="flex items-center gap-3">
          <PackageCheck className="size-5 text-[var(--admin-primary)]" />
          <div>
            <h3 className="font-semibold">Operasyon akışı</h3>
            <p className="text-xs text-[var(--admin-muted)]">
              Rezervasyondan kişisel video bildirimine
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Ödeme", "İyzico 30 dk, EFT 24 saat rezervasyon"],
            ["2", "Havuz", "Aynı sipariş tek kurbanda tutulur"],
            ["3", "Saha", "Kodla eşleşen kesim videosu yüklenir"],
            ["4", "Bildirim", "Onay sonrası kişisel bağlantı gönderilir"],
          ].map(([step, title, detail]) => (
            <div
              className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4"
              key={step}
            >
              <span className="font-mono text-xs text-[var(--admin-primary)]">
                {step.padStart(2, "0")}
              </span>
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function QurbaniManager({
  canManage,
  initialSection,
  openQuickStock = false,
  snapshot,
  whatsapp,
}: {
  canManage: boolean;
  initialSection?: Tab;
  openQuickStock?: boolean;
  snapshot: QurbaniAdminSnapshot;
  whatsapp: QurbaniWhatsAppStatus;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(canManage ? initialSection || "sales" : "field");
  const [query, setQuery] = useState("");
  const [seasonModal, setSeasonModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const visibleTabs = canManage ? tabs : tabs.filter(([id]) => id === "field");
  const normalizedQuery = query.toLocaleLowerCase("tr-TR");
  const filteredOrders = useMemo(
    () =>
      snapshot.orders.filter((order) =>
        `${order.publicId} ${order.buyerName} ${order.buyerPhone}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery),
      ),
    [normalizedQuery, snapshot.orders],
  );
  const filteredShares = useMemo(
    () =>
      snapshot.shares.filter((share) =>
        `${share.ownerName} ${share.effectivePhone}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery),
      ),
    [normalizedQuery, snapshot.shares],
  );
  const dispatchBatches = useMemo(
    () => [...new Set(snapshot.messages.map((message) => message.dispatchBatchId).filter(Boolean))],
    [snapshot.messages],
  );

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2" role="tablist">
          {visibleTabs.map(([id, label]) => (
            <button
              aria-selected={tab === id}
              className={
                tab === id ? "admin-tab admin-tab-active" : "admin-tab"
              }
              key={id}
              onClick={() => {
                setTab(id);
                router.replace(`/panel/kurban?section=${id}`, { scroll: false });
              }}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "sales" ? <Overview snapshot={snapshot} /> : null}
      {(
        [
          "sales",
        ] as const
      ).includes(tab as never) ? (
        <QurbaniStockManager
          mode={
            tab as
              | "sales"
          }
          openQuickStock={openQuickStock}
          snapshot={snapshot}
        />
      ) : null}
      {tab === "settings" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="admin-secondary-button"
              onClick={() => {
                setEditingSeasonId(null);
                setSeasonModal(true);
              }}
              type="button"
            >
              <CalendarDays className="size-4" />
              Yeni sezon
            </button>
            <button
              className="admin-action-button"
              onClick={() => {
                if (!snapshot.seasons.length) {
                  setEditingSeasonId(null);
                  setSeasonModal(true);
                  return;
                }
                setEditingProductId(null);
                setProductModal(true);
              }}
              type="button"
            >
              {snapshot.seasons.length ? (
                <Plus className="size-4" />
              ) : (
                <CalendarDays className="size-4" />
              )}
              {snapshot.seasons.length ? "Yeni kurbanlık seçeneği" : "Önce sezon oluştur"}
            </button>
          </div>
          <section>
            <h3 className="mb-3 text-sm font-semibold">Sezonlar</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.seasons.map((season) => (
                <article className="admin-card" key={season.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="admin-eyebrow">{season.year} sezonu</p>
                      <h4 className="mt-2 font-semibold">
                        {season.titles.tr || "Başlıksız sezon"}
                      </h4>
                    </div>
                    <StatusBadge status={season.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-[var(--admin-muted)]">
                        Satış başlangıcı
                      </dt>
                      <dd className="mt-1">
                        {season.salesStartAt
                          ? new Date(season.salesStartAt).toLocaleDateString(
                              "tr-TR",
                            )
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--admin-muted)]">Bayram</dt>
                      <dd className="mt-1">
                        {season.feastAt
                          ? new Date(season.feastAt).toLocaleDateString("tr-TR")
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="admin-secondary-button mt-4"
                    onClick={() => {
                      setEditingSeasonId(season.id);
                      setSeasonModal(true);
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                    Düzenle
                  </button>
                </article>
              ))}
              {!snapshot.seasons.length ? (
                <EmptyPanelState
                  description="İlk satış dönemini oluşturarak kurbanlık seçeneği ve havuz yönetimini başlatın."
                  title="Sezon bulunmuyor"
                />
              ) : null}
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold">Kurbanlık seçenekleri</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.products.map((product) => (
                <article className="admin-card" key={product.id}>
                  <div className="flex justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-[var(--admin-surface)] text-[var(--admin-primary)]">
                      <Beef className="size-5" />
                    </span>
                    <StatusBadge
                      status={product.isActive ? "active" : "stopped"}
                    />
                  </div>
                  <h4 className="mt-4 font-semibold">{product.title}</h4>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {product.region} ·{" "}
                    {product.animalType === "cattle" ? "Büyükbaş" : "Küçükbaş"}{" "}
                    · {product.capacity} hisse
                  </p>
                  <p className="mt-4 font-mono text-lg font-semibold">
                    {formatCurrency(product.price, product.currency)}
                  </p>
                  <button
                    className="admin-secondary-button mt-4"
                    onClick={() => {
                      setEditingProductId(product.id);
                      setProductModal(true);
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                    Düzenle
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
      {tab === "orders" ? (
        <div className="space-y-4">
          <SearchBox
            onChange={setQuery}
            placeholder="Sipariş no, alıcı veya telefon ara"
            value={query}
          />
          {filteredOrders.length ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <article
                  className="admin-card grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
                  key={order.id}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-semibold">
                        {order.publicId}
                      </p>
                      <StatusBadge status={order.paymentStatus} />
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {order.buyerName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {order.buyerPhone} · {order.shareCount} hisse ·{" "}
                      {order.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <p className="font-mono font-semibold">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </p>
                  <div className="space-y-2">
                    {!order.powerOfAttorneyPhoneConfirmedAt ? (
                      <ActionForm
                        action={markPowerOfAttorneyConfirmed}
                        fields={{ orderId: order.id }}
                      >
                        <ShieldCheck className="size-4" />
                        Vekâleti teyit et
                      </ActionForm>
                    ) : (
                      <span className="admin-status admin-status-success">
                        <CheckCircle2 className="size-3" />
                        Vekâlet teyitli
                      </span>
                    )}
                    {order.paymentMethod === "eft" && order.proofPath ? (
                      order.proofUrl ? (
                        <a
                          className="admin-secondary-button"
                          href={order.proofUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ExternalLink className="size-4" />
                          Dekontu aç
                        </a>
                      ) : (
                        <span className="admin-status admin-status-warning">
                          Dekont bağlantısı alınamadı
                        </span>
                      )
                    ) : null}
                    <OrderOperations order={order} pools={snapshot.pools} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyPanelState
              description="Filtreye uyan sipariş bulunamadı."
              title="Sipariş yok"
            />
          )}
        </div>
      ) : null}
      {tab === "orders" ? (
        <div className="space-y-4">
          <SearchBox
            onChange={setQuery}
            placeholder="Hissedar veya telefon ara"
            value={query}
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredShares.map((share) => (
              <article className="admin-card" key={share.id}>
                <div className="flex justify-between gap-3">
                  <Users className="size-5 text-[var(--admin-primary)]" />
                  <StatusBadge status={share.status} />
                </div>
                <p className="mt-4 font-semibold">{share.ownerName}</p>
                <p className="mt-1 font-mono text-xs text-[var(--admin-muted)]">
                  {share.effectivePhone || "Alıcı telefonu kullanılacak"}
                </p>
                <p className="mt-3 text-xs text-[var(--admin-muted)]">
                  Sipariş {share.orderId}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {tab === "field" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.pools.map((pool) => (
            <article className="admin-card" key={pool.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-[var(--admin-primary)]">
                    {pool.code || "Kod bekleniyor"}
                  </p>
                  <h3 className="mt-2 font-semibold">{pool.productTitle}</h3>
                </div>
                <StatusBadge status={pool.status} />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs">
                  <span>{pool.paidCount} kesin</span>
                  <span>
                    {pool.reservedCount} rezerve / {pool.capacity}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--admin-surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--admin-primary)]"
                    style={{
                      width: `${Math.min(100, (pool.paidCount / pool.capacity) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              {pool.status === "full" && !pool.lockedAt ? (
                <PoolAssignment operators={snapshot.operators} pool={pool} />
              ) : (
                <p className="mt-4 text-xs text-[var(--admin-muted)]">
                  {pool.status === "open"
                    ? "Havuz kesin ödemelerle dolduğunda saha ataması açılır."
                    : "Saha ataması tamamlandı veya operasyon başladı."}
                </p>
              )}
            </article>
          ))}
          {!snapshot.pools.length ? (
            <EmptyPanelState
              description="Rezervasyonlar geldikçe kurban havuzları burada oluşur."
              title="Havuz bulunmuyor"
            />
          ) : null}
        </div>
      ) : null}
      {tab === "field" ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {snapshot.pools
              .filter((pool) => pool.fieldOperatorId || !canManage)
              .map((pool) => (
                <article className="admin-card" key={pool.id}>
                  <div className="flex justify-between">
                    <div>
                      <p className="admin-eyebrow">Saha görevi</p>
                      <h3 className="mt-2 font-mono font-semibold">
                        {pool.code || "Kod bekleniyor"}
                      </h3>
                    </div>
                    <StatusBadge status={pool.status} />
                  </div>
                  <p className="mt-3 text-sm text-[var(--admin-muted)]">
                    {pool.productTitle} · {pool.paidCount}/{pool.capacity} kesin
                    hisse
                  </p>
                  {!canManage &&
                  ["assigned", "in_progress"].includes(pool.status) ? (
                    <QurbaniVideoUploader
                      poolCode={pool.code}
                      poolId={pool.id}
                    />
                  ) : !canManage ? (
                    <p className="mt-4 text-xs text-[var(--admin-muted)]">
                      Bu görev artık yeni video yüklemeye açık değil.
                    </p>
                  ) : null}
                </article>
              ))}
          </div>
          <section>
            <h3 className="mb-3 text-sm font-semibold">Video işleme ve onay</h3>
            <div className="space-y-3">
              {snapshot.videos.map((video) => (
                <article
                  className="admin-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  key={video.id}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Video className="size-4 text-[var(--admin-primary)]" />
                      <p className="font-mono text-xs font-semibold">
                        {video.poolCode || `Havuz ${video.poolId}`}
                      </p>
                      <StatusBadge status={video.status} />
                    </div>
                    <p className="mt-2 text-sm">
                      {video.originalFilename || "İsimsiz video"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {video.durationSeconds
                        ? `${Math.round(video.durationSeconds)} saniye`
                        : "Süre işleniyor"}
                    </p>
                  </div>
                  {canManage && ["ready_for_review"].includes(video.status) ? (
                    <ActionForm
                      action={approveQurbaniVideoRecord}
                      fields={{ videoId: video.id }}
                    >
                      <CheckCircle2 className="size-4" />
                      Videoyu onayla
                    </ActionForm>
                  ) : null}
                </article>
              ))}
              {!snapshot.videos.length ? (
                <EmptyPanelState
                  description="Saha görevlisinin yüklediği videolar işleme kuyruğundan sonra burada görünür."
                  title="Video bulunmuyor"
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
      {tab === "field" && canManage ? <div className="space-y-5"><QurbaniStockManager mode="packages" snapshot={snapshot} /><details className="admin-card"><summary className="cursor-pointer text-sm font-semibold">Havuz yerleşimi ve eksik grup işlemleri</summary><div className="mt-5"><QurbaniStockManager mode="placement" snapshot={snapshot} /></div></details></div> : null}
      {tab === "delivery" ? (
        <div className="space-y-4">
          {snapshot.pools.filter((pool) => pool.status === "ready").length ? (
            <section className="admin-card">
              <p className="admin-eyebrow">Bildirim hazırlığı</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.pools
                  .filter((pool) => pool.status === "ready")
                  .map((pool) => (
                    <ActionForm
                      action={prepareQurbaniMessages}
                      fields={{ poolId: pool.id }}
                      key={pool.id}
                    >
                      <MessageCircle className="size-4" />
                      {pool.code} mesajlarını hazırla
                    </ActionForm>
                  ))}
              </div>
            </section>
          ) : null}
          {dispatchBatches.map((batchId) => {
            const batchMessages = snapshot.messages.filter(
              (message) => message.dispatchBatchId === batchId,
            );
            const queued = batchMessages.filter((message) =>
              ["queued", "paused", "failed"].includes(message.status),
            ).length;
            return (
              <section className="admin-card" key={batchId}>
                <p className="admin-eyebrow">Gönderim partisi</p>
                <p className="mt-2 font-mono text-xs">{batchId}</p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {batchMessages.length} alıcı · {queued} bekleyen/başarısız
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionForm action={setQurbaniMessageDispatchState} fields={{ dispatchBatchId: batchId, batchAction: "pause" }}>
                    Duraklat
                  </ActionForm>
                  <ActionForm action={setQurbaniMessageDispatchState} fields={{ dispatchBatchId: batchId, batchAction: "resume" }}>
                    Devam ettir
                  </ActionForm>
                  <ActionForm action={setQurbaniMessageDispatchState} danger fields={{ dispatchBatchId: batchId, batchAction: "cancel" }}>
                    Gönderilmemişleri iptal et
                  </ActionForm>
                </div>
              </section>
            );
          })}
          {snapshot.messages.some((message) =>
            ["pending", "queued", "failed"].includes(message.status),
          ) ? (
            <section className="admin-card">
              <p className="admin-eyebrow">Toplu gönderim</p>
              <p className="mt-2 text-sm text-[var(--admin-muted)]">
                Aynı telefona ait hazır kurbanlar tek WhatsApp mesajında birleştirilir.
              </p>
              <div className="mt-3">
                <ActionForm
                  action={sendQurbaniMessages}
                  fields={{
                    messageIds: snapshot.messages
                      .filter((message) =>
                        ["pending", "queued", "failed"].includes(message.status),
                      )
                      .map((message) => message.id)
                      .join(","),
                  }}
                >
                  <Send className="size-4" />
                  Hazır tüm gönderilmemiş mesajları kuyruğa al
                </ActionForm>
              </div>
            </section>
          ) : null}
          {snapshot.messages.map((message) => (
            <article
              className="admin-card grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              key={message.id}
            >
              <div>
                <div className="flex gap-2">
                  <p className="font-mono text-xs font-semibold">
                    {message.poolCode}
                  </p>
                  <StatusBadge status={message.status} />
                </div>
                <p className="mt-2 text-sm">
                  {message.recipientPhone} · {message.shareCount} hisse
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {message.shareNames.join(", ") || "Hisse özeti hazırlanıyor"}
                </p>
                {message.errorMessage ? (
                  <p className="mt-2 text-xs text-[var(--admin-danger)]">
                    {message.errorMessage}
                  </p>
                ) : null}
              </div>
              {["pending", "queued", "failed"].includes(message.status) ? (
                <ActionForm
                  action={sendQurbaniMessages}
                  fields={{ messageIds: message.id }}
                >
                  <Send className="size-4" />
                  Gönder
                </ActionForm>
              ) : null}
              {message.accessLinkId && !message.accessRevoked ? (
                <ActionForm
                  action={revokeQurbaniTrackingLink}
                  fields={{ accessLinkId: message.accessLinkId }}
                >
                  <Ban className="size-4" />
                  Bağlantıyı iptal et
                </ActionForm>
              ) : null}
            </article>
          ))}
          {!snapshot.messages.length ? (
            <EmptyPanelState
              description="Video onaylandıktan sonra kişisel bağlantılar ve tekilleştirilmiş alıcı mesajları hazırlanır."
              title="Mesaj kuyruğu boş"
            />
          ) : null}
          <section className="admin-card opacity-70">
            <div className="flex items-center gap-3">
              <Smartphone className="size-5" />
              <div>
                <p className="font-semibold">SMS</p>
                <p className="text-xs text-[var(--admin-muted)]">
                  Yakında · İlk sürümde pasif
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
      {tab === "settings" ? <div className="space-y-5"><QurbaniStockManager mode="countries" snapshot={snapshot} /><QurbaniStockManager mode="documents" snapshot={snapshot} /><WhatsAppPanel status={whatsapp} /></div> : null}
      {seasonModal ? (
        <SeasonForm
          onClose={() => setSeasonModal(false)}
          record={snapshot.seasons.find((item) => item.id === editingSeasonId)}
        />
      ) : null}
      {productModal ? (
        <ProductForm
          campaigns={snapshot.campaigns}
          fundingPools={snapshot.fundingPools}
          onClose={() => setProductModal(false)}
          onCreateSeason={() => {
            setProductModal(false);
            setEditingSeasonId(null);
            setSeasonModal(true);
          }}
          record={snapshot.products.find(
            (item) => item.id === editingProductId,
          )}
          seasons={snapshot.seasons}
        />
      ) : null}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange(value: string): void;
  placeholder: string;
}) {
  return (
    <label className="relative block max-w-lg">
      <Search
        aria-hidden="true"
        className="absolute left-3 top-3 size-4 text-[var(--admin-muted)]"
      />
      <span className="sr-only">Ara</span>
      <input
        className="admin-input pl-10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function WhatsAppPanel({ status }: { status: QurbaniWhatsAppStatus }) {
  const connected = status.state === "connected";
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="admin-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-[#25d366]/10 text-[#178c46]">
              <MessageCircle className="size-6" />
            </span>
            <div>
              <p className="admin-eyebrow">Evolution API</p>
              <h3 className="mt-1 font-semibold">
                Kurumsal WhatsApp bağlantısı
              </h3>
            </div>
          </div>
          <StatusBadge
            status={
              connected
                ? "success"
                : status.state === "connecting"
                  ? "pending"
                  : "stopped"
            }
          />
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--admin-surface)] p-4">
            <dt className="text-xs text-[var(--admin-muted)]">Instance</dt>
            <dd className="mt-1 font-mono">
              {status.instanceName || "Yapılandırılmadı"}
            </dd>
          </div>
          <div className="rounded-xl bg-[var(--admin-surface)] p-4">
            <dt className="text-xs text-[var(--admin-muted)]">Telefon</dt>
            <dd className="mt-1 font-mono">{status.phone || "Bağlı değil"}</dd>
          </div>
        </dl>
        {status.message ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">
            {status.message}
          </p>
        ) : null}
        {connected ? (
          <div className="mt-5">
            <ActionForm
              action={disconnectQurbaniWhatsApp}
              danger
              fields={{ confirm: "disconnect" }}
            >
              <X className="size-4" />
              WhatsApp bağlantısını kapat
            </ActionForm>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              Panelden çıkış yapmak bu oturumu kapatmaz. Yalnız bu işlem
              bağlantıyı sonlandırır.
            </p>
          </div>
        ) : null}
      </section>
      <section className="admin-card">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-[var(--admin-primary)]" />
          <h3 className="text-sm font-semibold">Bağlantı kodu</h3>
        </div>
        {status.qrCodeDataUrl ? (
          <div className="mt-4 rounded-xl bg-white p-4">
            <Image
              alt="Evolution WhatsApp bağlantı QR kodu"
              className="mx-auto size-64 max-w-full"
              height={256}
              src={status.qrCodeDataUrl}
              unoptimized
              width={256}
            />
          </div>
        ) : (
          <div className="mt-4 grid min-h-64 place-items-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 text-center">
            <div>
              <CircleDollarSign className="mx-auto size-6 text-[var(--admin-muted)]" />
              <p className="mt-3 text-sm font-semibold">QR kodu yok</p>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                Bağlantı kuruluysa QR gizlenir. Yapılandırma eksikse sunucu
                anahtarlarını tamamlayın.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
