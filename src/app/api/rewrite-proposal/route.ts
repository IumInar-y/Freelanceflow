import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { chat } from '@/lib/ai/client';
import { RewriteProposalRequest, type RewriteProposalResponse } from '@/lib/contracts/rewrite';
import { prisma } from '@/lib/db';
import { waitlistSchema } from '@/lib/waitlist/schema';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Method': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = RewriteProposalRequest.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parse.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { email, proposal, issues } = parse.data;

    const emailResult = waitlistSchema.safeParse({ email });
    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Invalid email', details: emailResult.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    try {
      await prisma.waitlistEntry.create({ data: { email } });
    } catch (err: unknown) {
      const isUniqueViolation = err instanceof Error && err.message.includes('Unique constraint');
      if (!isUniqueViolation) throw err;
    }

    let rewritten: string;
    try {
      const issuesList = issues && issues.length > 0 ? issues.join(', ') : null;
      const userContent = issuesList ? `${proposal}\n\nIssues flagged: ${issuesList}` : proposal;

      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: `You are a freelance proposal editor specializing in making AI-generated proposals sound human and compelling.

Rewrite the proposal to sound natural, personal, and human. ${issuesList ? `Explicitly address these flagged issues: ${issuesList}.` : ''}

Rules:
- Preserve all key selling points and specific project details mentioned
- Use varied sentence length and natural conversational rhythm
- Remove ALL AI tells: delve, moreover, it's worth noting, I hope this finds you well, in conclusion, leverage, utilize, etc.
- Add a specific, natural call-to-action that asks for a concrete next step
- Keep the same length (±20 words from original)
- Return ONLY the rewritten proposal text — no quotes, no preamble, no explanation
- Sound like a real person who genuinely researched this specific client and project`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ];

      rewritten = await chat({ messages, task: 'rewrite-proposal' });
    } catch (_err) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again in a moment.' },
        { status: 503, headers: CORS_HEADERS },
      );
    }

    const response: z.infer<typeof RewriteProposalResponse> = { rewritten };
    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
