"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

export function PaymentResultCartCleanup({ status }: { status: string }) {
  const { clearCart } = useCart();
  useEffect(() => { if (status === "paid") clearCart(); }, [clearCart, status]);
  return null;
}
