"use client";

import { useEffect } from "react";

export function NewsViewTracker({ slug }: { slug: string }) {
  useEffect(() => { void fetch(`/api/news/${encodeURIComponent(slug)}/view`, { method: "POST", keepalive: true }); }, [slug]);
  return null;
}
