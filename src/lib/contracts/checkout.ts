import { z } from 'zod';

export const CheckoutSessionResponseSchema = z.object({
  url: z.string().url(),
});

export type CheckoutSessionResponse = z.infer<typeof CheckoutSessionResponseSchema>;
