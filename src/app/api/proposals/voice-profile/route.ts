// @polsia:user-owned
//
// GET /api/proposals/voice-profile — owner-scoped voice fingerprint read.
//
// Reads the caller's won ProposalEntry rows and returns a VoiceProfile via
// the pure helper at src/lib/business/voice-profile.ts. Pattern: requireAuth
// + Prisma read scoped by { userId, status: 'won' } + pure helper + zod
// response contract.
//
// Auth model: per-user (requireAuth), not admin (do NOT use requireAdmin()).
// Cross-user attempts return 200 with the empty-profile shape (IDOR-safe by
// scoping — never 404, never 500). Rows missing a body are filtered out at
// runtime before reaching buildVoiceProfile (Prisma returns `body: null`
// for legacy rows written before the column existed).
//
// Curl smoke:
//   curl /api/proposals/voice-profile -H 'cookie: <authed session cookie>'
//
// Returns 200 { profile } / 401 no session / 500 malformed helper output.

import 'server-only';
import { NextResponse } from 'next/server';
import { buildVoiceProfile, type Proposal } from '@/lib/business/voice-profile';
import { VoiceProfileResponse } from '@/lib/contracts/voice-profile';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const rows = await prisma.proposalEntry.findMany({
    where: { userId: user.id, status: 'won' },
  });

  // ProposalEntry.body is a nullable String; legacy rows written before the
  // column existed surface as null/undefined. Filter to non-empty strings
  // before shaping for the helper, which requires body: string.
  const won: Proposal[] = rows
    .filter(
      (r): r is typeof r & { body: string } => typeof r.body === 'string' && r.body.length > 0,
    )
    .map((r) => ({ status: 'won' as const, body: r.body }));

  const profile = buildVoiceProfile(won);

  const parseResult = VoiceProfileResponse.safeParse({ profile });
  if (!parseResult.success) {
    // The contract exists to catch wire-shape drift — if the helper ever
    // emits something that violates it, return 500 rather than shipping a
    // malformed payload to the client.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
  return NextResponse.json(parseResult.data, { status: 200 });
}
