import { z } from 'zod';

export const TourStatusResponse = z.object({
  hasSeenProTour: z.boolean(),
});

export type TourStatusResponse = z.infer<typeof TourStatusResponse>;

export const MarkSeenResponse = z.object({
  ok: z.boolean(),
  hasSeenProTour: z.literal(true),
});

export type MarkSeenResponse = z.infer<typeof MarkSeenResponse>;
