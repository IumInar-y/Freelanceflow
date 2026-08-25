import 'server-only';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  await prisma.userPlan.updateMany({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    data: { hasSeenProTour: true },
  });

  return Response.json({ ok: true, hasSeenProTour: true });
}
