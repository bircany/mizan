"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, LoaderCircle, Pencil, Plus, UserRoundPlus } from "lucide-react";

import { savePanelUser, type UserActionState } from "@/lib/admin/user-actions";
import type { UserRole } from "@/lib/auth/roles";

type PanelUserRecord = {
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  role: UserRole;
};

const roleOptions: readonly { label: string; value: UserRole }[] = [
  { label: "Süper yönetici", value: "super_admin" },
  { label: "Finans", value: "finance" },
  { label: "Onaylayıcı", value: "approver" },
  { label: "Saha operasyon", value: "field_operator" },
];

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="admin-action-button sm:w-auto" disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : isEditing ? <Pencil aria-hidden="true" className="size-4" /> : <UserRoundPlus aria-hidden="true" className="size-4" />}{pending ? "Kaydediliyor" : isEditing ? "Hesabı güncelle" : "Hesap oluştur"}</button>;
}

export function UserRecordForm({ record }: { record?: PanelUserRecord }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState<UserActionState, FormData>(savePanelUser, { message: null, success: false });
  const isEditing = Boolean(record);

  return (
    <details className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)]" onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)} open={isEditing ? undefined : isOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--admin-text)]"><span className="flex items-center gap-2">{isEditing ? <Pencil aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> : <Plus aria-hidden="true" className="size-4 text-[var(--admin-primary)]" />}{isEditing ? "Hesabı düzenle" : "Yeni personel hesabı"}</span><ChevronDown aria-hidden="true" className="size-4 text-[var(--admin-muted)]" /></summary>
      <form action={formAction} className="border-t border-[var(--admin-border)] p-4">
        {record ? <input name="id" type="hidden" value={record.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Ad soyad *</span><input className="admin-input" defaultValue={record?.name || ""} name="name" required type="text" /></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">E-posta adresi *</span><input autoComplete="email" className="admin-input" defaultValue={record?.email || ""} name="email" required type="email" /></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Rol *</span><select className="admin-input" defaultValue={record?.role || "field_operator"} name="role">{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">{isEditing ? "Yeni şifre" : "Geçici şifre *"}</span><input autoComplete="new-password" className="admin-input" minLength={12} name="password" placeholder={isEditing ? "Değiştirmek için girin" : "En az 12 karakter"} required={!isEditing} type="password" /></label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] px-3 text-sm font-medium text-[var(--admin-text)]"><input defaultChecked={record ? record.isActive : true} name="isActive" type="checkbox" /> Hesap aktif</label>
        </div>
        {state.message ? <p aria-live="polite" className={state.success ? "mt-4 text-sm text-[var(--admin-primary)]" : "mt-4 text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
        <div className="mt-5 flex justify-end"><SubmitButton isEditing={isEditing} /></div>
      </form>
    </details>
  );
}
