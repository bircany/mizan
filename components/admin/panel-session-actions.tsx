"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function PanelSessionActions() {
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
    <button aria-label="Oturumu kapat" className="admin-icon-button" disabled={isPending} onClick={signOut} title="Oturumu kapat" type="button">
      <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
    </button>
  );
}
