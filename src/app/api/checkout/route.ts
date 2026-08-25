import 'server-only';
import { NextResponse } from 'next/server';
import { CheckoutSessionResponseSchema } from '@/lib/contracts/checkout';
import { env } from '@/lib/env';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const body = await req.json().catch(() => ({}));
  const plan = typeof body?.plan === 'string' ? body.plan : 'pro';

  const priceId =
    plan === 'solo'
      ? (process.env.STRIPE_PRICE_ID_SOLO ?? '')
      : (process.env.STRIPE_PRICE_ID_PRO ?? '');

  if (!priceId) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const returnUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;

  const polsiaKey = env.POLSIA_API_KEY ?? env.POLSIA_API_TOKEN;
  if (!polsiaKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const amount = plan === 'solo' ? 29 : 59;
  const name = plan === 'solo' ? 'Solo Plan' : 'Pro Plan';

  let result: { url?: string };
  try {
    const res = await fetch(`${env.POLSIA_API_BASE_URL}/api/company-payments/create-payment-link`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${polsiaKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        price_id: priceId,
        customer_email: user.email,
        return_url: returnUrl,
        name,
        amount,
      }),
      cache: 'no-store',
    });
    result = (await res.json().catch(() => ({}))) as { url?: string };
  } catch {
    return NextResponse.json({ error: 'checkout_creation_failed' }, { status: 500 });
  }

  if (!result?.url) {
    return NextResponse.json({ error: 'checkout_creation_failed' }, { status: 500 });
  }

  return NextResponse.json(CheckoutSessionResponseSchema.parse({ url: result.url }));
}
