"use client";

import Link from "next/link";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useState } from "react";

type InquiryFormProps = {
  programs?: string[];
  type: "contact" | "student";
};

const inputClass =
  "w-full rounded-xl border border-[#ddd5c9] bg-[#fcfbf8] px-4 py-3 text-sm text-[#26372e] outline-none transition placeholder:text-[#9a9f9b] focus:border-[#4d8566] focus:bg-white focus:ring-4 focus:ring-[#4d8566]/10";

export function InquiryForm({ programs = [], type }: InquiryFormProps) {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/contact", {
        body: JSON.stringify({ ...body, type }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Başvurunuz gönderilemedi.");
      }
      form.reset();
      setStatus({
        kind: "success",
        message:
          type === "student"
            ? "Ön başvurunuz alındı. Ekibimiz sizinle iletişime geçecektir."
            : "Mesajınız alındı. En kısa sürede size dönüş yapacağız.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "İşlem sırasında beklenmeyen bir hata oluştu.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="rounded-[28px] border border-[#e7ded1] bg-white p-5 shadow-[0_24px_70px_rgba(47,58,51,0.14)] sm:p-7"
      onSubmit={submit}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7445]">
          {type === "student" ? "Ön başvuru formu" : "Bize yazın"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-[#173525]">
          {type === "student" ? "Talebelik hakkında bilgi alın" : "Mesajınızı iletin"}
        </h2>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Ad *">
          <input
            autoComplete="given-name"
            className={inputClass}
            maxLength={60}
            name="firstName"
            required
          />
        </Field>
        <Field label="Soyad *">
          <input
            autoComplete="family-name"
            className={inputClass}
            maxLength={60}
            name="lastName"
            required
          />
        </Field>
        <Field full label="E-posta *">
          <input
            autoComplete="email"
            className={inputClass}
            maxLength={160}
            name="email"
            required
            type="email"
          />
        </Field>
        <Field full={type === "contact"} label={`Telefon${type === "student" ? " *" : ""}`}>
          <input
            autoComplete="tel"
            className={inputClass}
            maxLength={30}
            name="phone"
            required={type === "student"}
            type="tel"
          />
        </Field>
        {type === "contact" ? (
          <Field full label="Konu *">
            <input className={inputClass} maxLength={120} name="subject" required />
          </Field>
        ) : (
          <Field full label="Bilgi almak istediğiniz eğitim / birim *">
            <select className={inputClass} name="program" required>
              <option value="">Seçiniz</option>
              {programs.map((program) => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </Field>
        )}
        <Field full label={type === "student" ? "Eklemek istediğiniz not" : "Mesajınız *"}>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            maxLength={3000}
            name="message"
            required={type === "contact"}
          />
        </Field>
      </div>

      <input
        aria-hidden="true"
        autoComplete="off"
        className="absolute -left-[9999px]"
        name="company"
        tabIndex={-1}
      />

      <label className="mt-5 flex items-start gap-3 text-xs leading-5 text-[#657069]">
        <input className="mt-1 size-4 accent-[#1d6744]" name="privacyConsent" required type="checkbox" />
        <span>
          İletişim bilgilerimin talebimin yanıtlanması amacıyla işlenmesini kabul
          ediyor,{" "}
          <Link className="font-semibold text-[#1d6744] underline" href="/kvkk-aydinlatma-metni" target="_blank">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni okuduğumu beyan ediyorum.
        </span>
      </label>

      {status ? (
        <div
          className={
            status.kind === "success"
              ? "mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              : "mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          }
          role="status"
        >
          {status.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : null}
          <span>{status.message}</span>
        </div>
      ) : null}

      <button
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#80603d] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(128,96,61,0.2)] transition hover:-translate-y-0.5 hover:bg-[#6e4e2e] disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        {pending ? "Gönderiliyor" : type === "student" ? "Ön başvuruyu gönder" : "Mesajı gönder"}
      </button>
    </form>
  );
}

function Field({
  children,
  full = false,
  label,
}: {
  children: React.ReactNode;
  full?: boolean;
  label: string;
}) {
  return (
    <label className={full ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-sm font-semibold text-[#34463b]">{label}</span>
      {children}
    </label>
  );
}
