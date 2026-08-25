import 'server-only';
import { NextResponse } from 'next/server';
import { GenerateProposalRequest } from '@/lib/contracts/proposal';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function buildProposal(job: GenerateProposalRequest['job']): string {
  const skillsList = job.skills.length > 0 ? job.skills.join(', ') : 'the required skills';
  const budgetLine = job.budget
    ? `\nI noticed the budget is ${job.budget}, and I'm confident we can deliver excellent value within that range.\n`
    : '';
  const descExcerpt = job.description.slice(0, 300).trim();
  const platformGreeting = job.platform !== 'Unknown' ? ` on ${job.platform}` : '';

  return `Hi there,

I came across your posting${platformGreeting} for "${job.title}" and I'm excited to apply — this project aligns perfectly with my background.

${descExcerpt.length > 50 ? `From your description, I understand you need: ${descExcerpt}…\n` : ''}
My approach to "${job.title}":
• I bring hands-on expertise in ${skillsList}.
• I'll begin with a brief discovery call to align on your exact requirements, then deliver working milestones so you can review progress early and often.
• Clear communication throughout — you'll always know where things stand.
${budgetLine}
Why work with me?
I treat every project as a long-term partnership, not a one-off transaction. My clients consistently highlight my attention to detail, fast turnaround, and transparent communication as key differentiators.

I'd love to learn more about your specific goals and timeline. Are you available for a quick chat this week?

Looking forward to hearing from you!`;
}

export async function POST(req: Request) {
  const parsed = GenerateProposalRequest.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const proposal = buildProposal(parsed.data.job);
  return NextResponse.json({ proposal }, { headers: CORS_HEADERS });
}
