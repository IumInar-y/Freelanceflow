// @polsia:user-owned — zod contract shared by POST /api/admin/grant-pro and the
// GrantProForm client island. Keep client-importable: zod only, no server-only
// imports.
import { z } from 'zod';

export const GrantProRequest = z.object({
  action: z.enum(['grant', 'revoke']),
  email: z.string().email('Enter a valid email'),
  expiresAt: z.string().datetime({ message: 'Enter a valid ISO datetime' }).optional(),
});

export const GrantProResponse = z.object({
  ok: z.literal(true),
  action: z.enum(['grant', 'revoke']),
  email: z.string(),
  plan: z.string(),
  active: z.boolean(),
  expiresAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type GrantProRequest = z.infer<typeof GrantProRequest>;
export type GrantProResponse = z.infer<typeof GrantProResponse>;
