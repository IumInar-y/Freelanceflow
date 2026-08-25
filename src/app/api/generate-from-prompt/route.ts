import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { chat } from '@/lib/ai/client';
import {
  GenerateFromPromptRequest,
  type GenerateFromPromptResponse,
} from '@/lib/contracts/rewrite';
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
    const parse = GenerateFromPromptRequest.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parse.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { email, prompt } = parse.data;

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

    let generated: string;
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: `You are an expert freelance proposal writer. Write a compelling, human-sounding freelance proposal based on the user's description.

Rules:
- Sound like a real freelancer who genuinely understands this specific project and client
- Avoid ALL AI detection patterns: never use "delve", "moreover", "it's worth noting", "I hope this finds you well", "I hope this message finds you well", "leverage", "utilize", "in conclusion", "furthermore", "additionally", "I am writing to"
- Vary sentence length naturally — mix short punchy sentences with longer ones
- Open with something specific and engaging, not a generic greeting
- Include a concrete, specific call-to-action at the end (suggest a brief call, ask about timeline, etc.)
- Aim for 150–250 words — enough to be compelling, short enough to be read
- Return ONLY the proposal text — no subject line, no quotes, no preamble, no explanation`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      generated = await chat({ messages, task: 'generate-from-prompt' });
    } catch (_err) {
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again in a moment.' },
        { status: 503, headers: CORS_HEADERS },
      );
    }

    const response: z.infer<typeof GenerateFromPromptResponse> = { generated };
    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
