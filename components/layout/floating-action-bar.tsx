"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { SUPPORT_PHONE_E164, SUPPORT_WHATSAPP_URL } from "@/lib/contact";

const actionButtons = [
  { key: "phone", href: `tel:${SUPPORT_PHONE_E164}`, color: "bg-gold", icon: "phone", label: "Ara", delay: 0.16 },
  {
    key: "whatsapp",
    href: SUPPORT_WHATSAPP_URL,
    color: "bg-gold",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M12 2C6.49 2 2 6.14 2 11.24c0 1.83.58 3.53 1.58 4.97L2 22l6.04-1.5c1.34.68 2.85 1.04 4.44 1.04 5.51 0 10-4.14 10-9.24S17.51 2 12 2Z"
          fill="#25D366"
        />
        <path
          fill="#fff"
          d="M17.53 13.44c-.29-.15-1.72-.85-2-.95-.29-.1-.49-.15-.7.15-.21.29-.81.95-1 .95-.18.2-.36.21-.67.08-.29-.14-1.24-.46-2.36-1.47-.86-.78-1.45-1.73-1.62-2.02-.17-.29-.02-.45.12-.6.12-.13.29-.34.44-.51.15-.18.2-.29.29-.48.1-.2.05-.36-.02-.5-.07-.15-.66-1.61-.9-2.2-.24-.56-.49-.49-.68-.5h-.58c-.2 0-.5.07-.76.36-.27.29-1.03 1.03-1.03 2.52s1.05 2.92 1.2 3.12c.14.2 2.08 3.18 5.03 4.46.7.31 1.25.49 1.67.62.7.22 1.35.2 1.86.11.57-.09 1.72-.7 1.96-1.39.24-.68.24-1.26.16-1.39-.09-.13-.28-.2-.58-.35Z"
        />
      </svg>
    ),
    label: "WhatsApp",
    external: true,
    delay: 0.08,
  },
  { key: "location", href: "/iletisim", color: "bg-gold", icon: "location_on", label: "Location", delay: 0 },
];

const variants = {
  open: (delay: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 24,
        mass: 0.8,
        delay,
      },
  }),
  closed: (delay: number) => ({
    y: 70,
    opacity: 0,
    scale: 0.9,
    rotate: 25,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 26,
        delay,
      },
  }),
};

export default function FloatingActionBar() {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
      className="fixed left-4 bottom-8 z-[90] hidden lg:flex flex-col items-center gap-4"
    >
      <div className="flex flex-col items-center gap-4">
        {actionButtons.map((btn) => (
          <motion.a
            key={btn.key}
            layout
            custom={btn.delay}
            variants={variants}
            animate={expanded ? "open" : "closed"}
            initial="open"
            href={btn.href}
            target={btn.external ? "_blank" : undefined}
            rel={btn.external ? "noopener noreferrer" : undefined}
            className={`${btn.color} w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl transition-all duration-250 ease-out`}
            aria-label={btn.label}
          >
            {typeof btn.icon === "string" ? (
              <span className="material-symbols-outlined text-[24px]">{btn.icon}</span>
            ) : (
              btn.icon
            )}
          </motion.a>
        ))}
      </div>

      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-14 h-14 rounded-full bg-on-background text-white flex items-center justify-center shadow-lg hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl transition-all duration-250 ease-out shrink-0"
        aria-label={expanded ? "Collapse actions" : "Expand actions"}
      >
        <motion.span
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="material-symbols-outlined text-[24px]"
        >
          expand_more
        </motion.span>
      </button>
    </motion.div>
  );
}
