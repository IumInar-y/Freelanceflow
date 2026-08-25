import { z } from 'zod';
import { JobDetails } from './job';

export const GenerateProposalRequest = z.object({
  job: JobDetails,
});

export const ProposalResult = z.object({
  proposal: z.string(),
});

export type GenerateProposalRequest = z.infer<typeof GenerateProposalRequest>;
export type ProposalResult = z.infer<typeof ProposalResult>;
