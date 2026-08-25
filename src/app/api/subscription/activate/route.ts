import 'server-only';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { subscriptionConfirmedEmail } from '@/lib/email/subscription-confirmed';
import { env } from '@/lib/env';
import { getSessionUser } from '@/lib/require-auth';
import { verifyCheckoutSession } from '@/lib/stripe-billing/client';

export const dynamic = 'force-dynamic';

// POST /api/subscription/activate
// Called by the billing success page (polling). Verifies the Stripe checkout
// session via the Polsia proxy, then upserts a UserPlan row to persist state.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;

  if (!sessionId) {
    return Response.json({ error: 'Missing sessionId' }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof verifyCheckoutSession>>;
  try {
    result = await verifyCheckoutSession({ sessionId });
  } catch {
    return Response.json({ activated: false, error: 'verification_failed' });
  }

  if (!result.verified || !result.payment?.customer_email) {
    return Response.json({ activated: false });
  }

  const email = result.payment.customer_email;
  const amountUsd = result.payment.amount_usd ?? 0;
  const plan = amountUsd >= 50 ? 'pro' : 'solo';

  const sessionUser = await getSessionUser();

  await prisma.userPlan.upsert({
    where: { email },
    create: {
      email,
      userId: sessionUser?.id ?? null,
      plan,
      stripeSessionId: sessionId,
      active: true,
    },
    update: {
      plan,
      active: true,
      stripeSessionId: sessionId,
      userId: sessionUser?.id ?? undefined,
    },
  });

  await sendEmail({
    to: email,
    ...subscriptionConfirmedEmail(plan, env.NEXT_PUBLIC_APP_URL),
  }).catch(() => {
    // fire-and-forget: email failure must not break the activate response
  });

  await prisma.upsellEvent.create({
    data: {
      eventType: 'upgrade',
      source: 'activate',
      email,
      userId: sessionUser?.id ?? null,
      plan,
      amountUsd,
    },
  });

  return Response.json({ activated: true, plan, email });
}
