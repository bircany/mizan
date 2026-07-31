import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatIstanbulDate } from "@/lib/time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return formatIstanbulDate(date);
}
