"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EftReviewActions({
  proofAvailable,
  sessionId,
}: {
  proofAvailable: boolean;
  sessionId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "approve" | "reject") {
    const description = window.prompt(
      decision === "approve"
        ? "Onay açıklamasını yazın:"
        : "Ret açıklamasını yazın:",
    );
    if (!description?.trim()) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/donations/eft/${sessionId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, description }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(String(result.error || "İşlem uygulanamadı."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex min-w-44 flex-wrap gap-2">
      {proofAvailable ? (
        <a
          className="rounded-lg border px-2 py-1 text-xs font-semibold"
          href={`/api/donations/eft-review/${sessionId}/proof`}
          rel="noreferrer"
          target="_blank"
        >
          Dekont
        </a>
      ) : null}
      <button
        className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white"
        disabled={busy || !proofAvailable}
        onClick={() => decide("approve")}
        type="button"
      >
        Onayla
      </button>
      <button
        className="rounded-lg bg-red-700 px-2 py-1 text-xs font-semibold text-white"
        disabled={busy}
        onClick={() => decide("reject")}
        type="button"
      >
        Reddet
      </button>
      {error ? <p className="w-full text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
