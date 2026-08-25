import 'server-only';
import { AdminAnalyticsResponse } from '@/lib/contracts/analytics';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/analytics
// Admin-gated: returns upsell conversion stats + recent events.
export async function GET() {
  const user = await getSessionUser();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totalClicks, totalUpgrades, revenueAgg, recentEvents] = await Promise.all([
    prisma.upsellEvent.count({ where: { eventType: 'click' } }),
    prisma.upsellEvent.count({ where: { eventType: 'upgrade' } }),
    prisma.upsellEvent.aggregate({
      _sum: { amountUsd: true },
      where: { eventType: 'upgrade' },
    }),
    prisma.upsellEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const conversionRate = totalClicks > 0 ? totalUpgrades / totalClicks : 0;
  const totalRevenueUsd = revenueAgg._sum.amountUsd ?? 0;

  const payload = AdminAnalyticsResponse.parse({
    totalClicks,
    totalUpgrades,
    conversionRate,
    totalRevenueUsd,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      source: e.source,
      email: e.email,
      plan: e.plan,
      amountUsd: e.amountUsd,
      createdAt: e.createdAt.toISOString(),
    })),
  });

  return Response.json(payload);
}
