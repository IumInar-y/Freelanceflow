import { z } from 'zod';

export const RewriteProposalRequest = z.object({
  email: z.string().email(),
  proposal: z.string().min(50).max(2000),
  issues: z.array(z.string()).optional(),
});

export const RewriteProposalResponse = z.object({ rewritten: z.string() });

export const GenerateFromPromptRequest = z.object({
  email: z.string().email(),
  prompt: z.string().min(10).max(2000),
});

export const GenerateFromPromptResponse = z.object({ generated: z.string() });

export type RewriteProposalRequest = z.infer<typeof RewriteProposalRequest>;
export type RewriteProposalResponse = z.infer<typeof RewriteProposalResponse>;
export type GenerateFromPromptRequest = z.infer<typeof GenerateFromPromptRequest>;
export type GenerateFromPromptResponse = z.infer<typeof GenerateFromPromptResponse>;
