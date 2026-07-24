"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { purgeAllCampaignRecords } from "@/lib/admin/content-actions";

function PurgeButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--admin-danger)]/40 bg-[rgb(255_122_115_/_10%)] px-3 text-xs font-semibold text-[var(--admin-danger)] transition-colors hover:bg-[rgb(255_122_115_/_16%)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <TriangleAlert aria-hidden="true" className="size-3.5" />}
      {pending ? "Temizleniyor" : "Tüm bağış alanı verisini sil"}
    </button>
  );
}

export function CampaignPurgeAllForm() {
  const [state, formAction] = useActionState<ContentActionState, FormData>(purgeAllCampaignRecords, {
    message: null,
    success: false,
  });

  return (
    <div className="rounded-2xl border border-[var(--admin-danger)]/20 bg-[rgb(255_122_115_/_6%)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--admin-text)]">Toplu temizlik</p>
          <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
            Bu işlem tüm bağış alanlarını, bağlı bağışları, ödeme kayıtlarını, saha kayıtlarını ve raporları siler.
          </p>
        </div>
        <form action={formAction}>
          <PurgeButton />
        </form>
      </div>
      {state.message ? (
        <p className={state.success ? "mt-3 text-xs text-[var(--admin-primary)]" : "mt-3 text-xs text-[var(--admin-danger)]"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
