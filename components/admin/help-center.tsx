"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

const guides = [
  ["Kampanya oluşturma", "Serbest veya sabit tutar, stok, video ve yayın ayarları", "/panel/bagis-yonetimi?tab=campaigns"],
  ["Bağış kayıtları", "Kesinleşen bağışları ve satın alma anındaki tutarları izleme", "/panel/bagis-yonetimi?tab=donations"],
  ["EFT onayı", "Dekontu görüntüleme, açıklama ekleme ve banka transferini karara bağlama", "/panel/bagis-yonetimi?tab=eft"],
  ["Video teslimat", "Video yükleme, taslak oluşturma, test ve toplu WhatsApp gönderimi", "/panel/video-teslimat"],
  ["Hatalı mesajlar", "Başarısız teslimatları inceleme ve yeniden kuyruğa alma", "/panel/video-teslimat?tab=failed"],
];

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => guides.filter(([title, description]) => `${title} ${description}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))), [query]);
  return <div className="space-y-5">
    <label className="relative block"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-muted)]" /><input className="admin-input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rehberlerde ara" /></label>
    <div className="grid gap-4 md:grid-cols-2">{results.map(([title, description, href]) => <Link className="admin-card transition hover:-translate-y-0.5" href={href} key={title}><h2 className="font-semibold text-[var(--admin-text)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">{description}</p></Link>)}</div>
    <section className="admin-card"><p className="admin-eyebrow">Videolu bağış rehberi</p><ol className="mt-4 grid gap-2 text-sm leading-6 text-[var(--admin-muted)] md:grid-cols-2">{["Kampanyayı oluşturun.", "Sabit veya serbest tutarı seçin.", "Videolu teslimatı açın.", "Sabit kampanyada grup kapasitesini girin.", "Kampanyayı aktif edin.", "Bağış ve ödemeyi doğrulayın.", "Oluşan MD grubuna videoyu yükleyin.", "Taslak mesajı kontrol edip test gönderin.", "Gönderimi başlatıp teslim durumlarını izleyin."].map((step, index) => <li key={step}><span className="mr-2 font-mono text-[var(--admin-primary)]">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol></section>
    <section className="admin-card"><p className="font-semibold text-[var(--admin-text)]">Destek iletişimi</p><p className="text-sm text-[var(--admin-muted)]">İletişim: <a href="https://softartstudios.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--admin-primary)] hover:underline">softartstudios.com</a></p></section>
  </div>;
}
