export interface Campaign {
  id: string;
  title: string;
  targetAmount: number;
  collectedAmount: number;
  currency: string;
  isDonationOpen: boolean;
  slug: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorName: string;
  email: string;
  phone?: string;
  campaign: string;
  grossAmount: number;
  netConfirmedAmount: number;
  currency: string;
  status:
    | "paid"
    | "pending_review"
    | "failed"
    | "cancelled"
    | "partially_refunded"
    | "refunded";
  paymentId: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  image: string;
  category: string;
  publishedAt: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  slug: string;
}

export interface CartItem {
  campaignId: string;
  title: string;
  amount: number;
  quantity: number;
  image?: string;
  isRecurring?: boolean;
}
