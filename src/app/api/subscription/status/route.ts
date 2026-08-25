import 'server-only';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Prefer the session user's email — authenticated callers get the authoritative check.
  const sessionUser = await getSessionUser();
  const email = sessionUser?.email ?? new URL(req.url).searchParams.get('email');

  if (!email) {
    return Response.json({ isPro: false, plan: null });
  }

  // 2. Check local DB — this is the source of truth; written by /api/subscription/activate
  //    after a payment is verified. The Polsia subscription-status proxy is not reliable
  //    for Connect-routed subscriptions, so we persist state ourselves.
  const plan = await prisma.userPlan.findUnique({
    where: { email },
    select: { plan: true, active: true, userId: true },
  });

  if (plan?.active) {
    // Back-fill userId on the plan row if the user is now signed in and it was missing.
    if (sessionUser?.id && !plan.userId) {
      await prisma.userPlan.update({
        where: { email },
        data: { userId: sessionUser.id },
      });
    }
    return Response.json({ isPro: true, plan: plan.plan });
  }

  return Response.json({ isPro: false, plan: null });
}
