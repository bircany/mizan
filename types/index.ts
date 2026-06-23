export interface Campaign {
  id: string;
  title_tr: string;
  title_en?: string;
  title_ar?: string;
  description_tr: string;
  description_en?: string;
  description_ar?: string;
  target_amount: number;
  collected_amount: number;
  image_url: string;
  category: string;
  is_active: boolean;
  slug: string;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_name: string;
  email: string;
  phone?: string;
  campaign_id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  receipt_number?: string;
  created_at: string;
}

export interface NewsItem {
  id: string;
  title_tr: string;
  title_en?: string;
  title_ar?: string;
  content_tr: string;
  content_en?: string;
  content_ar?: string;
  image: string;
  category: string;
  published_at: string;
  slug: string;
}

export interface Category {
  id: string;
  name_tr: string;
  name_en?: string;
  name_ar?: string;
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
