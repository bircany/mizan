"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, LoaderCircle, Play, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type FieldSubmissionFlowProps = { taskId: string; taskTitle: string; taskStatus: string };
type UploadState = { name: string; progress: number; error?: string };

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error || "İşlem tamamlanamadı.");
  return payload;
}

function uploadAsset(file: File, submissionId: string, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("submissionId", submissionId);
    form.append("file", file);
    xhr.upload.addEventListener("progress", (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); });
    xhr.addEventListener("load", () => {
      try { const body = JSON.parse(xhr.responseText || "{}"); if (xhr.status >= 200 && xhr.status < 300 && body.success) resolve(); else reject(new Error(body.error || "Dosya yüklenemedi.")); }
      catch { reject(new Error("Dosya yükleme yanıtı okunamadı.")); }
    });
    xhr.addEventListener("error", () => reject(new Error("Dosya yükleme bağlantısı kesildi.")));
    xhr.open("POST", "/api/field/assets");
    xhr.send(form);
  });
}

export function FieldSubmissionFlow({ taskId, taskTitle, taskStatus }: FieldSubmissionFlowProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [summary, setSummary] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isStartable = taskStatus === "todo" || taskStatus === "needs_revision";
  const canPrepareSubmission = taskStatus === "in_progress" || taskStatus === "needs_revision";

  async function startTask() {
    setIsWorking(true); setMessage(null);
    try { await readResponse(await fetch(`/api/field/tasks/${taskId}/start`, { method: "POST" })); setMessage("Görev başlatıldı. Teslim hazırlamaya geçebilirsiniz."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Görev başlatılamadı."); }
    finally { setIsWorking(false); }
  }

  async function createSubmission() {
    if (!files.length) { setMessage("Teslim oluşturmak için en az bir kanıt dosyası seçin."); return; }
    setIsWorking(true); setMessage(null);
    try {
      const created = await readResponse(await fetch("/api/field/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fieldTaskId: taskId, title: taskTitle, summary }) }));
      const id = String(created.result.id);
      setSubmissionId(id); setUploads(files.map((file) => ({ name: file.name, progress: 0 })));
      for (const [index, file] of files.entries()) {
        try { await uploadAsset(file, id, (progress) => setUploads((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, progress } : item))); }
        catch (error) { const errorMessage = error instanceof Error ? error.message : "Dosya yüklenemedi."; setUploads((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, error: errorMessage } : item)); throw error; }
      }
      setMessage("Kanıt dosyaları güvenli depolamaya eklendi. Dış onay bilgilerini girerek incelemeye gönderin.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Teslim oluşturulamadı."); }
    finally { setIsWorking(false); }
  }

  async function sendForReview() {
    if (!submissionId) return;
    if (!approvalCode.trim() && !referenceId.trim()) { setMessage("İncelemeye göndermek için dış onay kodu veya referans numarası girin."); return; }
    setIsWorking(true); setMessage(null);
    try {
      const details = { externalApprovalCode: approvalCode, externalReferenceId: referenceId };
      await readResponse(await fetch(`/api/field/submissions/${submissionId}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transition: "submit", ...details }) }));
      await readResponse(await fetch(`/api/field/submissions/${submissionId}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transition: "mark_ready_for_review", ...details }) }));
      setMessage("Teslim inceleme kuyruğuna gönderildi."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Teslim incelemeye gönderilemedi."); }
    finally { setIsWorking(false); }
  }

  return <div className="mt-5 border-t border-[var(--admin-border)] pt-4">
    {isStartable ? <button className="admin-action-button" disabled={isWorking} onClick={startTask} type="button"><Play aria-hidden="true" className="size-4" /> {isWorking ? "Başlatılıyor..." : "Görevi başlat"}</button> : null}
    {canPrepareSubmission && !submissionId ? <div className="space-y-3"><textarea className="admin-input min-h-20" onChange={(event) => setSummary(event.target.value)} placeholder="Teslim özeti (isteğe bağlı)" value={summary} /><input accept="application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime" className="sr-only" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} ref={fileInput} type="file" /><button className="admin-action-button-secondary" onClick={() => fileInput.current?.click()} type="button"><FileUp aria-hidden="true" className="size-4" /> {files.length ? `${files.length} dosya seçildi` : "Kanıt dosyası seç"}</button><button className="admin-action-button" disabled={isWorking || !files.length} onClick={createSubmission} type="button">{isWorking ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <FileUp aria-hidden="true" className="size-4" />} Teslimi oluştur ve yükle</button></div> : null}
    {uploads.length ? <div className="mt-4 space-y-2">{uploads.map((upload) => <div className="rounded-md bg-[var(--admin-surface-raised)] p-3" key={upload.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-[var(--admin-text)]">{upload.name}</span><span className="font-mono text-[var(--admin-muted)]">{upload.error ? "Hata" : `${upload.progress}%`}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--admin-border)]"><div className="h-full rounded-full bg-[var(--admin-primary)] transition-[width]" style={{ width: `${upload.progress}%` }} /></div>{upload.error ? <p className="mt-2 text-xs text-[var(--admin-danger)]">{upload.error}</p> : null}</div>)}</div> : null}
    {submissionId ? <div className="mt-4 space-y-3"><input className="admin-input" onChange={(event) => setApprovalCode(event.target.value)} placeholder="Dış onay kodu" value={approvalCode} /><input className="admin-input" onChange={(event) => setReferenceId(event.target.value)} placeholder="Dış referans numarası" value={referenceId} /><button className="admin-action-button" disabled={isWorking} onClick={sendForReview} type="button"><Send aria-hidden="true" className="size-4" /> İncelemeye gönder</button></div> : null}
    {message ? <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--admin-muted)]"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--admin-primary)]" />{message}</p> : null}
  </div>;
}
