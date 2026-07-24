"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { ArrowRight, KeyRound, LoaderCircle, Mail, ShieldCheck } from "lucide-react";

import { getSafePanelReturnTo } from "@/lib/auth/panel-access";

export function PanelLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const returnTo = getSafePanelReturnTo(searchParams.get("returnTo"));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("E-posta adresinizi ve şifrenizi girin.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/users/login", {
          body: JSON.stringify({ email, password }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          setError("Giriş bilgileri doğrulanamadı. Bilgilerinizi kontrol edip tekrar deneyin.");
          return;
        }

        router.replace(returnTo);
        router.refresh();
      } catch {
        setError("Giriş sırasında bağlantı sorunu oluştu. Lütfen tekrar deneyin.");
      }
    });
  }

  return (
    <main className="admin-panel grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(57,120,90,0.14),_transparent_28rem),linear-gradient(135deg,_#f7f7f2,_#edf3ed_58%,_#f5efe2)] p-5 text-[var(--admin-text)] sm:p-8">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] shadow-[0_1.5rem_5rem_rgba(31,63,46,0.13)]" aria-labelledby="panel-login-title">
        <div className="border-b border-[var(--admin-border)] px-6 pb-6 pt-7 sm:px-8">
          <div className="flex items-center gap-4">
            <Image alt="Mizan Derneği" className="rounded-full bg-[#f7f3ea] p-1" height={54} priority src="/mizan-logo.png" width={54} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-primary-strong)]">Mizan Derneği</p>
              <h1 className="mt-1 text-xl font-semibold text-[var(--admin-text)]" id="panel-login-title">Personel girişi</h1>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--admin-muted)]">Görevlerinize, finans kayıtlarına ve onay süreçlerine rolünüze göre erişin.</p>
        </div>

        <form className="space-y-5 px-6 py-7 sm:px-8" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--admin-text)]"><Mail aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> E-posta adresi</span>
            <input autoComplete="email" className="admin-input" disabled={isPending} inputMode="email" name="email" type="email" />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--admin-text)]"><KeyRound aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> Şifre</span>
            <input autoComplete="current-password" className="admin-input" disabled={isPending} name="password" type="password" />
          </label>

          {error ? <p aria-live="polite" className="rounded-lg border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/5 px-3 py-2 text-sm text-[var(--admin-danger)]">{error}</p> : null}

          <button className="admin-action-button group" disabled={isPending} type="submit">
            {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
            {isPending ? "Giriş yapılıyor" : "Panele giriş yap"}
            {!isPending ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
          </button>
        </form>

        <p className="border-t border-[var(--admin-border)] bg-[var(--admin-surface)] px-6 py-4 text-xs leading-5 text-[var(--admin-muted)] sm:px-8">Yetkisiz erişim denetlenir. Hesabınız pasifse giriş yapılamaz.</p>
      </section>
    </main>
  );
}
