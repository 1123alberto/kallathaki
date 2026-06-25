import { NextRequest, NextResponse } from 'next/server';
import { deletePushSubscription, pushStoreIsConfigured, upsertPushSubscription } from '@/lib/push-store';
import type { PushProductSnapshot, WebPushSubscriptionJSON } from '@/lib/push-types';

export const runtime = 'nodejs';

function cleanBasketProducts(products: PushProductSnapshot[] = []) {
  return products
    .filter((product) => product?.id && product?.name)
    .slice(0, 80)
    .map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand || '',
      image_url: product.image_url || '',
      updated_at: product.updated_at,
      retailer_prices: (product.retailer_prices || []).map((price) => ({
        retailer: price.retailer,
        price: Number(price.price || 0),
        discount: Number(price.discount || 0),
        discount_percentage: Number(price.discount_percentage || 0),
        is_discount: Boolean(price.is_discount),
        last_updated: price.last_updated
      }))
    }));
}

export async function POST(req: NextRequest) {
  try {
    if (!pushStoreIsConfigured()) {
      return NextResponse.json(
        { error: 'Push subscription storage is not configured. Add Vercel KV or Upstash Redis REST env vars.' },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      subscription?: WebPushSubscriptionJSON;
      basketProducts?: PushProductSnapshot[];
    };

    if (!body.subscription?.endpoint || !body.subscription.keys?.auth || !body.subscription.keys?.p256dh) {
      return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
    }

    const stored = await upsertPushSubscription({
      endpoint: body.subscription.endpoint,
      subscription: body.subscription,
      basketProducts: cleanBasketProducts(body.basketProducts || [])
    });

    return NextResponse.json({ ok: true, id: stored.id });
  } catch (error) {
    console.error('[Push subscribe failed]', error);
    return NextResponse.json({ error: 'Could not save push subscription.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!pushStoreIsConfigured()) {
      return NextResponse.json({ ok: true, warning: 'Push subscription storage is not configured.' });
    }

    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 });

    await deletePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Push unsubscribe failed]', error);
    return NextResponse.json({ error: 'Could not remove push subscription.' }, { status: 500 });
  }
}
