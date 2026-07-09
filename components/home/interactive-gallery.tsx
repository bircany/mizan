"use client";

import { useState, useCallback } from "react";

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

  const handleHover = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  if (!tabs.length) return null;

  return (
    <section className="relative w-full h-[650px] md:h-[700px] bg-surface-container-high">
      {tabs.map((tab) => (
        <img
          key={tab.id}
          src={tab.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[400ms] ease-in-out"
          style={{ opacity: tab.id === activeId ? 1 : 0 }}
        />
      ))}

      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            onMouseEnter={() => handleHover(tab.id)}
            className="flex-1 cursor-pointer"
          />
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 flex h-[72px] pointer-events-none">
        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            className={`relative flex-1 flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
              activeId === tab.id
                ? "bg-[rgba(120,100,80,.75)] text-white"
                : "text-white"
            } ${i < tabs.length - 1 ? "border-r border-white/20" : ""}`}
          >
            {tab.label}
          </div>
        ))}
      </div>
    </section>
  );
}
