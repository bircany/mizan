"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface VideoSlide {
  id: string;
  thumbnail: string;
  title: string;
  url: string;
}

interface VideoCarouselProps {
  slides: VideoSlide[];
}

export default function VideoCarousel({ slides }: VideoCarouselProps) {
  const [active, setActive] = useState(0);
  const total = slides.length;

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % total);
  }, [total]);

  if (!slides.length) return null;

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-container-max mx-auto px-margin-desktop">
        <div className="relative overflow-hidden rounded-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative aspect-video bg-surface-container-high"
            >
              <Image
                src={slides[active].thumbnail}
                alt={slides[active].title}
                fill
                sizes="100vw"
                className="object-cover"
              />
              <a
                href={slides[active].url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
              >
                <span className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <span className="material-symbols-outlined text-[40px] text-primary">
                    play_arrow
                  </span>
                </span>
              </a>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white hover:scale-105 transition-all duration-200 z-10"
            aria-label="Previous video"
          >
            <span className="material-symbols-outlined text-on-surface">chevron_left</span>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white hover:scale-105 transition-all duration-200 z-10"
            aria-label="Next video"
          >
            <span className="material-symbols-outlined text-on-surface">chevron_right</span>
          </button>
        </div>

        <div className="flex justify-center gap-3 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-500 ${
                i === active
                  ? "bg-primary w-10 h-2.5"
                  : "bg-outline-variant/30 w-2.5 h-2.5 hover:bg-outline-variant/60"
              }`}
              aria-label={`Video ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
