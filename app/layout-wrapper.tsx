"use client";

import { LanguageProvider } from "@/lib/language-context";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/lib/currency-context";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <CartProvider>
        <CurrencyProvider>
          <Header />
          <main className="pb-16 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
        </CurrencyProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
