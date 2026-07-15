"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ClipboardPlus, LoaderCircle, Pencil, Plus } from "lucide-react";

import { saveFieldTask, type FieldTaskActionState } from "@/lib/admin/field-task-actions";

type Option = { label: string; value: string };
type FieldTaskRecord = { assignedTo: string; campaign: string; dueAt: string; id: string; location: string; notes: string; title: string };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="admin-action-button sm:w-auto" disabled={pending} type="submit">{pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : isEditing ? <Pencil aria-hidden="true" className="size-4" /> : <ClipboardPlus aria-hidden="true" className="size-4" />}{pending ? "Kaydediliyor" : isEditing ? "Görevi güncelle" : "Görev oluştur"}</button>;
}

export function FieldTaskForm({ campaigns, operators, record }: { campaigns: readonly Option[]; operators: readonly Option[]; record?: FieldTaskRecord }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState<FieldTaskActionState, FormData>(saveFieldTask, { message: null, success: false });
  const isEditing = Boolean(record);

  return (
    <details className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)]" onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)} open={isEditing ? undefined : isOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--admin-text)]"><span className="flex items-center gap-2">{isEditing ? <Pencil aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> : <Plus aria-hidden="true" className="size-4 text-[var(--admin-primary)]" />}{isEditing ? "Görevi düzenle" : "Yeni saha görevi"}</span><ChevronDown aria-hidden="true" className="size-4 text-[var(--admin-muted)]" /></summary>
      <form action={formAction} className="border-t border-[var(--admin-border)] p-4">
        {record ? <input name="id" type="hidden" value={record.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Görev başlığı *</span><input className="admin-input" defaultValue={record?.title || ""} name="title" required type="text" /></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Konum *</span><input className="admin-input" defaultValue={record?.location || ""} name="location" required type="text" /></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Bağış alanı *</span><select className="admin-input" defaultValue={record?.campaign || ""} name="campaign" required><option disabled value="">Seçin</option>{campaigns.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Saha görevlisi *</span><select className="admin-input" defaultValue={record?.assignedTo || ""} name="assignedTo" required><option disabled value="">Seçin</option>{operators.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Teslim tarihi</span><input className="admin-input" defaultValue={record?.dueAt || ""} name="dueAt" type="datetime-local" /></label>
          <label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">İç not</span><textarea className="admin-input min-h-24 resize-y" defaultValue={record?.notes || ""} name="notes" /></label>
        </div>
        {state.message ? <p aria-live="polite" className={state.success ? "mt-4 text-sm text-[var(--admin-primary)]" : "mt-4 text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
        <div className="mt-5 flex justify-end"><SubmitButton isEditing={isEditing} /></div>
      </form>
    </details>
  );
}
