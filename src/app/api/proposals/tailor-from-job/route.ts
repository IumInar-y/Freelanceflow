// @polsia:user-owned
//
// POST /api/proposals/tailor-from-job — per-user proposal prompt composer.
//
// Reads one MatchedJob owned by the caller and returns a tailored proposal
// prompt string with the freelancer's plan-mode voice-context injected.
// Pattern: requireAuth + Prisma read scoped by { id, userId } + pure helper.
// NOT a 'use server' route — this is an /api route handler. The downstream
// `rewrite` AI call (future slice) lives in its own endpoint.
//
// Curl smoke:
//   curl -X POST /api/proposals/tailor-from-job \
//     -H 'cookie: <authed session cookie>' \
//     -H 'content-type: application/json' \
//     -d '{"jobId":"<matchedJob.id>","winsContext":"<voice-context string>"}'
//
// Returns 200 { prompt, jobId } / 400 bad shape / 401 no session /
// 404 job not found OR foreign to caller (IDOR-safe: cross-user probe = 404)
// / 500 unexpected.

import 'server-only';
import { NextResponse } from 'next/server';
import { composeTailoredPrompt } from '@/lib/business/tailor-from-job';
import { TailorFromJobRequest, TailorFromJobResponse } from '@/lib/contracts/tailor-from-job';
import { prisma } from '@/lib/db';
import { requireAuth, type SessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let user: SessionUser;
  try {
    user = await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = TailorFromJobRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { jobId, winsContext } = parsed.data;

  const job = await prisma.matchedJob.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true, title: true, category: true, description: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const prompt = composeTailoredPrompt({
    title: job.title,
    category: job.category,
    description: job.description,
    winsContext: winsContext ?? null,
  });

  const response = TailorFromJobResponse.parse({ prompt, jobId: job.id });
  return NextResponse.json(response, { status: 200 });
}
