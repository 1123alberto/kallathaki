export type PushRetailerPrice = {
  retailer: string;
  price: number;
  discount?: number | null;
  discount_percentage?: number | null;
  is_discount?: boolean;
  last_updated?: string;
};

export type PushProductSnapshot = {
  id: string;
  name: string;
  brand?: string;
  image_url?: string;
  retailer_prices: PushRetailerPrice[];
  updated_at?: string;
};

export type WebPushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  subscription: WebPushSubscriptionJSON;
  basketProducts: PushProductSnapshot[];
  lastAlertKey?: string;
  createdAt: string;
  updatedAt: string;
};
