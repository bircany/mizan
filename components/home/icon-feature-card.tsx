"use client";

import { type ReactNode } from "react";

interface IconFeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  linkLabel?: string;
  linkHref?: string;
  image?: string;
  imageAlt?: string;
}

export default function IconFeatureCard({
  icon,
  title,
  description,
  linkLabel,
  linkHref = "#",
  image,
  imageAlt = "",
}: IconFeatureCardProps) {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1">
      {image && (
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={image}
            alt={imageAlt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
          />
        </div>
      )}
      <div className="p-6 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-gold text-[24px] mt-0.5 shrink-0">
            {icon}
          </span>
          <div>
            <h3 className="text-headline-md text-on-surface mb-2 leading-snug">
              {title}
            </h3>
            <p className="text-base text-on-surface-variant/55 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        {linkLabel && (
          <a
            href={linkHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-3 transition-all duration-300 pt-1"
          >
            {linkLabel}
            <span className="text-base">→</span>
          </a>
        )}
      </div>
    </div>
  );
}
