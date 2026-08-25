import { z } from 'zod';

export const ScanProposalRequest = z.object({
  proposal: z
    .string()
    .min(50, 'Proposal must be at least 50 characters.')
    .max(2000, 'Proposal must be under 2000 characters.'),
});

export const Suggestion = z.object({
  before: z.string(),
  after: z.string(),
  reason: z.string(),
});

export const ScanProposalResponse = z.object({
  score: z.number(),
  aiScore: z.number(),
  personalScore: z.number(),
  lengthScore: z.number(),
  ctaScore: z.number(),
  issues: z.array(z.string()),
  suggestions: z.array(Suggestion),
});

export const HumanizeProposalRequest = z.object({
  email: z.string().email('Please enter a valid email address.'),
  proposal: z.string().min(50).max(2000),
});

export const HumanizeProposalResponse = z.object({
  rewritten: z.string(),
});

export type ScanProposalRequest = z.infer<typeof ScanProposalRequest>;
export type ScanProposalResponse = z.infer<typeof ScanProposalResponse>;
export type HumanizeProposalRequest = z.infer<typeof HumanizeProposalRequest>;
export type HumanizeProposalResponse = z.infer<typeof HumanizeProposalResponse>;
