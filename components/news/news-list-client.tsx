"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Search } from "lucide-react";

import type { PublicNewsCategory, PublicNewsPost } from "@/lib/public/news";

export function NewsListClient({ posts, categories, activeCategory }: { posts: PublicNewsPost[]; categories: PublicNewsCategory[]; activeCategory?: string }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr");
    if (!normalized) return posts;
    return posts.filter((post) => [post.title, post.excerpt, post.searchText, post.tags.join(" "), post.category?.name || "", post.relatedCampaigns.map((item) => item.title).join(" ")].join(" ").toLocaleLowerCase("tr").includes(normalized));
  }, [posts, query]);
  return <div className="mx-auto max-w-container-max px-margin-mobile py-xl md:px-margin-desktop">
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end"><div><p className="text-label-md font-bold uppercase tracking-[.18em] text-secondary">Mizan’dan gelişmeler</p><h1 className="mt-3 text-display-lg-mobile text-primary md:text-display-lg">Haberler ve faaliyetler</h1><p className="mt-4 max-w-2xl text-body-lg text-on-surface-variant">Sahadaki çalışmalarımızı, duyuruları ve bağışlarınızla büyüyen iyilik hikâyelerini takip edin.</p></div><div><label className="relative block"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-outline"/><input className="w-full rounded-2xl border border-outline-variant bg-surface py-4 pl-12 pr-4 outline-none focus:border-primary" onChange={(e)=>setQuery(e.target.value)} placeholder="Konu, etiket veya bağış alanı ara" value={query}/></label><div className="mt-3 flex flex-wrap gap-2"><Link className={!activeCategory?"rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white":"rounded-full border border-outline-variant px-4 py-2 text-sm"} href="/haberler">Tüm yazılar</Link>{categories.map((category)=><Link className={activeCategory===category.slug?"rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white":"rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm"} href={`/haberler/kategori/${category.slug}`} key={category.id}>{category.name}</Link>)}</div></div></div>
    <p className="mt-8 text-sm text-on-surface-variant">{filtered.length} sonuç</p>
    {filtered.length ? <div className="mt-5 grid gap-gutter md:grid-cols-2 lg:grid-cols-3">{filtered.map((post)=><Link className="group overflow-hidden rounded-[24px] border border-outline-variant bg-surface shadow-soft transition hover:-translate-y-1 hover:border-primary hover:shadow-ambient" href={`/haberler/${post.slug}`} key={post.id}><div className="relative aspect-[16/10] overflow-hidden bg-surface-container">{post.coverImageUrl?<Image alt={post.coverImageAlt} className="object-cover transition duration-700 group-hover:scale-105" fill sizes="(max-width:768px) 100vw, 33vw" src={post.coverImageUrl}/>:<div className="grid h-full place-items-center text-primary"><span className="material-symbols-outlined text-5xl">newspaper</span></div>}{post.category?<span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">{post.category.name}</span>:null}</div><div className="p-5"><div className="flex gap-4 text-xs text-outline"><span className="flex items-center gap-1"><CalendarDays className="size-4"/>{post.publishedAt?new Date(post.publishedAt).toLocaleDateString("tr-TR"):""}</span><span className="flex items-center gap-1"><Clock3 className="size-4"/>{post.readTimeMinutes} dk</span></div><h2 className="mt-3 line-clamp-2 text-headline-md text-on-surface transition group-hover:text-primary">{post.title}</h2><p className="mt-3 line-clamp-3 text-body-md text-on-surface-variant">{post.excerpt}</p></div></Link>)}</div>:<div className="mt-6 rounded-2xl border border-dashed border-outline-variant bg-surface p-10 text-center"><h2 className="text-headline-md">Sonuç bulunamadı</h2><p className="mt-2 text-on-surface-variant">Aramayı farklı bir konu, etiket veya kategoriyle genişletin.</p></div>}
  </div>;
}
