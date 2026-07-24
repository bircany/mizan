"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, PauseCircle, PlayCircle } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { setCampaignDonationOpen } from "@/lib/admin/content-actions";

function VisibilityButton({ isDonationOpen }: { isDonationOpen: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-3 text-xs font-semibold text-[var(--admin-text)] transition-colors hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : isDonationOpen ? (
        <PauseCircle aria-hidden="true" className="size-3.5" />
      ) : (
        <PlayCircle aria-hidden="true" className="size-3.5" />
      )}
      {pending ? "Güncelleniyor" : isDonationOpen ? "Pasife al" : "Yayına al"}
    </button>
  );
}

export function CampaignVisibilityForm({
  id,
  isDonationOpen,
}: {
  id: string;
  isDonationOpen: boolean;
}) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(setCampaignDonationOpen, {
    message: null,
    success: false,
  });

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input name="id" type="hidden" value={id} />
        <input name="isDonationOpen" type="hidden" value={String(!isDonationOpen)} />
        <VisibilityButton isDonationOpen={isDonationOpen} />
      </form>
      {state.message ? (
        <p className={state.success ? "text-xs text-[var(--admin-primary)]" : "text-xs text-[var(--admin-danger)]"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
