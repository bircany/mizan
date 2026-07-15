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
    <main className="admin-panel grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(172,120,15,0.16),_transparent_28rem),linear-gradient(135deg,_#0b2117,_#122a1d_52%,_#5b3919)] p-5 text-[var(--admin-text)] sm:p-8">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#11271b]/95 shadow-[0_1.5rem_5rem_rgba(0,0,0,0.34)] backdrop-blur" aria-labelledby="panel-login-title">
        <div className="border-b border-white/10 px-6 pb-6 pt-7 sm:px-8">
          <div className="flex items-center gap-4">
            <Image alt="Mizan Derneği" className="rounded-full bg-[#f7f3ea] p-1" height={54} priority src="/mizan-logo.png" width={54} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8b66b]">Mizan Derneği</p>
              <h1 className="mt-1 text-xl font-semibold text-white" id="panel-login-title">Personel girişi</h1>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-[#c4d0c3]">Görevlerinize, finans kayıtlarına ve onay süreçlerine rolünüze göre erişin.</p>
        </div>

        <form className="space-y-5 px-6 py-7 sm:px-8" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#ecf1e8]"><Mail aria-hidden="true" className="size-4 text-[#d8b66b]" /> E-posta adresi</span>
            <input autoComplete="email" className="admin-input" disabled={isPending} inputMode="email" name="email" type="email" />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-[#ecf1e8]"><KeyRound aria-hidden="true" className="size-4 text-[#d8b66b]" /> Şifre</span>
            <input autoComplete="current-password" className="admin-input" disabled={isPending} name="password" type="password" />
          </label>

          {error ? <p aria-live="polite" className="rounded-lg border border-[#c47b70]/50 bg-[#c47b70]/10 px-3 py-2 text-sm text-[#ffd7d1]">{error}</p> : null}

          <button className="admin-action-button group" disabled={isPending} type="submit">
            {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
            {isPending ? "Giriş yapılıyor" : "Panele giriş yap"}
            {!isPending ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
          </button>
        </form>

        <p className="border-t border-white/10 px-6 py-4 text-xs leading-5 text-[#aebdad] sm:px-8">Yetkisiz erişim denetlenir. Hesabınız pasifse giriş yapılamaz.</p>
      </section>
    </main>
  );
}
