"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, LogOut, MessageCircle, QrCode, RefreshCw, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/admin/panel-ui";
import {
  manageWhatsAppConnection,
  type WhatsAppActionState,
} from "@/lib/admin/whatsapp-actions";
import type { EvolutionConnectionStatus } from "@/lib/qurbani/evolution";

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
      {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function badgeState(state: EvolutionConnectionStatus["state"]) {
  if (state === "connected") return "success";
  if (state === "connecting") return "pending";
  if (state === "error") return "failed";
  return "stopped";
}

function stateLabel(state: EvolutionConnectionStatus["state"]) {
  return {
    connected: "Bağlı",
    connecting: "QR bekleniyor",
    disconnected: "Bağlı değil",
    unconfigured: "Yapılandırılmadı",
    error: "Bağlantı hatası",
  }[state];
}

export function WhatsAppConnectionPanel({
  initialStatus,
}: {
  initialStatus: EvolutionConnectionStatus;
}) {
  const initialState: WhatsAppActionState = {
    success: initialStatus.state !== "error" && initialStatus.state !== "unconfigured",
    message: null,
    status: initialStatus,
  };
  const [actionState, action] = useActionState(manageWhatsAppConnection, initialState);
  const status = actionState.status || initialStatus;
  const connected = status.state === "connected";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="admin-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-[#25d366]/10 text-[#178c46]">
              <MessageCircle aria-hidden="true" className="size-7" />
            </span>
            <div>
              <p className="admin-eyebrow">Evolution API</p>
              <h3 className="mt-1 text-lg font-semibold">Kurumsal WhatsApp bağlantısı</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={badgeState(status.state)} />
            <span className="text-xs font-medium text-[var(--admin-muted)]">{stateLabel(status.state)}</span>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--admin-surface)] p-4">
            <dt className="text-xs text-[var(--admin-muted)]">Instance</dt>
            <dd className="mt-1 break-all font-mono">{status.instanceName}</dd>
          </div>
          <div className="rounded-xl bg-[var(--admin-surface)] p-4">
            <dt className="text-xs text-[var(--admin-muted)]">Telefon</dt>
            <dd className="mt-1 font-mono">{status.phone || "Bağlı değil"}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] p-4">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--admin-primary)]" />
            <div>
              <p className="text-sm font-semibold">Tek ve güvenli bağlantı</p>
              <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                Bu ekran video teslimat işçisinin kullandığı aynı Evolution instance’ını yönetir. API anahtarı tarayıcıya gönderilmez.
              </p>
            </div>
          </div>
        </div>

        {actionState.message || status.message ? (
          <p
            className={`mt-4 text-sm ${actionState.message && !actionState.success ? "text-[var(--admin-danger)]" : "text-[var(--admin-muted)]"}`}
            role="status"
          >
            {actionState.message || status.message}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {!connected ? (
            <form action={action}>
              <input name="intent" type="hidden" value="connect" />
              <SubmitButton>
                <QrCode aria-hidden="true" className="size-4" />
                QR kodu oluştur
              </SubmitButton>
            </form>
          ) : null}
          <form action={action}>
            <input name="intent" type="hidden" value="status" />
            <SubmitButton>
              <RefreshCw aria-hidden="true" className="size-4" />
              Durumu yenile
            </SubmitButton>
          </form>
          {connected ? (
            <form action={action}>
              <input name="confirm" type="hidden" value="disconnect" />
              <input name="intent" type="hidden" value="disconnect" />
              <SubmitButton danger>
                <LogOut aria-hidden="true" className="size-4" />
                Bağlantıyı kapat
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </section>

      <section className="admin-card">
        <div className="flex items-center gap-2">
          <QrCode aria-hidden="true" className="size-5 text-[var(--admin-primary)]" />
          <h3 className="font-semibold">WhatsApp cihaz eşleştirme</h3>
        </div>
        {status.qrCodeDataUrl ? (
          <>
            <div className="mt-4 rounded-xl bg-white p-4">
              <Image
                alt="WhatsApp bağlantı QR kodu"
                className="mx-auto size-72 max-w-full"
                height={288}
                src={status.qrCodeDataUrl}
                unoptimized
                width={288}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--admin-muted)]">
              WhatsApp uygulamasında Ayarlar → Bağlı cihazlar → Cihaz bağla yolunu açıp kodu tarayın. Sonra “Durumu yenile” düğmesine basın.
            </p>
          </>
        ) : status.pairingCode ? (
          <div className="mt-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5 text-center">
            <p className="text-xs text-[var(--admin-muted)]">Eşleştirme kodu</p>
            <p className="mt-2 break-all font-mono text-2xl font-semibold tracking-[0.12em]">{status.pairingCode}</p>
          </div>
        ) : (
          <div className="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-center">
            <div>
              <QrCode aria-hidden="true" className="mx-auto size-8 text-[var(--admin-muted)]" />
              <p className="mt-3 text-sm font-semibold">{connected ? "Hesap bağlı" : "QR kodu bekleniyor"}</p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--admin-muted)]">
                {connected
                  ? "Bağlı hesap için QR kodu gösterilmez."
                  : "Sunucu ayarları tamamsa QR kodu oluştur düğmesi bağlantıyı başlatır."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
