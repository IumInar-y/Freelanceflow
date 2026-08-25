import 'server-only';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AnalyticsFunnelResponse } from '@/lib/contracts/analytics';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

const DateQuery = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  plan: z.enum(['pro']).optional(),
});

// GET /api/admin/analytics/funnel?from=ISO&to=ISO[&plan=pro]
// Admin- or active-Pro-gated: aggregates upsell funnel metrics by `source`
// for a date range. When `plan=pro` is supplied the upgrade-count + revenue
// branches are restricted to `plan='pro'` rows; view/click counts continue
// to count the full funnel. (Phase 1 surfaces only call with `?plan=pro`.)
export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (user.role !== 'admin') {
    const userPlan = user.email
      ? await prisma.userPlan.findUnique({
          where: { email: user.email },
          select: { plan: true, active: true },
        })
      : null;
    const isActivePro = !!userPlan?.active && userPlan.plan === 'pro';

    if (!isActivePro) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const parsed = DateQuery.safeParse({
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    plan: url.searchParams.get('plan') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: 'Missing or invalid from/to query params' }, { status: 400 });
  }

  const fromDate = new Date(parsed.data.from);
  const toDate = new Date(parsed.data.to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return Response.json({ error: 'Invalid date format' }, { status: 400 });
  }
  if (toDate < fromDate) {
    return Response.json({ error: 'to must be on or after from' }, { status: 400 });
  }

  const isProScope = parsed.data.plan === 'pro';

  type FunnelRow = {
    source: string;
    view_count: bigint;
    click_count: bigint;
    upgrade_count: bigint;
    revenue: number | null;
  };

  const upgradePredicate = isProScope
    ? Prisma.sql`"eventType" = 'upgrade' AND "plan" = 'pro'`
    : Prisma.sql`"eventType" = 'upgrade'`;

  const rows = await prisma.$queryRaw<FunnelRow[]>(Prisma.sql`
    SELECT
      "source",
      SUM(CASE WHEN "eventType" = 'upsell_cta_view' THEN 1 ELSE 0 END)::bigint AS view_count,
      SUM(CASE WHEN "eventType" = 'click' THEN 1 ELSE 0 END)::bigint AS click_count,
      SUM(CASE WHEN ${upgradePredicate} THEN 1 ELSE 0 END)::bigint AS upgrade_count,
      COALESCE(SUM(CASE WHEN ${upgradePredicate} THEN "amountUsd" ELSE 0 END), 0)::float8 AS revenue
    FROM "UpsellEvent"
    WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
    GROUP BY "source"
  `);

  const items = rows.map((r) => {
    const views = Number(r.view_count);
    const clicks = Number(r.click_count);
    const upgrades = Number(r.upgrade_count);
    const revenue = r.revenue ?? 0;
    const conversionRate = views > 0 ? upgrades / views : 0;
    return {
      surface: r.source,
      viewCount: views,
      clickCount: clicks,
      upgradeCount: upgrades,
      conversionRate: conversionRate > 1 ? 1 : conversionRate < 0 ? 0 : conversionRate,
      revenueUsd: revenue,
    };
  });

  const payload = AnalyticsFunnelResponse.parse({
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    items,
  });

  return Response.json(payload);
}
