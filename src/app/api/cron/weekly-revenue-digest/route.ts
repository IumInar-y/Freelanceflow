import 'server-only';

import { Prisma } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/send';
import { type WeekdayRow, weeklyRevenueDigestEmail } from '@/lib/email/weekly-revenue-digest';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// POST /api/cron/weekly-revenue-digest — Bearer ${CRON_SECRET}. Sends the weekly digest to every
// active Pro/Solo subscriber. Ad-hoc entry point; the scheduled path runs the .js cron script.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = env.NEXT_PUBLIC_APP_URL;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  type WeekdayRaw = { weekday: number | bigint; revenue: number | null };
  const weekdayRaw = await prisma.$queryRaw<WeekdayRaw[]>(Prisma.sql`
    SELECT EXTRACT(dow FROM "createdAt")::int AS weekday,
           COALESCE(SUM("amountUsd"), 0)::float8 AS revenue
    FROM "UpsellEvent"
    WHERE "eventType" = 'upgrade'
      AND "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `);
  const weekdayBreakdown: WeekdayRow[] = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const row = weekdayRaw.find((r) => Number(r.weekday) === d);
    return { weekday: d, revenueUsd: Number(row?.revenue ?? 0) };
  });

  const newMrrUsd = weekdayBreakdown.reduce((sum, row) => sum + row.revenueUsd, 0);

  const totalActiveSubscribers = await prisma.userPlan.count({
    where: { plan: { in: ['pro', 'solo'] }, active: true },
  });

  type TopSourceRaw = { source: string | null; revenue: number | null };
  const topRows = await prisma.$queryRaw<TopSourceRaw[]>(Prisma.sql`
    SELECT "source",
           COALESCE(SUM(CASE WHEN "eventType" = 'upgrade' THEN "amountUsd" ELSE 0 END), 0)::float8 AS revenue
    FROM "UpsellEvent"
    WHERE "createdAt" >= ${since}
    GROUP BY "source"
    ORDER BY revenue DESC
    LIMIT 1
  `);
  const topSurface = topRows[0]?.source ?? 'n/a';

  const note =
    process.env.WEEKLY_REVENUE_NOTE ||
    'A short operator-authored note about this week — set WEEKLY_REVENUE_NOTE.';

  const emailContent = weeklyRevenueDigestEmail({
    newMrrUsd,
    totalActiveSubscribers,
    topSurface,
    weekdayBreakdown,
    note,
    siteUrl,
  });

  const recipients = await prisma.userPlan.findMany({
    where: { plan: { in: ['pro', 'solo'] }, active: true },
    select: { email: true },
  });

  let sent = 0;
  let errors = 0;
  for (const { email } of recipients) {
    try {
      await sendEmail({ to: email, ...emailContent });
      sent += 1;
    } catch {
      errors += 1;
    }
  }

  return NextResponse.json({
    sent,
    errors,
    newMrrUsd,
    totalActiveSubscribers,
    topSurface,
  });
}
