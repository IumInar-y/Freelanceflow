import 'server-only';
import { GrantProRequest, GrantProResponse } from '@/lib/contracts/grant-pro';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/grant-pro
// Admin-only. Bypasses Stripe and writes directly to the UserPlan row.
// `grant` flips the row to plan='pro' / active=true; `revoke` flips it to
// plan='free' / active=false. /api/subscription/status branches on
// plan?.active, so setting active=false is what makes the next status read
// return isPro:false.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = GrantProRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const m = messages?.[0];
      if (m) fieldErrors[field] = m;
    }
    return Response.json({ errors: fieldErrors }, { status: 400 });
  }

  const { action, email, expiresAt } = parsed.data;
  const now = new Date();
  const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

  const upserted =
    action === 'grant'
      ? await prisma.userPlan.upsert({
          where: { email },
          create: {
            email,
            plan: 'pro',
            source: 'admin_grant',
            verifiedAt: now,
            active: true,
            expiresAt: expiresAtDate,
          },
          update: {
            plan: 'pro',
            source: 'admin_grant',
            verifiedAt: now,
            active: true,
            expiresAt: expiresAtDate,
          },
        })
      : await prisma.userPlan.upsert({
          where: { email },
          create: {
            email,
            plan: 'free',
            source: 'admin_grant',
            verifiedAt: now,
            active: false,
          },
          update: {
            plan: 'free',
            source: 'admin_grant',
            verifiedAt: now,
            active: false,
          },
        });

  const payload = GrantProResponse.parse({
    ok: true,
    action,
    email: upserted.email,
    plan: upserted.plan,
    active: upserted.active,
    expiresAt: upserted.expiresAt ? upserted.expiresAt.toISOString() : null,
    updatedAt: upserted.updatedAt.toISOString(),
  });

  return Response.json(payload);
}
