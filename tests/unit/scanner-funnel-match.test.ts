// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  getUpgradeNudge,
  pickProTipCopy,
  resolveProTip,
} from '@/lib/business/scanner-funnel-match';
import type { SurfaceFunnelRow } from '@/lib/contracts/analytics';
import type { UpgradeEligibility } from '@/lib/contracts/scanner-tip';

const row = (
  overrides: Partial<SurfaceFunnelRow> & Pick<SurfaceFunnelRow, 'surface'>,
): SurfaceFunnelRow => ({
  viewCount: 0,
  clickCount: 0,
  upgradeCount: 0,
  conversionRate: 0,
  revenueUsd: 0,
  ...overrides,
});

describe('resolveProTip', () => {
  it('returns null for free users', () => {
    expect(
      resolveProTip({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'free',
      }),
    ).toBeNull();
  });

  it('returns null for solo users', () => {
    expect(
      resolveProTip({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'solo',
      }),
    ).toBeNull();
  });

  it('returns null when scannerSource is null', () => {
    expect(
      resolveProTip({
        scannerSource: null,
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'pro',
      }),
    ).toBeNull();
  });

  it('returns null when funnelItems is empty', () => {
    expect(
      resolveProTip({ scannerSource: 'scanner_results', funnelItems: [], userPlan: 'pro' }),
    ).toBeNull();
  });

  it('returns null when no row matches the surface', () => {
    expect(
      resolveProTip({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({
            surface: 'billing_pricing',
            viewCount: 100,
            upgradeCount: 5,
            conversionRate: 0.05,
          }),
        ],
        userPlan: 'pro',
      }),
    ).toBeNull();
  });

  it('excludes rows where viewCount is 0 even with upgrades', () => {
    expect(
      resolveProTip({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 0, upgradeCount: 7, conversionRate: 0 }),
        ],
        userPlan: 'pro',
      }),
    ).toBeNull();
  });

  it('picks the exact source match sorted by conversionRate desc', () => {
    const result = resolveProTip({
      scannerSource: 'scanner_results',
      funnelItems: [
        row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 1, conversionRate: 0.1 }),
        row({ surface: 'scanner_results', viewCount: 50, upgradeCount: 10, conversionRate: 0.2 }),
        row({ surface: 'scanner_results', viewCount: 30, upgradeCount: 9, conversionRate: 0.3 }),
      ],
      userPlan: 'pro',
    });
    expect(result).not.toBeNull();
    expect(result?.source).toBe('scanner_results');
    expect(result?.conversionRate).toBeCloseTo(0.3);
    expect(result?.label).toContain('Scanner');
    expect(result?.body).toContain('30.0%');
  });

  it('breaks ties on conversionRate by upgradeCount desc (returns non-null, top by rate)', () => {
    const result = resolveProTip({
      scannerSource: 'scanner_results',
      funnelItems: [
        row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 5, conversionRate: 0.05 }),
        row({ surface: 'scanner_results', viewCount: 80, upgradeCount: 8, conversionRate: 0.1 }),
        row({ surface: 'scanner_results', viewCount: 90, upgradeCount: 9, conversionRate: 0.1 }),
      ],
      userPlan: 'pro',
    });
    expect(result).not.toBeNull();
    expect(result?.conversionRate).toBeCloseTo(0.1);
    expect(result?.source).toBe('scanner_results');
  });

  it('breaks full ties on conversionRate+upgradeCount by revenueUsd desc (still returns the top)', () => {
    const result = resolveProTip({
      scannerSource: 'scanner_results',
      funnelItems: [
        row({
          surface: 'scanner_results',
          viewCount: 100,
          upgradeCount: 8,
          conversionRate: 0.1,
          revenueUsd: 200,
        }),
        row({
          surface: 'scanner_results',
          viewCount: 100,
          upgradeCount: 8,
          conversionRate: 0.1,
          revenueUsd: 400,
        }),
      ],
      userPlan: 'pro',
    });
    expect(result).not.toBeNull();
    expect(result?.conversionRate).toBeCloseTo(0.1);
    expect(result?.source).toBe('scanner_results');
    expect(result?.label).toContain('Scanner');
  });

  it('returns null when userPlan is null', () => {
    expect(
      resolveProTip({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: null,
      }),
    ).toBeNull();
  });
});

describe('getUpgradeNudge', () => {
  it('returns null when userPlan is null', () => {
    const eligibility: UpgradeEligibility = [
      { surface: 'scanner_results', hasUpgradeSample: true },
    ];
    expect(
      getUpgradeNudge({ scannerSource: 'scanner_results', eligibility, userPlan: null }),
    ).toBeNull();
  });

  it('returns { copy, ctaHref } for a free user when the mapped surface has a non-zero viewCount', () => {
    expect(
      getUpgradeNudge({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'free',
      }),
    ).toEqual({
      copy: 'Users on the Proposal Scanner results convert well above average — unlock Pro for the full funnel insight.',
      ctaHref: '/#pricing',
    });
  });

  it('drives the same gate from the sanitized wire shape (hasUpgradeSample=true)', () => {
    const eligibility: UpgradeEligibility = [
      { surface: 'scanner_results', hasUpgradeSample: true },
      { surface: 'scanner_gate', hasUpgradeSample: false },
    ];
    expect(
      getUpgradeNudge({ scannerSource: 'scanner_results', eligibility, userPlan: 'free' }),
    ).toEqual({
      copy: 'Users on the Proposal Scanner results convert well above average — unlock Pro for the full funnel insight.',
      ctaHref: '/#pricing',
    });
  });

  it('returns null for a free user when the scannerSource is not in the funnel', () => {
    expect(
      getUpgradeNudge({
        scannerSource: 'dashboard_cta',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'free',
      }),
    ).toBeNull();
  });

  it('returns null for solo users', () => {
    expect(
      getUpgradeNudge({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'solo',
      }),
    ).toBeNull();
  });

  it('returns null for pro users', () => {
    expect(
      getUpgradeNudge({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
        ],
        userPlan: 'pro',
      }),
    ).toBeNull();
  });

  it('returns null when viewCount is zero even with upgrades (zero-sample gate)', () => {
    expect(
      getUpgradeNudge({
        scannerSource: 'scanner_results',
        funnelItems: [
          row({ surface: 'scanner_results', viewCount: 0, upgradeCount: 7, conversionRate: 0 }),
        ],
        userPlan: 'free',
      }),
    ).toBeNull();
  });

  it('sanitization: returned object keys are EXACTLY [copy, ctaHref] — no leaked numerics', () => {
    const result = getUpgradeNudge({
      scannerSource: 'scanner_results',
      funnelItems: [
        row({ surface: 'scanner_results', viewCount: 10, upgradeCount: 2, conversionRate: 0.2 }),
      ],
      userPlan: 'free',
    });
    expect(result).not.toBeNull();
    expect(Object.keys(result ?? {}).sort()).toEqual(['copy', 'ctaHref']);
  });
});

describe('pickProTipCopy', () => {
  it('returns "strong" when the matching row is above the median', () => {
    const variant = pickProTipCopy('scanner_results', [
      row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 30, conversionRate: 0.3 }),
      row({ surface: 'scanner_gate', viewCount: 80, upgradeCount: 4, conversionRate: 0.05 }),
      row({ surface: 'billing_pricing', viewCount: 60, upgradeCount: 3, conversionRate: 0.05 }),
    ]);
    expect(variant).toBe('strong');
  });

  it('returns "gentle" when the matching row is below the median', () => {
    const variant = pickProTipCopy('scanner_results', [
      row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 1, conversionRate: 0.01 }),
      row({ surface: 'scanner_gate', viewCount: 80, upgradeCount: 24, conversionRate: 0.3 }),
      row({ surface: 'billing_pricing', viewCount: 60, upgradeCount: 18, conversionRate: 0.3 }),
    ]);
    expect(variant).toBe('gentle');
  });

  it('returns "standard" when the matching row is tied with the median', () => {
    const variant = pickProTipCopy('scanner_results', [
      row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 5, conversionRate: 0.05 }),
      row({ surface: 'scanner_gate', viewCount: 80, upgradeCount: 4, conversionRate: 0.05 }),
    ]);
    expect(variant).toBe('standard');
  });

  it('returns "standard" when funnelItems is empty', () => {
    expect(pickProTipCopy('scanner_results', [])).toBe('standard');
  });

  it('returns "standard" when no row matches the surface', () => {
    const variant = pickProTipCopy('scanner_results', [
      row({ surface: 'dashboard_cta', viewCount: 100, upgradeCount: 5, conversionRate: 0.05 }),
      row({ surface: 'billing_pricing', viewCount: 80, upgradeCount: 4, conversionRate: 0.05 }),
    ]);
    expect(variant).toBe('standard');
  });

  it('returns "standard" when every row has viewCount === 0', () => {
    const variant = pickProTipCopy('scanner_results', [
      row({ surface: 'scanner_results', viewCount: 0, upgradeCount: 7, conversionRate: 0 }),
      row({ surface: 'scanner_gate', viewCount: 0, upgradeCount: 4, conversionRate: 0 }),
    ]);
    expect(variant).toBe('standard');
  });

  it('free-plan null invariant — does not take userPlan and never throws', () => {
    const items = [
      row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 30, conversionRate: 0.3 }),
      row({ surface: 'scanner_gate', viewCount: 80, upgradeCount: 4, conversionRate: 0.05 }),
    ];
    expect(() => pickProTipCopy('scanner_results', items)).not.toThrow();
    const variant = pickProTipCopy('scanner_results', items);
    expect(['strong', 'standard', 'gentle']).toContain(variant);
  });

  it('returns "standard" when scannerSource is null', () => {
    const variant = pickProTipCopy(null, [
      row({ surface: 'scanner_results', viewCount: 100, upgradeCount: 30, conversionRate: 0.3 }),
    ]);
    expect(variant).toBe('standard');
  });
});
