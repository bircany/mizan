import Image from "next/image";
import Link from "next/link";

import type { NewsBlock } from "@/lib/editorial";
import type { PublicNewsCampaign } from "@/lib/public/news";

export function NewsBlockRenderer({ blocks, campaigns }: { blocks: NewsBlock[]; campaigns: PublicNewsCampaign[] }) {
  const campaignMap = new Map(campaigns.map((item) => [item.id, item]));
  return <div className="space-y-6 text-body-lg leading-8 text-on-surface-variant">{blocks.map((block) => {
    if (block.type === "heading") { const className="pt-4 font-headline text-on-surface"; return block.level===2?<h2 className={`${className} text-headline-xl`} key={block.id}>{block.text}</h2>:block.level===3?<h3 className={`${className} text-headline-lg`} key={block.id}>{block.text}</h3>:<h4 className={`${className} text-headline-md`} key={block.id}>{block.text}</h4>; }
    if (block.type === "paragraph") return <p className="whitespace-pre-line" key={block.id}>{block.text}</p>;
    if (block.type === "list") { const Tag=block.ordered?"ol":"ul"; return <Tag className={block.ordered?"list-decimal space-y-2 pl-6":"list-disc space-y-2 pl-6"} key={block.id}>{block.items.map((item,index)=><li key={`${block.id}-${index}`}>{item}</li>)}</Tag>; }
    if (block.type === "quote") return <blockquote className="rounded-r-2xl border-l-4 border-secondary bg-surface-container-low p-6 italic" key={block.id}><p>{block.text}</p>{block.cite?<cite className="mt-3 block text-sm not-italic">— {block.cite}</cite>:null}</blockquote>;
    if (block.type === "image") return <figure key={block.id}><div className="relative aspect-video overflow-hidden rounded-[24px]"><Image alt={block.alt} className="object-cover" fill sizes="800px" src={block.src}/></div>{block.caption?<figcaption className="mt-2 text-center text-sm text-outline">{block.caption}</figcaption>:null}</figure>;
    if (block.type === "campaign") { const campaign=campaignMap.get(String(block.campaignId)); if(!campaign)return null; return <aside className="rounded-[24px] border border-primary/20 bg-primary-container/20 p-6" key={block.id}><p className="text-sm font-bold uppercase tracking-wide text-primary">Bağış çağrısı</p><h3 className="mt-2 text-headline-md text-on-surface">{block.label||campaign.title}</h3><p className="mt-2 text-body-md">{block.note||campaign.description}</p><Link className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white" href={`/bagis/${campaign.slug}`}>Bağış alanını incele</Link></aside>; }
    if (block.type === "cta") return <aside className="rounded-[24px] bg-primary p-7 text-white" key={block.id}><p>{block.text}</p><Link className="mt-4 inline-flex rounded-full bg-secondary px-5 py-2.5 text-sm font-bold" href={block.href}>{block.label}</Link></aside>;
    return <hr className="border-outline-variant" key={block.id}/>;
  })}</div>;
}
