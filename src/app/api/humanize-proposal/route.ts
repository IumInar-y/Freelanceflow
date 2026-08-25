import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { chat } from '@/lib/ai/client';
import { HumanizeProposalRequest, type HumanizeProposalResponse } from '@/lib/contracts/scan';
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
    const parse = HumanizeProposalRequest.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parse.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { email, proposal } = parse.data;

    // Validate email via waitlist schema
    const emailResult = waitlistSchema.safeParse({ email });
    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Invalid email', details: emailResult.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Capture email in waitlist
    try {
      await prisma.waitlistEntry.create({ data: { email } });
    } catch (err: unknown) {
      // Unique violation — treat as success (already on waitlist)
      const isUniqueViolation = err instanceof Error && err.message.includes('Unique constraint');
      if (!isUniqueViolation) throw err;
    }

    // Rewrite proposal via LLM
    let rewritten: string;
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: `You are a freelance proposal editor. Rewrite the proposal below to sound human, natural, and personal.

Rules:
- Replace generic filler with specific references to the client's project or context
- Use varied sentence length and natural rhythm
- Remove all LLM tells (delve, moreover, it's worth noting, in conclusion, etc.)
- Add a natural call-to-action that asks for a specific next step
- Keep the same length (±20 words)
- Return ONLY the rewritten proposal text — no quotes, no preamble, no explanation
- If the proposal references specific technologies, names, or project details, preserve and weave them in naturally
- Sound like a real person who researched this specific client — not a template
`,
        },
        {
          role: 'user',
          content: proposal,
        },
      ];

      rewritten = await chat({ messages, task: 'humanize-proposal' });
    } catch (_err) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again in a moment.' },
        { status: 503, headers: CORS_HEADERS },
      );
    }

    const response: z.infer<typeof HumanizeProposalResponse> = { rewritten };
    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
