"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { CartItem } from '@/types'

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (campaignId: string) => void
  updateQuantity: (campaignId: string, quantity: number) => void
  updateTitles: (titles: Record<string, string>) => void
  clearCart: () => void
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'mizan-cart'

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setItems(loadCartFromStorage()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    saveCartToStorage(items)
  }, [items])

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.campaignId === newItem.campaignId)
      if (existing) {
        return prev.map((item) =>
          item.campaignId === newItem.campaignId
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        )
      }
      return [...prev, newItem]
    })
  }, [])

  const removeItem = useCallback((campaignId: string) => {
    setItems((prev) => prev.filter((item) => item.campaignId !== campaignId))
  }, [])

  const updateQuantity = useCallback((campaignId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.campaignId !== campaignId))
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.campaignId === campaignId ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const updateTitles = useCallback((titles: Record<string, string>) => {
    setItems((prev) => prev.map((item) => titles[item.campaignId] ? { ...item, title: titles[item.campaignId] } : item))
  }, [])

  const totalAmount = items.reduce(
    (sum, item) => sum + item.amount * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, updateTitles, clearCart, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
