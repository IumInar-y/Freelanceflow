import 'server-only';
import { Prisma } from '@prisma/client';
import { UpgradeEligibilitySchema } from '@/lib/contracts/scanner-tip';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Static catalog — mirrors the keys in SURFACE_LABEL (lib/business/scanner-funnel-match.ts).
// Only surfaces here can appear on the wire; unknown source values are dropped
// at the SQL boundary.
const KNOWN_SURFACES = [
  'scanner_results',
  'scanner_gate',
  'rewrite_section',
  'billing_pricing',
  'dashboard_cta',
] as const;

// GET /api/scanner/upgrade-eligibility
// Public — no auth, no PII, no numerics cross the wire. Returns just enough
// to let the free-user client drive the cached `getUpgradeNudge` gate
// (`surface` × `hasUpgradeSample`).
export async function GET() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  type AggregateRow = {
    source: string;
    upgrade_count: bigint;
  };

  const rows = await prisma.$queryRaw<AggregateRow[]>(Prisma.sql`
    SELECT "source", COUNT(*)::bigint AS upgrade_count
    FROM "UpsellEvent"
    WHERE "eventType" = 'upgrade'
      AND "source" IN (${Prisma.join(KNOWN_SURFACES)})
      AND "createdAt" >= ${since}
    GROUP BY "source"
  `);

  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.source, Number(r.upgrade_count));
  }

  const payload = KNOWN_SURFACES.map((surface) => ({
    surface,
    hasUpgradeSample: (counts.get(surface) ?? 0) > 0,
  }));

  return Response.json(UpgradeEligibilitySchema.parse(payload), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
