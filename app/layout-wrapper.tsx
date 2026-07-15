"use client";

import { usePathname } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { LanguageProvider } from "@/lib/language-context";

function isStandaloneRoute(pathname: string) {
  return pathname.startsWith("/panel") || pathname.startsWith("/operasyon") || pathname.startsWith("/admin");
}

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const standalone = isStandaloneRoute(pathname);

  return (
    <LanguageProvider>
      <CartProvider>
        <CurrencyProvider>
          {!standalone ? <Header /> : null}
          <main className={standalone ? "min-h-screen" : "pb-24 md:pb-0"}>{children}</main>
          {!standalone ? <Footer /> : null}
          {!standalone ? <MobileBottomNav /> : null}
        </CurrencyProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
