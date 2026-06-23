"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getExchangeRates } from "@/lib/exchange-rates";

type Currency = "TRY" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amountInTry: number) => string;
  rates: { usdTry: number; eurTry: number };
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("TRY");
  const [rates, setRates] = useState({ usdTry: 32.5, eurTry: 35.0 }); // reasonable fallbacks

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mizan-currency") as Currency | null;
      if (stored && ["TRY", "USD", "EUR"].includes(stored)) {
        setCurrencyState(stored);
      }
    } catch {}

    const fetchRates = async () => {
      try {
        const data = await getExchangeRates();
        if (data.usdTry > 0) {
          setRates({ usdTry: data.usdTry, eurTry: data.eurTry });
        }
      } catch (err) {
        console.error("Failed to fetch rates:", err);
      }
    };
    fetchRates();
  }, []);

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem("mizan-currency", newCurrency);
    } catch {}
  }, []);

  const formatPrice = useCallback(
    (amountInTry: number) => {
      let finalAmount = amountInTry;
      let currencyCode = "TRY";
      let locale = "tr-TR";

      if (currency === "USD") {
        finalAmount = amountInTry / rates.usdTry;
        currencyCode = "USD";
        locale = "en-US";
      } else if (currency === "EUR") {
        finalAmount = amountInTry / rates.eurTry;
        currencyCode = "EUR";
        locale = "de-DE";
      }

      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(finalAmount);
    },
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
