"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";

export function FulfillmentRetryButton({ donationId }: { donationId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch(`/api/finance/donations/${donationId}/fulfillment/retry`, { credentials: "same-origin", method: "POST" });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          setMessage("Tekrar deneme tamamlanamadı.");
          return;
        }
        setMessage("Teslim işlemi yeniden kuyruğa alındı.");
      } catch {
        setMessage("Bağlantı sorunu nedeniyle tekrar deneme yapılamadı.");
      }
    });
  }

  return <div className="flex flex-col items-start gap-2"><button className="admin-action-button-secondary w-auto" disabled={isPending} onClick={retry} type="button">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RotateCw aria-hidden="true" className="size-4" />}{isPending ? "Tekrar deneniyor" : "Tekrar dene"}</button>{message ? <p aria-live="polite" className="text-xs text-[var(--admin-muted)]">{message}</p> : null}</div>;
}
