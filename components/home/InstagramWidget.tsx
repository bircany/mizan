"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type InstagramPost = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption: string;
  mediaType: string;
  timestamp: string;
};

export default function InstagramWidget() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/instagram");
        const data = await res.json();
        setPosts(data.posts ?? []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <section className="py-xl">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center justify-between mb-lg">
            <div>
              <div className="h-8 w-48 bg-surface-container-highest rounded animate-pulse mb-2" />
              <div className="h-1.5 w-24 bg-surface-container-highest rounded-full animate-pulse" />
            </div>
            <div className="h-5 w-28 bg-surface-container-highest rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-surface-container-highest rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="py-xl">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center justify-between mb-lg">
          <div>
            <h2 className="text-headline-xl text-primary mb-2">
              Instagram&apos;da Biz
            </h2>
            <div className="h-1.5 w-24 bg-secondary rounded-full" />
          </div>
          <Link
            href="https://instagram.com/mizandernegi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-label-md font-semibold hover:underline flex items-center gap-1"
          >
            @mizandernegi
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-xl overflow-hidden group block bg-surface-container-high"
            >
              <img
                src={post.mediaUrl}
                alt={post.caption?.slice(0, 100) ?? "Instagram post"}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              {post.mediaType === "VIDEO" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="text-primary ml-0.5"
                    >
                      <polygon points="8,5 19,12 8,19" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-[32px]">
                  {post.mediaType === "VIDEO" ? "play_circle" : "open_in_new"}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
