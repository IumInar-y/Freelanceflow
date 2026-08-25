// @polsia:user-owned — zod contract shared by GET /api/admin/stripe-status and
// the StripeStatusDashboard client island. Keep client-importable: zod only,
// no server-only imports.
import { z } from 'zod';

export const StripeStatusResponse = z.object({
  keys: z.array(
    z.object({
      name: z.string(),
      present: z.boolean(),
    }),
  ),
  ready: z.boolean(),
  lastSyncAt: z.string().nullable(),
});

export type StripeStatusResponse = z.infer<typeof StripeStatusResponse>;
