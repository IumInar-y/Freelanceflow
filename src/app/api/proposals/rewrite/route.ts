// @polsia:user-owned
//
// POST /api/proposals/rewrite — auth-gated proposal rewriter.
//
// Accepts { proposal, jobContext, voiceProfile }, composes a system prompt
// that grounds the rewrite in the supplied job context and preserves the
// user's voice fingerprint, calls the Polsia AI proxy, and returns the
// rewritten proposal as { rewrittenProposal }.
//
// Pattern: requireAuth → zod safeParse → pure helper → chat(). NOT a
// 'use server' route — this is an /api route handler. Sister route at
// /api/rewrite-proposal (anonymous scanner flow) is intentionally NOT
// modified here; that path is a separate concern.
//
// Curl smoke:
//   curl -X POST /api/proposals/rewrite \
//     -H 'cookie: <authed session cookie>' \
//     -H 'content-type: application/json' \
//     -d '{"proposal":"...","jobContext":{"title":"..."},"voiceProfile":{...}}'
//
// Returns 200 { rewrittenProposal } / 400 bad shape / 401 no session /
// 500 AI failure.

import 'server-only';
import { NextResponse } from 'next/server';
import { chat } from '@/lib/ai/client';
import { composeRewritePrompt } from '@/lib/business/proposal-rewrite';
import { RewriteProposalRequest, RewriteProposalResponse } from '@/lib/contracts/proposal-rewrite';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await requireAuth(req);
  } catch (res) {
    return res as Response;
  }

  const raw = (await req.json().catch(() => ({}))) as unknown;
  const parsed = RewriteProposalRequest.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { proposal, jobContext, voiceProfile } = parsed.data;

  const messages = composeRewritePrompt({ proposal, jobContext, voiceProfile });

  try {
    const rewrittenProposal = await chat({
      messages,
      task: 'proposal-rewrite',
    });
    const response = RewriteProposalResponse.parse({ rewrittenProposal });
    return NextResponse.json(response, { status: 200 });
  } catch (_err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
