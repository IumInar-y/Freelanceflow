import { z } from 'zod';

export const SubscriptionStatusResponse = z.object({
  isPro: z.boolean(),
  plan: z.string().nullable(),
});

export type SubscriptionStatusResponse = z.infer<typeof SubscriptionStatusResponse>;
