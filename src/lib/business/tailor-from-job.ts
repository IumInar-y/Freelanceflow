// Pure prompt-composition helper for POST /api/proposals/tailor-from-job.
// Mirrors the pattern of src/lib/business/upwork-monitor.ts: a unit-testable
// function with no Prisma or fetch side-effects, so the route handler is the
// thin wrapper that owns auth + DB read.
//
// Design choices:
//   - The job TITLE is included verbatim (rewrite flow pivots from the title line).
//   - The job DESCRIPTION is included verbatim up to DESCRIPTION_MAX chars and
//     truncated with an explicit marker so the downstream rewrite flow gets a
//     visible signal that something was cut (no silent truncation).
//   - CATEGORY is included when present.
//   - winsContext is injected as a labelled block; empty/undefined winsContext
//     emits a `[voice-context not configured]` sentinel so the rewrite flow can
//     branch on absence instead of receiving the literal string "undefined".
//   - No PII (user id, email, IP) appears in the composed prompt — the
//     requirement for a per-user scoped endpoint stops at access control.

import { DESCRIPTION_MAX } from '@/lib/contracts/tailor-from-job';

export const VOICE_CONTEXT_NOT_CONFIGURED = '[voice-context not configured]';

export interface TailorFromJobInput {
  title: string | null;
  category?: string | null;
  description?: string | null;
  winsContext?: string | null;
}

function truncatedDescription(text: string | null | undefined, max: number): string {
  if (!text) return '(not provided)';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}\n\n[description truncated to ${max} chars]`;
}

function voiceContextBlock(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return VOICE_CONTEXT_NOT_CONFIGURED;
  return `Voice-context (wins, tone, do/don't):\n${raw.trim()}`;
}

export function composeTailoredPrompt(input: TailorFromJobInput): string {
  const title = input.title?.trim() || '(title not provided)';
  const description = truncatedDescription(input.description, DESCRIPTION_MAX);
  const voice = voiceContextBlock(input.winsContext);

  const categorySection = input.category?.trim() ? `\nCategory: ${input.category.trim()}` : '';

  return [
    'You are drafting a tailored Upwork proposal for the following saved job posting.',
    'Use the job title, category, and description as the substrate; weave in the',
    "freelancer's voice-context so the proposal reads authentic to them, not generic.",
    '',
    `Job title: ${title}${categorySection}`,
    '',
    'Job description:',
    description,
    '',
    voice,
    '',
    'Compose the proposal as a single block: a hook that references the job title,',
    "2-3 sentences connecting the freelancer's wins to the description, a tight",
    'scope/approach paragraph, and a short closing question. Do not invent client',
    'names, budgets, or country details — none were loaded into this prompt.',
  ].join('\n');
}
