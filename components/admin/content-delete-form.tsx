"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { deleteContentRecord } from "@/lib/admin/content-actions";

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-[var(--admin-danger)]/40 px-3 text-xs font-semibold text-[var(--admin-danger)] transition-colors hover:bg-[rgb(255_122_115_/_12%)] disabled:cursor-not-allowed disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Trash2 aria-hidden="true" className="size-3.5" />}
      {pending ? "Siliniyor" : "Sil"}
    </button>
  );
}

export function ContentDeleteForm({ collection, id }: { collection: string; id: string }) {
  const [state, formAction] = useActionState<ContentActionState, FormData>(deleteContentRecord, {
    message: null,
    success: false,
  });

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input name="collection" type="hidden" value={collection} />
        <input name="id" type="hidden" value={id} />
        <DeleteButton />
      </form>
      {state.message ? (
        <p className={state.success ? "text-xs text-[var(--admin-primary)]" : "text-xs text-[var(--admin-danger)]"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
