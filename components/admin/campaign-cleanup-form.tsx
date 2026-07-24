"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { cleanupCampaignLinkedRecords } from "@/lib/admin/content-actions";

function CleanupButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--admin-warning)]/40 bg-[rgb(245_185_66_/_10%)] px-3 text-xs font-semibold text-[var(--admin-warning)] transition-colors hover:bg-[rgb(245_185_66_/_16%)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Trash2 aria-hidden="true" className="size-3.5" />}
      {pending ? "Temizleniyor" : "Bağlı kayıtları temizle"}
    </button>
  );
}

export function CampaignCleanupForm({ id }: { id: string }) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(cleanupCampaignLinkedRecords, {
    message: null,
    success: false,
  });

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input name="id" type="hidden" value={id} />
        <CleanupButton />
      </form>
      {state.message ? (
        <p className={state.success ? "text-xs text-[var(--admin-primary)]" : "text-xs text-[var(--admin-danger)]"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
