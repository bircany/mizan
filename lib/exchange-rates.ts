interface ExchangeRates {
  usdTry: number
  eurTry: number
  lastUpdated: string
}

let cachedRates: ExchangeRates | null = null
let lastFetch = 0
const CACHE_DURATION = 30 * 60 * 1000

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now()
  if (cachedRates && now - lastFetch < CACHE_DURATION) {
    return cachedRates
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await res.json()
    const usdTry = data.rates.TRY
    const eurRes = await fetch('https://api.exchangerate-api.com/v4/latest/EUR')
    const eurData = await eurRes.json()
    const eurTry = eurData.rates.TRY

    cachedRates = {
      usdTry: usdTry,
      eurTry: eurTry,
      lastUpdated: new Date().toISOString(),
    }
    lastFetch = now
    return cachedRates
  } catch {
    if (cachedRates) return cachedRates
    return { usdTry: 0, eurTry: 0, lastUpdated: '' }
  }
}
