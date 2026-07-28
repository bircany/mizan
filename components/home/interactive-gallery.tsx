"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

interface GalleryTab {
  id: string;
  label: string;
  image: string;
}

interface InteractiveGalleryProps {
  tabs: GalleryTab[];
}

export default function InteractiveGallery({ tabs }: InteractiveGalleryProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const tabsRef = useRef(tabs);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const handleHover = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveId((currentId) => {
        const currentTabs = tabsRef.current;
        const currentIndex = currentTabs.findIndex((tab) => tab.id === currentId);
        return currentTabs[(currentIndex + 1) % currentTabs.length]?.id || currentTabs[0]?.id || "";
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!tabs.length) return null;

  return (
    <section className="relative h-[230px] w-full overflow-hidden bg-[#173525] sm:h-[420px] lg:h-[560px]">
      {tabs.map((tab) => (
        <Image
          key={tab.id}
          src={tab.image}
          alt={tab.id === activeId ? tab.label : ""}
          fill
          sizes="100vw"
          className="object-contain transition-opacity duration-[400ms] ease-in-out"
          style={{ opacity: tab.id === activeId ? 1 : 0 }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/10" />

      <div className="absolute inset-x-0 top-0 grid grid-cols-4 border-b border-white/15 bg-[#173525]/45 backdrop-blur-[2px]">
        {tabs.map((tab) => (
          <button
            aria-pressed={activeId === tab.id}
            key={tab.id}
            onClick={() => handleHover(tab.id)}
            onFocus={() => handleHover(tab.id)}
            onMouseEnter={() => handleHover(tab.id)}
            className={`min-h-14 border-r border-white/10 px-2 text-center text-[11px] font-bold leading-tight text-white transition-colors last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white sm:min-h-[72px] sm:px-4 sm:text-sm ${
              activeId === tab.id ? "bg-white/20" : "hover:bg-white/10"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </section>
  );
}
