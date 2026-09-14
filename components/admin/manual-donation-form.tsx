"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPhoneField } from "./admin-phone-field";
import { Plus, X } from "lucide-react";
import type { CampaignEditorRecord } from "./unified-campaign-editor";
import { attachManualProof, findManualDonor, saveManualDonation } from "@/lib/admin/manual-donation-actions";
import { amountFromCents, moneyCents } from "@/lib/donations/manual-validation";
import { formatCurrency } from "@/lib/utils";

export function ManualDonationForm({campaigns}: {campaigns:CampaignEditorRecord[]}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const lookupVersion = useRef(0);
  const [requestId,setRequestId] = useState("");
  const [campaignId,setCampaignId] = useState("");
  const [quantity,setQuantity] = useState("1");
  const [freeAmount,setFreeAmount] = useState("");
  const [received,setReceived] = useState("");
  const [country,setCountry] = useState("TR");
  const [phone,setPhone] = useState("");
  const [name,setName] = useState("");
  const [differentWhatsapp,setDifferentWhatsapp] = useState(false);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [saved,setSaved] = useState<{id:number;receipt:string}|null>(null);
  const websiteCampaigns = campaigns.filter(c=>c.status === "active");
  const hiddenCampaigns = campaigns.filter(c=>c.status === "draft");
  const campaign = campaigns.find(c=>c.id === campaignId);
  const fixed = campaign?.pricingModel === "fixed";
  let expected = 0, actual = 0;
  try { expected = fixed ? moneyCents(campaign?.unitPrice) * Number(quantity) : moneyCents(freeAmount); } catch { /* incomplete input */ }
  try { actual = moneyCents(received); } catch { /* incomplete input */ }
  const difference = actual - expected;
  const validQuantity = Number.isInteger(Number(quantity)) && Number(quantity)>0 && Number(quantity)<=500;
  function open() {
    form.current?.reset(); locked.current=false; lookupVersion.current++;
    setRequestId(crypto.randomUUID()); setCampaignId(""); setQuantity("1"); setFreeAmount(""); setReceived(""); setCountry("TR"); setPhone(""); setName(""); setDifferentWhatsapp(false); setMessage(""); setSaved(null);
    dialog.current?.showModal();
  }
  async function lookup() {
    if (!phone.trim()) return;
    const version = ++lookupVersion.current;
    try {
      const result = await findManualDonor(phone,country);
      if (version !== lookupVersion.current) return;
      if (result.success) {
        if (result.name) { setName(result.name); setMessage("Kayıtlı bağışçının adı dolduruldu; değiştirebilirsiniz."); }
        else setMessage("Bu numarayla kayıt bulunamadı. Ad soyad girin.");
      } else setMessage(result.message);
    } catch { setMessage("Bağışçı araması yapılamadı. Bilgileri elle girebilirsiniz."); }
  }
  async function submit() {
    if (locked.current || !form.current || !form.current.reportValidity()) return;
    const data = new FormData(form.current);
    if (!saved && difference>0 && !window.confirm(`${formatCurrency(difference/100,campaign?.currency || "TRY")} fazla ödeme var. Tamamı bu kampanyaya bağış olarak kaydedilecek, hisse/adet değişmeyecek. Emin misiniz?`)) return;
    if (difference>0) data.set("excessConfirmed","on");
    locked.current=true; setBusy(true); setMessage("");
    let committed = saved;
    try {
      if (!committed) {
        // Proof is uploaded separately; never include file bytes in payment creation.
        const recordData = new FormData();
        for (const [key,value] of data.entries()) if (typeof value === "string") recordData.set(key,value);
        const response = await saveManualDonation(recordData);
        if (!response.success) { setMessage(response.message); return; }
        committed = {id:response.id,receipt:response.receipt}; setSaved(committed); setMessage(response.message);
      }
      const file = data.get("file");
      if (file instanceof File && file.size>0) {
        const proofData = new FormData(); proofData.set("donationId",String(committed.id)); proofData.set("file",file);
        const proof = await attachManualProof(proofData);
        setMessage(proof.success ? "Bağış ve dekont kaydedildi." : `Bağış kaydedildi. ${proof.message} Dekontu tekrar deneyebilirsiniz.`);
      } else if (saved) setMessage("Dekont dosyası seçin. Bağış zaten kaydedildi.");
      router.refresh();
    } catch { setMessage(committed ? "Bağış kaydı korunuyor. Dekont yüklemesini tekrar deneyebilirsiniz." : "Sonuç alınamadı. Aynı formdan tekrar deneyin; kayıt kimliği mükerrer işlemi önler."); }
    finally {locked.current=false;setBusy(false);}
  }
  const fieldClass = "admin-input w-full";
  return <>
    <button className="inline-flex min-h-8 w-fit shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" type="button" onClick={open}><Plus className="size-3.5"/>Bağış kaydı</button>
    <dialog ref={dialog} className="w-[min(760px,94vw)] rounded-2xl bg-[var(--admin-surface)] p-0 text-[var(--admin-text)] backdrop:bg-black/50" onCancel={event=>{if(locked.current) event.preventDefault();}}>
      <header className="flex items-center justify-between border-b border-[var(--admin-border)] p-5"><h2 className="text-xl font-bold">IBAN bağış kaydı</h2><button className="admin-icon-button" type="button" disabled={busy} onClick={()=>dialog.current?.close()} aria-label="Pencereyi kapat" title="Pencereyi kapat"><X className="size-5" /></button></header>
      <form ref={form} onSubmit={event=>{event.preventDefault();void submit();}} className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
        <input type="hidden" name="requestId" value={requestId}/>
        <input type="hidden" name="currency" value={campaign?.currency || ""}/>
        <input type="hidden" name="expectedAmount" value={expected>0 ? amountFromCents(expected) : ""}/>
        <fieldset disabled={busy || !!saved} className="space-y-4 disabled:opacity-70">
          <label className="block text-sm">Bağış alanı *<select className={fieldClass} name="campaignId" required value={campaignId} onChange={event=>{setCampaignId(event.target.value);setQuantity("1");setReceived("");}}><option value="">Bağış alanı seçin</option>{websiteCampaigns.length ? <optgroup label="Web sitesinde görünen bağış alanları">{websiteCampaigns.map(c=><option value={c.id} key={c.id}>{c.title} · {c.currency}</option>)}</optgroup> : null}{hiddenCampaigns.length ? <optgroup label="Web sitesinde görünmeyen bağış alanları">{hiddenCampaigns.map(c=><option value={c.id} key={c.id}>{c.title} · {c.currency} · Yalnız yönetim panelinde</option>)}</optgroup> : null}</select><span className="mt-2 block text-xs leading-5 text-[var(--admin-muted)]">Web sitesinde görünmeyen taslak alanlara da buradan manuel IBAN bağışı kaydedebilirsiniz.</span></label>
          <div className="grid gap-4 sm:grid-cols-2">
            {fixed ? <label className="text-sm">Hisse / adet *<input className={fieldClass} name="quantity" type="number" required min="1" max="500" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label> : <><input type="hidden" name="quantity" value="1"/><label className="text-sm">Bağış tutarı *<input className={fieldClass} type="number" required min="1" step="0.01" value={freeAmount} onChange={e=>setFreeAmount(e.target.value)}/></label></>}
            <label className="text-sm">Alınan ödeme ({campaign?.currency || "—"}) *<input className={fieldClass} name="receivedAmount" required type="number" min="1" step="0.01" value={received} onChange={e=>setReceived(e.target.value)}/></label>
          </div>
          {campaign && expected>0 ? <div className={`rounded-xl border p-4 text-sm ${actual>0 && difference<0 ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--admin-border)]"}`}>
            {fixed ? `${quantity} × ${formatCurrency(Number(campaign.unitPrice),campaign.currency)} = ` : "Beklenen: "}{formatCurrency(expected/100,campaign.currency)}
            {actual>0 ? <p className="mt-2">{difference<0 ? `${formatCurrency(-difference/100,campaign.currency)} eksik. Kayıt yapılamaz.` : difference>0 ? `${formatCurrency(difference/100,campaign.currency)} fazla. Kaydetmeden önce onay istenecek.` : "Alınan ödeme ile tutar eşleşiyor."}</p> : null}
          </div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminPhoneField key={requestId} name="phone" label="Telefon" countryName="country" country={country} value={phone} onCountryChange={value=>{lookupVersion.current++;setCountry(value);}} onChange={value=>{lookupVersion.current++;setPhone(value);}} onBlur={()=>void lookup()} required />
            <label className="text-sm">Ad soyad *<input className={fieldClass} name="donorName" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={e=>{lookupVersion.current++;setName(e.target.value);}}/></label>
            <label className="text-sm">Ödeme tarihi *<input className={fieldClass} name="date" required type="date" defaultValue={new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Istanbul"})} max={new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Istanbul"})}/></label>
          </div>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={differentWhatsapp} onChange={e=>setDifferentWhatsapp(e.target.checked)}/>WhatsApp numarası farklı</label>
          {differentWhatsapp ? <AdminPhoneField key={`whatsapp-${requestId}`} name="whatsapp" label="WhatsApp numarası" countryName="whatsappCountry" required /> : null}
          {fixed && validQuantity && Number(quantity)>1 ? <details key={quantity}><summary className="cursor-pointer text-sm font-semibold">Hissedar bilgilerini ayrı düzenle ({quantity} hisse)</summary><p className="my-2 text-xs">Boş alanlar bağışçının adı ve WhatsApp numarasıyla doldurulur.</p><div className="max-h-64 space-y-2 overflow-auto">{Array.from({length:Number(quantity)},(_,i)=><div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.5fr)]" key={i}><span>{i+1}</span><input aria-label={`${i+1}. hisse ad soyad`} className={fieldClass} name={`participantName.${i}`} placeholder={name || "Ad soyad"} maxLength={120}/><div className="col-start-2 sm:col-start-auto"><AdminPhoneField name={`participantPhone.${i}`} label={`${i+1}. hisse WhatsApp`} countryName={`participantCountry.${i}`} /></div></div>)}</div></details> : null}
          {campaign?.videoDelivery === "video" ? <label className="flex gap-2 text-sm"><input type="checkbox" name="contactConsent" required/>Bağışçı/hissedarların WhatsApp ile video bağlantısı almayı kabul ettiğini doğruladım.</label> : null}
          {campaign?.operationType === "slaughter_video" ? <label className="flex gap-2 text-sm"><input type="checkbox" name="proxyConsent" required/>Hissedarların kesim vekâletini aldım.</label> : null}
          <label className="block text-sm">Not (isteğe bağlı)<textarea className={fieldClass} name="note" maxLength={2000}/></label>
        </fieldset>
        <label className="block rounded-xl border border-dashed border-[var(--admin-border)] p-4 text-sm">Dekont ekleyin — önerilir<input className="mt-3 block w-full" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy}/><span className="mt-2 block text-xs text-[var(--admin-muted)]">PDF, JPG veya PNG · en fazla 10 MB. Dekontsuz da kaydedebilirsiniz.</span></label>
        {message ? <p role="status" className="rounded-xl border border-[var(--admin-border)] p-3 text-sm">{message}</p> : null}
        {saved ? <p className="break-all text-sm">Kayıt numarası: {saved.receipt}</p> : null}
        <div className="flex flex-wrap justify-end gap-3"><button className="admin-button-secondary" disabled={busy} type="button" onClick={()=>dialog.current?.close()}>{saved ? "Tamam" : "Vazgeç"}</button><button className="admin-action-button" type="submit" disabled={busy || (!saved && (!campaign || expected<=0 || actual<expected || !validQuantity))}>{busy ? "İşleniyor…" : saved ? "Dekontu ekle / tekrar dene" : "Ödeme alındı — kaydet"}</button></div>
      </form>
    </dialog>
  </>;
}
