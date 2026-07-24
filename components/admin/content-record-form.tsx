"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, LoaderCircle, Pencil, Plus } from "lucide-react";

import type { ContentActionState } from "@/lib/admin/content-actions";
import { saveContentRecord } from "@/lib/admin/content-actions";
import type { ContentDefinition, ContentRecord } from "@/lib/admin/content";
import { CampaignFundingWizard } from "@/components/admin/campaign-funding-wizard";

function SaveButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="admin-action-button sm:w-auto" disabled={pending} type="submit">
      {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : isEditing ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
      {pending ? "Kaydediliyor" : isEditing ? "Değişiklikleri kaydet" : "Kayıt oluştur"}
    </button>
  );
}

function Field({ field, values }: { field: ContentDefinition["fields"][number]; values: ContentRecord["values"] }) {
  const value = values[field.name];

  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-3 text-sm font-medium text-[var(--admin-text)]">
        <input defaultChecked={value === true} name={field.name} type="checkbox" />
        {field.label}
      </label>
    );
  }

  return (
    <label className={field.type === "textarea" ? "sm:col-span-2" : ""}>
      <span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">
        {field.label}
        {field.required ? " *" : ""}
      </span>
      {field.type === "textarea" ? (
        <textarea className="admin-input min-h-28 resize-y" defaultValue={typeof value === "string" ? value : ""} name={field.name} required={field.required} />
      ) : field.type === "select" ? (
        <select className="admin-input" defaultValue={typeof value === "string" ? value : ""} name={field.name} required={field.required}>
          {field.required ? (
            <option disabled value="">
              Seçiniz
            </option>
          ) : null}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="admin-input"
          defaultValue={typeof value === "number" || typeof value === "string" ? value : ""}
          min={field.type === "number" ? 0 : undefined}
          name={field.name}
          required={field.required}
          type={field.type}
        />
      )}
    </label>
  );
}

function CampaignCoverField({ values }: { values: ContentRecord["values"] }) {
  const coverUrl = typeof values.coverImageUrl === "string" ? values.coverImageUrl : "";
  const coverAlt = typeof values.coverImageAlt === "string" ? values.coverImageAlt : "";
  const coverPath = typeof values.coverImagePath === "string" ? values.coverImagePath : "";

  return (
    <div className="sm:col-span-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Kapak fotoğrafı</p>
          <p className="mt-1 text-sm text-[var(--admin-text)]">
            Bağış alanı kartlarında ve detay sayfasında görünen görseli buradan yükleyin.
          </p>
          {coverUrl ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white">
              <img alt={coverAlt || "Kapak fotoğrafı"} className="h-44 w-full object-cover" src={coverUrl} />
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)] px-4 py-3 text-sm text-[var(--admin-muted)]">
              Henüz kapak fotoğrafı yok.
            </div>
          )}
          {coverPath ? <p className="mt-2 break-all text-xs text-[var(--admin-muted)]">{coverPath}</p> : null}
        </div>
        <label className="lg:w-[320px]">
          <span className="mb-2 block text-xs font-semibold text-[var(--admin-muted)]">Yeni kapak fotoğrafı</span>
          <input accept="image/jpeg,image/png,image/webp" className="admin-input" name="coverImage" type="file" />
          <p className="mt-2 text-xs leading-5 text-[var(--admin-muted)]">
            JPG, PNG veya WebP yükleyebilirsin. Dosya Supabase Storage içinde saklanır.
          </p>
        </label>
      </div>
    </div>
  );
}

export function ContentRecordForm({ definition, record }: { definition: ContentDefinition; record?: ContentRecord }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState<ContentActionState, FormData>(saveContentRecord, { message: null, success: false });
  if (definition.collection === "campaigns") return <CampaignFundingWizard definition={definition} record={record} />;

  const values = record?.values || {};
  const isEditing = Boolean(record);

  return (
    <details
      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-raised)]"
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
      open={isEditing ? undefined : isOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--admin-text)]">
        <span className="flex items-center gap-2">
          {isEditing ? <Pencil aria-hidden="true" className="size-4 text-[var(--admin-primary)]" /> : <Plus aria-hidden="true" className="size-4 text-[var(--admin-primary)]" />}
          {isEditing ? "Kaydı düzenle" : definition.createLabel}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-[var(--admin-muted)]" />
      </summary>
      <form action={formAction} className="border-t border-[var(--admin-border)] p-4">
        <input name="collection" type="hidden" value={definition.collection} />
        {record ? <input name="id" type="hidden" value={record.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {definition.fields.map((field) => (
            <Field field={field} key={field.name} values={values} />
          ))}
        </div>
        {state.message ? (
          <p aria-live="polite" className={state.success ? "mt-4 text-sm text-[var(--admin-primary)]" : "mt-4 text-sm text-[var(--admin-danger)]"}>
            {state.message}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end">
          <SaveButton isEditing={isEditing} />
        </div>
      </form>
    </details>
  );
}
