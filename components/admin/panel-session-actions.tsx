"use client";

import { LoaderCircle, LogOut, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function PanelSessionActions({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      try {
        await fetch("/api/users/logout?allSessions=false", {
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      } finally {
        router.replace("/panel/giris");
        router.refresh();
      }
    });
  }

  return (
    <button
      aria-label="Panelden çıkış yap"
      className={
        mobile
          ? "inline-flex size-10 items-center justify-center rounded-xl border border-red-300/60 bg-red-50 text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
          : "admin-icon-button"
      }
      disabled={isPending}
      onClick={signOut}
      title="Panelden çıkış yap"
      type="button"
    >
      {isPending ? (
        <LoaderCircle aria-hidden="true" className="size-[18px] animate-spin" />
      ) : mobile ? (
        <Power aria-hidden="true" className="size-[19px]" strokeWidth={2} />
      ) : (
        <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
      )}
    </button>
  );
}
