import 'server-only';
import { StripeStatusResponse } from '@/lib/contracts/stripe-status';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

const REQUIRED_KEYS = ['STRIPE_PRICE_ID_PRO', 'STRIPE_PRICE_ID_SOLO'] as const;

export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const keys = REQUIRED_KEYS.map((name) => ({
    name,
    present: typeof env[name] === 'string' && env[name].length > 0,
  }));
  const ready = keys.every((k) => k.present);

  const cursor = await prisma.stripeBillingCursor.findUnique({ where: { id: 1 } });
  const lastSyncAt = cursor ? cursor.updatedAt.toISOString() : null;

  const payload = StripeStatusResponse.parse({ keys, ready, lastSyncAt });
  return Response.json(payload);
}
