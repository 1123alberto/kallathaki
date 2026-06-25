import { NextResponse } from 'next/server';
import { pushStoreIsConfigured } from '@/lib/push-store';

export const runtime = 'nodejs';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey || !pushStoreIsConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        message: 'Push notifications need VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and durable subscription storage.'
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ configured: true, publicKey });
}
