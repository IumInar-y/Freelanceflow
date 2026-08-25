// Shared contract for GET /api/proposals/voice-profile — client-importable,
// no server-only imports. Single source of truth for the response shape;
// both the route handler and the future client island in the rewrite flow
// import this. The key set is lock-stable (mirrors the shape-stability
// assertion in tests/unit/voice-profile.test.ts).

import { z } from 'zod';

export const VoiceProfileSchema = z.object({
  avgSentenceLen: z.number(),
  topOpeners: z.array(z.string()),
  tone: z.enum(['formal', 'casual', 'balanced']),
  sampleSize: z.number(),
});

export const VoiceProfileResponse = z.object({
  profile: VoiceProfileSchema,
});

export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;
export type VoiceProfileResponseT = z.infer<typeof VoiceProfileResponse>;
