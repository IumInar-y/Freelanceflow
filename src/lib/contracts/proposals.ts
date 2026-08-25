import { z } from 'zod';

export const ProposalStatus = z.enum(['pending', 'replied', 'won', 'lost']);

export const ProposalRow = z.object({
  id: z.string(),
  email: z.string(),
  client: z.string(),
  platform: z.string(),
  dateSent: z.string(),
  status: ProposalStatus,
  value: z.number(),
  createdAt: z.string(),
});

export const CreateProposalRequest = z.object({
  email: z.string().email(),
  client: z.string().min(1).max(80),
  platform: z.string().min(1),
  dateSent: z.string().min(1),
  status: ProposalStatus,
  value: z.number().min(0),
});

export const UpdateProposalRequest = z
  .object({
    client: z.string().min(1).max(80).optional(),
    platform: z.string().min(1).optional(),
    dateSent: z.string().min(1).optional(),
    status: ProposalStatus.optional(),
    value: z.number().min(0).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const ProposalListResponse = z.object({
  proposals: z.array(ProposalRow),
});

export const ProposalCreateResponse = z.object({
  proposal: ProposalRow,
});

export type ProposalStatus = z.infer<typeof ProposalStatus>;
export type ProposalRow = z.infer<typeof ProposalRow>;
export type CreateProposalRequest = z.infer<typeof CreateProposalRequest>;
export type UpdateProposalRequest = z.infer<typeof UpdateProposalRequest>;
export type ProposalListResponse = z.infer<typeof ProposalListResponse>;
export type ProposalCreateResponse = z.infer<typeof ProposalCreateResponse>;
