import { z } from 'zod';

export const ProTipSchema = z.object({
  label: z.string(),
  body: z.string(),
  source: z.string(),
  conversionRate: z.number(),
});

export type ProTip = z.infer<typeof ProTipSchema>;

// Sanitized nudge shown to free users on Proposal Scanner results — no numerics.
export const UpgradeNudgeSchema = z.object({
  copy: z.string().min(1),
  ctaHref: z.string().min(1),
});

export type UpgradeNudge = z.infer<typeof UpgradeNudgeSchema>;

// Wire shape from /api/scanner/upgrade-eligibility — no numerics cross the boundary.
export const UpgradeEligibilitySchema = z.array(
  z.object({
    surface: z.string(),
    hasUpgradeSample: z.boolean(),
  }),
);

export type UpgradeEligibility = z.infer<typeof UpgradeEligibilitySchema>;
