"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImageUp, LoaderCircle, Upload } from "lucide-react";

import { uploadMedia, type MediaActionState } from "@/lib/admin/media-actions";

const initialState: MediaActionState = { message: null, success: false };

function UploadButton() {
  const { pending } = useFormStatus();
  return <button className="admin-action-button sm:w-auto" disabled={pending} type="submit">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}{pending ? "Yükleniyor" : "Görseli yükle"}</button>;
}

export function MediaUploadForm() {
  const router = useRouter();
  const [state, action] = useActionState(uploadMedia, initialState);
  const [preview, setPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef("");
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function showPreview(file?: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const next = file ? URL.createObjectURL(file) : "";
    previewRef.current = next;
    setPreview(next);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) { showPreview(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    showPreview(file);
  }

  return <form action={action} className="admin-card grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div>
      <label className={dragging ? "grid min-h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--admin-primary)] bg-[var(--admin-shell-surface)] p-6 text-center" : "grid min-h-52 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-center transition hover:border-[var(--admin-primary)]"} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <input accept="image/jpeg,image/png,image/webp" className="sr-only" name="file" onChange={onFileChange} ref={inputRef} type="file" />
        <span><ImageUp className="mx-auto size-8 text-[var(--admin-primary)]" /><strong className="mt-3 block text-sm">Görseli buraya sürükleyin veya seçin</strong><span className="mt-1 block text-xs text-[var(--admin-muted)]">JPG, PNG veya WebP · en fazla 10 MB</span></span>
      </label>
    </div>
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">{preview ? <Image alt="Yüklenecek görsel önizlemesi" className="object-cover" fill sizes="320px" src={preview} unoptimized /> : <span className="absolute inset-0 grid place-items-center text-xs text-[var(--admin-muted)]">Önizleme</span>}</div>
      <label><span className="admin-label">Alternatif metin *</span><input className="admin-input" name="alt" placeholder="Görselde ne olduğunu kısa biçimde açıklayın" required /></label>
      <UploadButton />
      {state.message ? <p aria-live="polite" className={state.success ? "text-sm text-[var(--admin-primary-strong)]" : "text-sm text-[var(--admin-danger)]"}>{state.message}</p> : null}
    </div>
  </form>;
}
