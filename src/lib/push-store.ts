import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { StoredPushSubscription } from './push-types';

const STORE_KEY = 'kallathaki:push-subscriptions';
const LOCAL_STORE_PATH = path.join(process.cwd(), '.push-subscriptions.json');

function subscriptionId(endpoint: string) {
  return createHash('sha256').update(endpoint).digest('hex').slice(0, 24);
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function pushStoreIsConfigured() {
  return Boolean(redisConfig()) || process.env.VERCEL !== '1';
}

async function redisCommand<T>(command: unknown[]): Promise<T | null> {
  const config = redisConfig();
  if (!config) return null;

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    cache: 'no-store'
  });

  if (!response.ok) {
    console.error('[Push store Redis failed]', {
      status: response.status,
      statusText: response.statusText,
      command: command[0]
    });
    return null;
  }

  const data = await response.json();
  return data.result ?? null;
}

async function readLocalStore(): Promise<StoredPushSubscription[]> {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    return JSON.parse(raw) as StoredPushSubscription[];
  } catch {
    return [];
  }
}

async function writeLocalStore(subscriptions: StoredPushSubscription[]) {
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(subscriptions, null, 2), 'utf8');
}

export async function readPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const fromRedis = await redisCommand<string>(['GET', STORE_KEY]);
  if (typeof fromRedis === 'string') {
    try {
      return JSON.parse(fromRedis) as StoredPushSubscription[];
    } catch (error) {
      console.error('[Push store parse failed]', error);
    }
  }

  return readLocalStore();
}

export async function writePushSubscriptions(subscriptions: StoredPushSubscription[]) {
  const serialized = JSON.stringify(subscriptions);
  const wroteRedis = await redisCommand<string>(['SET', STORE_KEY, serialized]);
  if (wroteRedis) return;

  await writeLocalStore(subscriptions);
}

export async function upsertPushSubscription(
  entry: Omit<StoredPushSubscription, 'id' | 'endpoint' | 'createdAt' | 'updatedAt'> & { endpoint: string }
) {
  const now = new Date().toISOString();
  const subscriptions = await readPushSubscriptions();
  const id = subscriptionId(entry.endpoint);
  const existing = subscriptions.find((subscription) => subscription.id === id);

  const next: StoredPushSubscription = {
    ...existing,
    ...entry,
    id,
    endpoint: entry.endpoint,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const withoutCurrent = subscriptions.filter((subscription) => subscription.id !== id);
  await writePushSubscriptions([...withoutCurrent, next]);
  return next;
}

export async function deletePushSubscription(endpoint: string) {
  const id = subscriptionId(endpoint);
  const subscriptions = await readPushSubscriptions();
  const next = subscriptions.filter((subscription) => subscription.id !== id);
  await writePushSubscriptions(next);
}
