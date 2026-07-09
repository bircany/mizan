"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const actionButtons = [
  { key: "phone", href: "tel:+90344XXX", color: "bg-primary", icon: "phone", label: "Call", delay: 0.16 },
  { key: "whatsapp", href: "https://wa.me/90344XXX", color: "bg-primary", icon: "chat", label: "WhatsApp", external: true, delay: 0.08 },
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
            <span className="material-symbols-outlined text-[24px]">{btn.icon}</span>
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
