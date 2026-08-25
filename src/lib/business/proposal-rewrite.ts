// Pure prompt-composition helper for POST /api/proposals/rewrite. Mirrors the
// pattern of src/lib/business/tailor-from-job.ts: a unit-testable function
// with no Prisma or fetch side-effects, so the route handler is the thin
// wrapper that owns auth + LLM call.
//
// @polsia:user-owned

import type { LlmMessage } from '@/lib/ai/client';
import { DESCRIPTION_MAX, type JobContext } from '@/lib/contracts/proposal-rewrite';
import type { VoiceProfile } from '@/lib/contracts/voice-profile';

export interface ComposeRewritePromptInput {
  proposal: string;
  jobContext: JobContext;
  voiceProfile: VoiceProfile;
}

const ZERO_VOICE: VoiceProfile = {
  avgSentenceLen: 0,
  topOpeners: [],
  tone: 'balanced',
  sampleSize: 0,
};

function truncatedDescription(text: string | undefined, max: number): string {
  if (!text) return '(not provided)';
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}\n\n[description truncated to ${max} chars]`;
}

function jobContextSection(jc: JobContext): string {
  const lines: string[] = [];
  if (jc.title?.trim()) lines.push(`- Title: ${jc.title.trim()}`);
  if (jc.platform?.trim()) lines.push(`- Platform: ${jc.platform.trim()}`);
  if (jc.budget?.trim()) lines.push(`- Budget: ${jc.budget.trim()}`);
  const skills = jc.skills?.filter((s): s is string => Boolean(s?.trim()));
  if (skills && skills.length > 0) {
    lines.push(`- Skills: ${skills.map((s) => s.trim()).join(', ')}`);
  }
  if (jc.description?.trim()) {
    lines.push('');
    lines.push('Description:');
    lines.push(truncatedDescription(jc.description, DESCRIPTION_MAX));
  }
  if (lines.length === 0) return '(job context not provided)';
  return lines.join('\n');
}

function voiceSection(vp: VoiceProfile): string {
  const safe = vp ?? ZERO_VOICE;
  const avg = safe.avgSentenceLen > 0 ? safe.avgSentenceLen.toFixed(1) : 'unknown';
  const openers =
    safe.topOpeners.length > 0 ? safe.topOpeners.map((o) => `\`${o}\``).join(', ') : '(none)';
  return [
    `- Average sentence length: ~${avg} words — match this rhythm.`,
    `- Tone: ${safe.tone} — keep the same level of formality/casualness.`,
    `- Top sentence openers (use sparingly, only where they fit naturally): ${openers}`,
    `- Sample size: ${safe.sampleSize} won proposal${safe.sampleSize === 1 ? '' : 's'}.`,
  ].join('\n');
}

const SYSTEM_PROMPT = [
  'You are an expert freelance proposal editor. The freelancer has provided a',
  'draft proposal below; rewrite it into a polished, job-targeted version',
  'that still reads as their authentic voice.',
  '',
  '# Voice fingerprint',
  '',
  '# Job context',
  '',
  '# Rules',
  '- Polish tone, structure, and persuasive flow without inventing client',
  '  names, country details, or budgets not provided in the job context.',
  '- Remove AI tells: "delve", "moreover", "it\'s worth noting", "I hope this',
  '  finds you well", "in conclusion", "leverage", "utilize", etc.',
  "- Preserve the freelancer's key selling points and any specific project",
  '  details they already mentioned.',
  '- Keep the total length within ±20 words of the original draft.',
  '- Return ONLY the rewritten proposal text — no quotes, no preamble, no',
  '  explanation.',
].join('\n');

export function composeRewritePrompt(input: ComposeRewritePromptInput): LlmMessage[] {
  const voice = voiceSection(input.voiceProfile);
  const job = jobContextSection(input.jobContext);

  const system = `${SYSTEM_PROMPT}${voice}\n\n${job}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: input.proposal },
  ];
}
