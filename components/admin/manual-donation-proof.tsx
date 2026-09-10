"use client";
import { useRef, useState } from "react";
import { attachManualProof } from "@/lib/admin/manual-donation-actions";

export function ManualDonationProof({donationId,sessionId}: {donationId:string;sessionId:string}) {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const locked = useRef(false);
  return <form className="mt-4 space-y-3 rounded-xl border border-[var(--admin-border)] p-4" onSubmit={async event=>{
    event.preventDefault(); if(locked.current) return;
    const data = new FormData(event.currentTarget); data.set("donationId",donationId);
    locked.current=true;setBusy(true);
    try {const result=await attachManualProof(data);setMessage(result.message);}
    catch {setMessage("Dekont eklenemedi. Bağış kaydı korunuyor.");}
    finally {locked.current=false;setBusy(false);}
  }}>
    <label className="block text-sm">Dekont ekleyin — önerilir<input className="mt-2 block w-full" required name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy}/></label>
    <p className="text-xs text-[var(--admin-muted)]">PDF/JPG/PNG · en fazla 10 MB. Önceki dekontlar özel depolamada korunur.</p>
    <button className="admin-button-secondary" type="submit" disabled={busy}>{busy ? "Yükleniyor…" : "Dekontu kaydet"}</button>
    {sessionId ? <a className="ml-3 text-sm underline" href={`/api/donations/eft-review/${sessionId}/proof`} target="_blank" rel="noreferrer">Kayıtlı dekontu indir</a> : null}
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </form>;
}
