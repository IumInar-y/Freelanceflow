// Pure voice-fingerprint helper for the future proposal-rewrite pipeline.
// Mirrors the pattern of src/lib/business/tailor-from-job.ts: a unit-testable
// function with no Prisma or fetch side-effects, so the eventual `/api` route
// handler is the thin wrapper that owns auth + DB read.
//
// Design choices:
//   - The input shape (`Proposal`) is a LOCAL view, deliberately richer than
//     the Prisma row: it carries a `body` string. Today the schema only has
//     `status`, so the future call site must reshape rows before passing them
//     (`(r) => ({ status: r.status, body: r.body })`) once a body source
//     surfaces. Today, callers that lack `body` must filter out the row
//     *before* calling — the helper has no `optional body` branch.
//   - `topOpeners` is bounded at 3 and built from a frequency bucket sorted
//     by count desc, with alphabetical tiebreak, so the output is stable
//     across runs and across `JSON.stringify` roundtrips.
//   - The tone heuristic is intentionally simple and documented in-line so
//     the tone-boundary test reproduces byte-for-byte. `formal` short-
//     circuits before `casual`; the middle band defaults to `balanced`.
//
// Authz note: this helper is pure and has zero request context, so it
// CANNOT enforce per-user scoping. The future route handler must:
//   - call `requireAuth()`,
//   - scope the Prisma read by `userId` and `status: 'won'`,
//   - never expose one user's VoiceProfile to another.
// That boundary is out of scope today; this commit is data-core only.
// @polsia:user-owned

export interface Proposal {
  status: 'won';
  body: string;
}

export interface VoiceProfile {
  avgSentenceLen: number;
  topOpeners: string[];
  tone: 'formal' | 'casual' | 'balanced';
  sampleSize: number;
}

const TERMINAL_PUNCT = /(?<=[.!?])\s+/;
const WORD_SPLIT = /\s+/;
const LEADING_PUNCT_OR_QUOTE = /^[^a-z0-9']+/i;
const CONTRACTION = /\b\w+'(s|re|ve|ll|d|m|t)\b|\b\w+n't\b/gi;
const TOP_OPENERS_CAP = 3;
// Heuristic thresholds. `formal` requires long sentences + near-zero
// contractions; `casual` requires short sentences + abundant contractions.
// Anything in between is `balanced` (the safe default).
const FORMAL_CONTRACTION_MAX = 2;
const FORMAL_AVG_LEN_MIN = 12;
const CASUAL_CONTRACTION_MIN = 5;
const CASUAL_AVG_LEN_MAX = 10;

function splitSentences(text: string): string[] {
  return text
    .split(TERMINAL_PUNCT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function wordCount(sentence: string): number {
  const tokens = sentence
    .trim()
    .split(WORD_SPLIT)
    .filter((t) => t.length > 0);
  return tokens.length;
}

function openingWords(sentence: string): string {
  const stripped = sentence.replace(LEADING_PUNCT_OR_QUOTE, '');
  const lower = stripped.toLowerCase();
  const tokens = lower
    .trim()
    .split(WORD_SPLIT)
    .filter((t) => t.length > 0);
  return tokens.slice(0, 2).join(' ');
}

function contractionCount(sentence: string): number {
  const matches = sentence.match(CONTRACTION);
  return matches ? matches.length : 0;
}

function clipOrEmpty<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr.slice();
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    const v = arr[i];
    if (v !== undefined) out.push(v);
  }
  return out;
}

function classifyTone(avgLen: number, contractions: number): VoiceProfile['tone'] {
  // `formal` is checked first: a long, zero-contraction corpus is formal
  // even if it would also satisfy the casual length rule on a degenerate
  // input. The order is load-bearing for the boundary test.
  if (contractions <= FORMAL_CONTRACTION_MAX && avgLen >= FORMAL_AVG_LEN_MIN) {
    return 'formal';
  }
  if (contractions >= CASUAL_CONTRACTION_MIN && avgLen <= CASUAL_AVG_LEN_MAX) {
    return 'casual';
  }
  return 'balanced';
}

export function buildVoiceProfile(wonProposals: Proposal[]): VoiceProfile {
  const sampleSize = wonProposals.length;

  if (sampleSize === 0) {
    return { avgSentenceLen: 0, topOpeners: [], tone: 'balanced', sampleSize: 0 };
  }

  const sentences: string[] = [];
  for (let i = 0; i < wonProposals.length; i++) {
    const p = wonProposals[i];
    if (!p) continue;
    const split = splitSentences(p.body);
    for (let j = 0; j < split.length; j++) {
      const s = split[j];
      if (s !== undefined) sentences.push(s);
    }
  }

  if (sentences.length === 0) {
    return { avgSentenceLen: 0, topOpeners: [], tone: 'balanced', sampleSize };
  }

  let totalWords = 0;
  let totalContractions = 0;
  const openerCounts = new Map<string, number>();

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (s === undefined) continue;
    totalWords += wordCount(s);
    totalContractions += contractionCount(s);

    const opener = openingWords(s);
    if (opener.length > 0) {
      openerCounts.set(opener, (openerCounts.get(opener) ?? 0) + 1);
    }
  }

  const avgSentenceLen = totalWords / sentences.length;

  const ranked = Array.from(openerCounts.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
  const topOpeners = clipOrEmpty(
    ranked.map((entry) => entry[0]),
    TOP_OPENERS_CAP,
  );

  const tone = classifyTone(avgSentenceLen, totalContractions);

  return { avgSentenceLen, topOpeners, tone, sampleSize };
}
