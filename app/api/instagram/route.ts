import { NextResponse } from "next/server";

const FALLBACK_POSTS = [
  {
    id: "1",
    mediaUrl: "https://picsum.photos/seed/mizan1/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Mizan Derneği olarak iyilik yolculuğumuz devam ediyor.",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    mediaUrl: "https://picsum.photos/seed/mizan2/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Kurban bağışlarınızla ihtiyaç sahiplerine ulaşıyoruz.",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
  },
  {
    id: "3",
    mediaUrl: "https://picsum.photos/seed/mizan3/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Yetimlerimizin yüzünü güldürüyoruz.",
    mediaType: "VIDEO",
    timestamp: new Date().toISOString(),
  },
  {
    id: "4",
    mediaUrl: "https://picsum.photos/seed/mizan4/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Su kuyusu projelerimizle hayat veriyoruz.",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
  },
  {
    id: "5",
    mediaUrl: "https://picsum.photos/seed/mizan5/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Birlikte daha güçlüyüz. #MizanDerneği",
    mediaType: "VIDEO",
    timestamp: new Date().toISOString(),
  },
  {
    id: "6",
    mediaUrl: "https://picsum.photos/seed/mizan6/600/600",
    permalink: "https://instagram.com/mizandernegi",
    caption: "Ramazan yardımlarımızla ailelere destek oluyoruz.",
    mediaType: "IMAGE",
    timestamp: new Date().toISOString(),
  },
];

export async function GET() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (accessToken && userId) {
    try {
      const url = `https://graph.instagram.com/v21.0/${userId}/media?fields=id,media_url,permalink,caption,media_type,timestamp&access_token=${accessToken}&limit=6`;
      const res = await fetch(url, { next: { revalidate: 300 } });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ posts: data.data ?? [] });
      }
    } catch {
      // fallback
    }
  }

  return NextResponse.json({ posts: FALLBACK_POSTS });
}
