// Shared contract for POST /api/proposals/rewrite — client-importable,
// no server-only imports. Single source of truth for the request/response
// shape; both the route handler and the future wiring in the rewrite flow
// (the client island that posts the composer prompt + voice fingerprint +
// job context to this endpoint) import this.

import { z } from 'zod';
import { JobDetails } from '@/lib/contracts/job';
import { VoiceProfileSchema } from '@/lib/contracts/voice-profile';

export const DESCRIPTION_MAX = 8000;

export const ProposalMinLen = 50;
export const ProposalMaxLen = 2000;

// JobContext is a loose subset of the full JobDetails the scanner fetches;
// the rewrite flow lets the caller supply whatever subset they have today
// (a title alone, or a richer description plus skills).
export const JobContextSchema = JobDetails.partial();

export const RewriteProposalRequest = z.object({
  proposal: z.string().min(ProposalMinLen).max(ProposalMaxLen),
  jobContext: JobContextSchema,
  voiceProfile: VoiceProfileSchema,
});

export const RewriteProposalResponse = z.object({
  rewrittenProposal: z.string().min(1),
});

export type JobContext = z.infer<typeof JobContextSchema>;
export type RewriteProposalRequest = z.infer<typeof RewriteProposalRequest>;
export type RewriteProposalResponse = z.infer<typeof RewriteProposalResponse>;
