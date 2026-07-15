"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export function SubmissionReviewActions({ submissionId, status }: { submissionId: string; status: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canApprove = status === "review_pending";
  const canReject = status === "review_pending" || status === "external_pending";

  function transition(next: "approve" | "reject") {
    if (next === "reject" && !notes.trim()) {
      setMessage("Düzeltme notu girmeden teslim iade edilemez.");
      return;
    }

    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/field/submissions/${submissionId}/transition`, {
          body: JSON.stringify({ reviewNotes: notes, transition: next }),
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          setMessage("Durum değiştirilemedi. Teslimin güncel durumunu kontrol edin.");
          return;
        }
        setMessage(next === "approve" ? "Teslim onaylandı." : "Teslim düzeltme notuyla iade edildi.");
        router.refresh();
      } catch {
        setMessage("Bağlantı sorunu nedeniyle işlem tamamlanamadı.");
      }
    });
  }

  if (!canApprove && !canReject) return null;

  return (
    <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
      <label>
        <span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">İnceleme notu{canReject ? " *" : ""}</span>
        <textarea className="admin-input min-h-20 resize-y" disabled={isPending} onChange={(event) => setNotes(event.target.value)} placeholder="Onay veya düzeltme notu" value={notes} />
      </label>
      <div className="mt-3 flex flex-wrap gap-3">
        {canApprove ? <button className="admin-action-button w-auto" disabled={isPending} onClick={() => transition("approve")} type="button">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}Onayla</button> : null}
        {canReject ? <button className="admin-action-button-secondary w-auto" disabled={isPending} onClick={() => transition("reject")} type="button"><RotateCcw aria-hidden="true" className="size-4" />Düzeltme iste</button> : null}
      </div>
      {message ? <p aria-live="polite" className="mt-3 text-xs text-[var(--admin-muted)]">{message}</p> : null}
    </div>
  );
}
