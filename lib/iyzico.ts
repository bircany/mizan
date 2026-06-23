const IYZICO_BASE_URL = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com'

interface CardDetails {
  cardHolderName: string
  cardNumber: string
  expireMonth: string
  expireYear: string
  cvc: string
  registerCard?: string
}

interface BuyerInfo {
  id: string
  name: string
  surname: string
  gsmNumber: string
  email: string
  identityNumber: string
  registrationAddress: string
  city: string
  country: string
  ip: string
}

function getApiKey(): { apiKey: string; secretKey: string } {
  return {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
  }
}

async function iyzicoApiCall(endpoint: string, payload: Record<string, unknown>) {
  const { apiKey, secretKey } = getApiKey()

  const res = await fetch(`${IYZICO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`iyzico API error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function createPayment(
  amount: number,
  currency: string,
  cardDetails: CardDetails,
  buyerInfo: BuyerInfo
) {
  const request = {
    locale: 'tr',
    conversationId: `conv_${Date.now()}`,
    price: amount.toString(),
    paidPrice: amount.toString(),
    currency: currency === 'TRY' ? 'TRY' : 'USD',
    installment: '1',
    basketId: `basket_${Date.now()}`,
    paymentChannel: 'WEB',
    paymentGroup: 'PRODUCT',
    paymentCard: {
      cardHolderName: cardDetails.cardHolderName,
      cardNumber: cardDetails.cardNumber,
      expireMonth: cardDetails.expireMonth,
      expireYear: cardDetails.expireYear,
      cvc: cardDetails.cvc,
      registerCard: cardDetails.registerCard || '0',
    },
    buyer: {
      id: buyerInfo.id,
      name: buyerInfo.name,
      surname: buyerInfo.surname,
      gsmNumber: buyerInfo.gsmNumber,
      email: buyerInfo.email,
      identityNumber: buyerInfo.identityNumber,
      registrationAddress: buyerInfo.registrationAddress,
      city: buyerInfo.city,
      country: buyerInfo.country,
      ip: buyerInfo.ip,
    },
    shippingAddress: {
      contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
      city: buyerInfo.city,
      country: buyerInfo.country,
      address: buyerInfo.registrationAddress,
    },
    billingAddress: {
      contactName: `${buyerInfo.name} ${buyerInfo.surname}`,
      city: buyerInfo.city,
      country: buyerInfo.country,
      address: buyerInfo.registrationAddress,
    },
    basketItems: [
      {
        id: 'donation',
        name: 'Bağış',
        category1: 'Donation',
        itemType: 'VIRTUAL',
        price: amount.toString(),
      },
    ],
  }

  return iyzicoApiCall('/payment/iyzipos/checkoutform/initialize/auth/ecom', request)
}

export async function createCheckoutForm(amount: number, currency: string, _userId: string) {
  const request = {
    locale: 'tr',
    conversationId: `conv_${Date.now()}`,
    price: amount.toString(),
    paidPrice: amount.toString(),
    currency: currency === 'TRY' ? 'TRY' : 'USD',
    installment: '1',
    basketId: `basket_${Date.now()}`,
    paymentChannel: 'WEB',
    paymentGroup: 'PRODUCT',
    callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/odeme/sonuc`,
    buyer: {
      id: _userId,
      name: '',
      surname: '',
      gsmNumber: '',
      email: '',
      identityNumber: '',
      registrationAddress: '',
      city: '',
      country: 'Turkey',
      ip: '',
    },
    shippingAddress: {
      contactName: '',
      city: '',
      country: 'Turkey',
      address: '',
    },
    billingAddress: {
      contactName: '',
      city: '',
      country: 'Turkey',
      address: '',
    },
    basketItems: [
      {
        id: 'donation',
        name: 'Bağış',
        category1: 'Donation',
        itemType: 'VIRTUAL',
        price: amount.toString(),
      },
    ],
  }

  return iyzicoApiCall('/payment/iyzipos/checkoutform/initialize/auth/ecom', request)
}

export async function createSubscription(
  _amount: number,
  _currency: string,
  _cardDetails: CardDetails
) {
  throw new Error('Subscription API not yet implemented via direct REST. Use iyzico panel.')
}
