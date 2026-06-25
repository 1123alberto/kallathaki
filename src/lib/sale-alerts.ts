import productsFallback from '@/app/api/[...path]/products-fallback.json';
import type { PushProductSnapshot, StoredPushSubscription } from './push-types';

type FallbackProduct = PushProductSnapshot & {
  title?: string;
};

const fallbackProductsById = new Map(
  ((productsFallback.products || []) as FallbackProduct[]).map((product) => [product.id, product])
);

export function productIsOnSale(product: PushProductSnapshot) {
  return (product.retailer_prices || []).some(
    (price) => price.is_discount || Number(price.discount_percentage || 0) > 0 || Number(price.discount || 0) > 0
  );
}

export function currentBasketSaleProducts(subscription: StoredPushSubscription) {
  return subscription.basketProducts
    .map((product) => {
      const current = fallbackProductsById.get(product.id);
      return current
        ? {
            ...product,
            name: current.name || current.title || product.name,
            brand: current.brand || product.brand,
            image_url: current.image_url || product.image_url,
            retailer_prices: current.retailer_prices || product.retailer_prices,
            updated_at: current.updated_at || product.updated_at
          }
        : product;
    })
    .filter(productIsOnSale);
}

export function saleAlertKey(products: PushProductSnapshot[]) {
  return products
    .map((product) => {
      const retailers = product.retailer_prices
        .filter((price) => price.is_discount || Number(price.discount_percentage || 0) > 0 || Number(price.discount || 0) > 0)
        .map((price) => `${price.retailer}:${price.price}:${price.discount_percentage || price.discount || 0}`)
        .sort()
        .join('|');
      return `${product.id}:${retailers}`;
    })
    .sort()
    .join(',');
}

export function saleAlertBody(products: PushProductSnapshot[]) {
  const count = products.length;
  const names = products.slice(0, 2).map((product) => product.name).join(', ');
  if (count === 1) return `${names} έχει προσφορά. Δείτε σε ποιο κατάστημα συμφέρει.`;
  if (count === 2) return `${names} έχουν προσφορά. Ανοίξτε το καλάθι για σύγκριση.`;
  return `${count} προϊόντα του καλαθιού σας έχουν προσφορά. Ανοίξτε το καλάθι για σύγκριση.`;
}
