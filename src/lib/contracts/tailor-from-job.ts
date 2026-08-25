// Shared contract for POST /api/proposals/tailor-from-job — client-importable,
// no server-only imports. Single source of truth for the request/response shape;
// both the route handler and (later) the client island import this.

import { z } from 'zod';

export const WINS_CONTEXT_MAX = 2000;
export const DESCRIPTION_MAX = 8000;

export const TailorFromJobRequest = z.object({
  jobId: z.string().min(1).max(64),
  // Optional inline plan-mode voice-context (wins, voice quirks, do/don't list).
  // Capped at WINS_CONTEXT_MAX so the composed prompt can never blow up.
  winsContext: z.string().max(WINS_CONTEXT_MAX).optional(),
});

export const TailorFromJobResponse = z.object({
  prompt: z.string().min(1),
  jobId: z.string().min(1),
});

export type TailorFromJobRequest = z.infer<typeof TailorFromJobRequest>;
export type TailorFromJobResponse = z.infer<typeof TailorFromJobResponse>;
