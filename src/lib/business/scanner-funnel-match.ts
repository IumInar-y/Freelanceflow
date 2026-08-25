import type { SurfaceFunnelRow } from '@/lib/contracts/analytics';
import type { ProTip, UpgradeEligibility, UpgradeNudge } from '@/lib/contracts/scanner-tip';

const SURFACE_LABEL: Record<string, string> = {
  scanner_results: 'Proposal Scanner results',
  scanner_gate: 'Proposal Scanner email gate',
  rewrite_section: 'Proposal Rewrite section',
  billing_pricing: 'Pricing page',
  dashboard_cta: 'Dashboard upgrade CTA',
};

const UPGRADE_NUDGE_CTA_HREF = '/#pricing';

export type UserPlanValue = 'pro' | 'solo' | 'free' | null;

export interface ResolveProTipInput {
  scannerSource: string | null;
  funnelItems: SurfaceFunnelRow[];
  userPlan: UserPlanValue;
}

export function resolveProTip(input: ResolveProTipInput): ProTip | null {
  const { scannerSource, funnelItems, userPlan } = input;

  if (userPlan !== 'pro') return null;
  if (!scannerSource) return null;
  if (funnelItems.length === 0) return null;

  const matched = funnelItems
    .filter((row) => row.surface === scannerSource && row.viewCount > 0)
    .slice()
    .sort((a, b) => {
      if (a.conversionRate !== b.conversionRate) {
        return b.conversionRate - a.conversionRate;
      }
      if (a.upgradeCount !== b.upgradeCount) {
        return b.upgradeCount - a.upgradeCount;
      }
      return b.revenueUsd - a.revenueUsd;
    });

  if (matched.length === 0) return null;

  const top = matched[0];
  if (!top) return null;

  const pct = (top.conversionRate * 100).toFixed(1);
  const label = SURFACE_LABEL[top.surface] ?? humanizeSurface(top.surface);

  return {
    label,
    body: `Users who see this surface convert to Pro ${pct}% of the time — your current top-converting spot.`,
    source: top.surface,
    conversionRate: top.conversionRate,
  };
}

// Sibling helper to resolveProTip; never accepts or returns a numeric — the bundle for free is { copy, ctaHref } only.
export type GetUpgradeNudgeInput =
  | {
      scannerSource: string | null;
      funnelItems: SurfaceFunnelRow[];
      userPlan: UserPlanValue;
    }
  | {
      scannerSource: string | null;
      eligibility: UpgradeEligibility;
      userPlan: UserPlanValue;
    };

export function getUpgradeNudge(input: GetUpgradeNudgeInput): UpgradeNudge | null {
  const { scannerSource, userPlan } = input;

  if (userPlan !== 'free') return null;
  if (!scannerSource) return null;

  const funnelItems: SurfaceFunnelRow[] =
    'funnelItems' in input
      ? input.funnelItems
      : input.eligibility.map((row) => ({
          surface: row.surface,
          viewCount: row.hasUpgradeSample ? 1 : 0,
          clickCount: 0,
          upgradeCount: 0,
          conversionRate: 0,
          revenueUsd: 0,
        }));

  if (funnelItems.length === 0) return null;

  const matched = funnelItems
    .filter((row) => row.surface === scannerSource && row.viewCount > 0)
    .slice()
    .sort((a, b) => {
      if (a.conversionRate !== b.conversionRate) {
        return b.conversionRate - a.conversionRate;
      }
      if (a.upgradeCount !== b.upgradeCount) {
        return b.upgradeCount - a.upgradeCount;
      }
      return b.revenueUsd - a.revenueUsd;
    });

  if (matched.length === 0) return null;

  const label = SURFACE_LABEL[scannerSource] ?? humanizeSurface(scannerSource);

  return {
    copy: `Users on the ${label} convert well above average — unlock Pro for the full funnel insight.`,
    ctaHref: UPGRADE_NUDGE_CTA_HREF,
  };
}

export type ProTipVariant = 'strong' | 'standard' | 'gentle';

export function pickProTipCopy(
  scannerSource: string | null,
  funnelItems: SurfaceFunnelRow[],
): ProTipVariant {
  if (!scannerSource) return 'standard';
  if (funnelItems.length === 0) return 'standard';

  const sampled = funnelItems.filter((row) => (row?.viewCount ?? 0) > 0);
  if (sampled.length === 0) return 'standard';

  const rates = sampled
    .map((row) => row?.conversionRate ?? 0)
    .slice()
    .sort((a, b) => a - b);
  const mid = rates.length / 2;
  // Even length → average the two middles; the choice is load-bearing for "tie" semantics.
  const median =
    rates.length % 2 === 1
      ? (rates[Math.floor(mid)] ?? 0)
      : ((rates[mid - 1] ?? 0) + (rates[mid] ?? 0)) / 2;

  const matched = sampled.find((row) => row.surface === scannerSource);
  if (!matched) return 'standard';

  const rate = matched.conversionRate ?? 0;
  if (Math.abs(rate - median) < 1e-9) return 'standard';
  if (rate > median) return 'strong';
  return 'gentle';
}

function humanizeSurface(surface: string): string {
  return surface
    .split('_')
    .map((part) => (part.length === 0 ? part : part[0]?.toUpperCase() + part.slice(1)))
    .join(' ');
}
