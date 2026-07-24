"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remaining(target: string): Remaining {
  const distance = Math.max(0, Date.parse(target) - Date.now());
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance % 86_400_000) / 3_600_000),
    minutes: Math.floor((distance % 3_600_000) / 60_000),
    seconds: Math.floor((distance % 60_000) / 1_000),
  };
}

export function QurbaniCountdown({ target, labels }: { target: string; labels: [string, string, string, string] }) {
  const [value, setValue] = useState<Remaining>(() => remaining(target));

  useEffect(() => {
    const update = () => setValue(remaining(target));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div aria-label="Kurban Bayramı geri sayımı" className="grid grid-cols-4 gap-2" role="timer">
      {([value.days, value.hours, value.minutes, value.seconds] as const).map((item, index) => (
        <div className="min-w-16 rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-center backdrop-blur" key={labels[index]}>
          <strong className="block text-2xl tabular-nums text-white">{String(item).padStart(2, "0")}</strong>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}
