import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { deletePushSubscription, readPushSubscriptions, writePushSubscriptions } from '@/lib/push-store';
import { currentBasketSaleProducts, saleAlertBody, saleAlertKey } from '@/lib/sale-alerts';

export const runtime = 'nodejs';

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:alerts@kallathaki.gr';

  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

function requestIsAllowed(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function checkSaleAlerts(req: NextRequest) {
  if (!requestIsAllowed(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!configureWebPush()) {
    return NextResponse.json({ error: 'Push notifications are not configured.' }, { status: 503 });
  }

  const subscriptions = await readPushSubscriptions();
  const nextSubscriptions = [...subscriptions];
  let sent = 0;
  let skipped = 0;
  let removed = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const saleProducts = currentBasketSaleProducts(subscription);
    if (saleProducts.length === 0) {
      skipped += 1;
      continue;
    }

    const nextAlertKey = saleAlertKey(saleProducts);
    if (nextAlertKey === subscription.lastAlertKey) {
      skipped += 1;
      continue;
    }

    try {
      await webpush.sendNotification(
        subscription.subscription,
        JSON.stringify({
          title: 'Προσφορές στο καλάθι σας',
          body: saleAlertBody(saleProducts),
          url: '/#basket'
        })
      );

      sent += 1;
      const stored = nextSubscriptions.find((item) => item.id === subscription.id);
      if (stored) {
        stored.lastAlertKey = nextAlertKey;
        stored.updatedAt = new Date().toISOString();
      }
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await deletePushSubscription(subscription.endpoint);
        const index = nextSubscriptions.findIndex((item) => item.id === subscription.id);
        if (index >= 0) nextSubscriptions.splice(index, 1);
        removed += 1;
      } else {
        failed += 1;
        console.error('[Push alert send failed]', {
          subscriptionId: subscription.id,
          statusCode,
          error
        });
      }
    }
  }

  await writePushSubscriptions(nextSubscriptions);
  return NextResponse.json({ ok: true, checked: subscriptions.length, sent, skipped, removed, failed });
}

export async function GET(req: NextRequest) {
  return checkSaleAlerts(req);
}

export async function POST(req: NextRequest) {
  return checkSaleAlerts(req);
}
