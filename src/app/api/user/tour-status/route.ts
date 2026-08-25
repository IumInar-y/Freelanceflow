import 'server-only';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const plan = await prisma.userPlan.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    select: { userId: true, email: true, hasSeenProTour: true },
  });

  if (plan && !plan.userId && plan.email === user.email) {
    await prisma.userPlan.update({
      where: { email: plan.email },
      data: { userId: user.id },
    });
  }

  return Response.json({ hasSeenProTour: plan?.hasSeenProTour === true });
}
