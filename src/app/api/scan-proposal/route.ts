import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { ScanProposalRequest, type ScanProposalResponse } from '@/lib/contracts/scan';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-AllowMethod': 'POST, OPTIONS',
  'Access-Control-AllowHeaders': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreAIBurstiness(text: string): { score: number; issues: string[] } {
  const sentences = getSentences(text);
  if (sentences.length < 3) return { score: 0, issues: [] };

  const lengths = sentences.map(
    (s) => s.split(/\b/).filter((w) => w.match(/\bꃫ\b|\b[a-zA-Z]+\b/)).length,
  );
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Low variance = high AI likelihood (uniform sentence length)
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  let score = Math.round((1 - Math.min(coefficientOfVariation, 1)) * 40);
  const issues: string[] = [];

  if (coefficientOfVariation < 0.3) {
    issues.push('Very uniform sentence length — typical of AI-generated text');
    score += 10;
  } else if (coefficientOfVariation < 0.5) {
    issues.push('Low sentence length variance — possible AI assistance');
  }

  return { score: Math.min(score, 40), issues };
}

const LLM_TELLS = [
  /\bdelve\b/i,
  /\bmoreover\b/i,
  /\bfurthermore\b/i,
  /--/,
  /—/,
  /\bit's worth noting\b/i,
  /\bin conclusion\b/i,
  /\bto summarize\b/i,
  /\bI hope this message finds you well\b/i,
  /\bplease don't hesitate\b/i,
  /\bkindly\b/i,
  /\bhereby\b/i,
  /\bassistance\b/i,
  /\bconsidering the(?: aforementioned| above)\b/i,
  /\b(?:as|when) (?:one )?may(?: perhaps)? (?:consider|note|see)\b/i,
  /\bthe (?:fact|notion|concept|idea) that\b/i,
];

function scoreLLMTells(text: string): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  for (const tell of LLM_TELLS) {
    if (tell.test(text)) {
      const match = text.match(tell)?.[0] ?? '';
      if (match.length > 2) {
        issues.push(`LLM phrase detected: "${match}"`);
        score += 5;
      }
    }
  }

  return { score: Math.min(score, 25), issues };
}

const GENERIC_PATTERNS = [
  /your (?:project|needs?|requirements?)/i,
  /looking for (?:someone|an?)\b/i,
  /\bexperienced\b/i,
  /\bdedicated\b/i,
  /\bprofessional\b/i,
  /\bquality\b/i,
  /\btimely\b/i,
  /\bexcellent\b/i,
  /\bgood\b.*communication/i,
  /\bavailable\b/i,
  /\bpassionate\b/i,
  /\blet me help\b/i,
  /\bI can help\b/i,
  /\bI am (?:a|an)\b/i,
  /\bI have experience\b/i,
  /\bI will\b/i,
  /\bI will be able\b/i,
];

const SPECIFIC_PATTERNS = [
  /\bupwork\b/i,
  /\bfiverr\b/i,
  /\btoptal\b/i,
  /\bfreelancer(?:\\.com)?\b/i,
  /\bgithub\b/i,
  /\blinkedin\b/i,
  /[A-Z][a-z]+ (?:Inc|LLC|Ltd|Corp)\b/,
  /\b(Node|React|Python|JavaScript|TypeScript|Go|Rust)\b/,
  /\bAWS|Azure|GCP\b/i,
  /\bAPI\b/i,
  /\b(paying|paid|rate|budget|price|cost)\b.*?(\\$|dollar|payment)/i,
  /\bdeadline\b/i,
  /\b(\\$[\\,\\d]+|USD|EUR|GBP)\b/,
  /\breact hook\b/i,
  /\bnext\\.js\b/i,
  /\btailwind\b/i,
];

function scorePersonalization(text: string): { score: number; issues: string[] } {
  const matchedGenerics = GENERIC_PATTERNS.filter((p) => p.test(text)).length;
  const matchedSpecifics = SPECIFIC_PATTERNS.filter((p) => p.test(text)).length;

  let score = 0;
  const issues: string[] = [];

  // Generic filler
  if (matchedGenerics >= 3) {
    score = 0;
    issues.push(
      `Generic filler phrases detected (${matchedGenerics} patterns) — proposal reads template-based`,
    );
  } else if (matchedGenerics === 2) {
    score = 8;
    issues.push('Some generic language — add specifics about the client or project');
  } else if (matchedGenerics === 1) {
    score = 14;
  } else {
    score = 20;
  }

  // Specific details
  if (matchedSpecifics === 0) {
    score = Math.max(0, score - 5);
    issues.push('No specific client/project details found — personalization score reduced');
  } else if (matchedSpecifics >= 3) {
    score = Math.min(20, score + 5);
    issues.push(`Good specificity — found ${matchedSpecifics} concrete references`);
  }

  return { score: Math.max(0, Math.min(20, score)), issues };
}

function scoreLength(text: string): { score: number; issues: string[] } {
  const wordCount = text.split(/\b\b/).filter((w) => w.match(/\b[a-zA-Z]+\b/)).length;
  let score = 0;
  const issues: string[] = [];

  if (wordCount < 75) {
    score = 0;
    issues.push(`Too short (${wordCount} words) — under 150 words reads as low-effort`);
  } else if (wordCount < 100) {
    score = 3;
    issues.push(
      `Rather short (${wordCount} words) — aim for 150–300 for detail vs brevity balance`,
    );
  } else if (wordCount < 150) {
    score = 6;
  } else if (wordCount <= 300) {
    score = 10;
  } else if (wordCount <= 450) {
    score = 6;
    issues.push(`Too long (${wordCount} words) — 300–450 words risks client glazing over`);
  } else {
    score = 2;
    issues.push(`Way too long (${wordCount} words) — over 450 words will lose clients`);
  }

  return { score, issues };
}

const CTA_PHRASES = [
  /let'?s?\b.*\b(?:hop on|chat|discuss|talk|connect|call|meet)\b/i,
  /\bbook\b.*\b(?:a call|consultation)\b/i,
  /\bsend me (?:a )?(?:message|email)\b/i,
  /\b(?:feel |just )?free to (?:reach out|contact|get in touch)\b/i,
  /\bI would love to\b.*\b(?:chat|discuss|talk)\b/i,
  /\b(?:looking forward|happy to).*(?:discuss|talk|chat|connect)\b/i,
  /\blet me know\b.*\b(?:if|whether|when)\b/i,
  /\bSchedule\b.*\b(?:a call|consultation)\b/i,
  /\b(?:coffee|zoom|call)\b.*\b(?:chat|discuss)\b/i,
];

function scoreCTA(text: string): { score: number; issues: string[] } {
  const hasCTA = CTA_PHRASES.some((p) => p.test(text));
  const issues: string[] = [];

  if (!hasCTA) {
    issues.push('No call-to-action detected — client doesn&apos;t know what to do next');
    return { score: 0, issues };
  }

  return { score: 5, issues: [] };
}

function buildSuggestions(
  aiIssues: string[],
  personalIssues: string[],
  lengthIssues: string[],
  ctaIssues: string[],
): Array<{ before: string; after: string; reason: string }> {
  const suggestions: Array<{ before: string; after: string; reason: string }> = [];

  if (aiIssues.length > 0) {
    suggestions.push({
      before: '"I hope this message finds you well…"',
      after: '"Hey [Name], I saw your post about rebuilding the checkout flow…"',
      reason: 'Lead with a specific observation about their project — not a generic opener.',
    });
  }

  if (personalIssues.some((i) => i.includes('Generic'))) {
    suggestions.push({
      before: '"I am a professional developer with experience…"',
      after: '"I built a similar checkout flow for a SaaS client last month using React + Stripe."',
      reason: 'Replace generic self-description with a concrete, relevant accomplishment.',
    });
  }

  if (ctaIssues.length > 0) {
    suggestions.push({
      before: '"Looking forward to hearing from you."',
      after: '"Want to hop on a quick 15-min call this week? Send me a time that works."',
      reason: 'Make the next step concrete and low-friction — ask for a specific action.',
    });
  }

  if (lengthIssues.some((i) => i.includes('Too short') || i.includes('Rather short'))) {
    suggestions.push({
      before: '"I can do this."',
      after:
        '"I can have the API wired up and a working prototype to you by Thursday — similar projects have taken me 2–3 days."',
      reason: 'Add concrete detail: timelines, relevant past work, or a specific outcome.',
    });
  }

  // Ensure at least 3 suggestions if we have content to improve
  if (suggestions.length < 3 && (aiIssues.length > 0 || personalIssues.length > 0)) {
    suggestions.push({
      before: '"Please let me know if you have any questions."',
      after: '"What’s the biggest technical challenge you’re facing with the current setup?"',
      reason: 'Replace a passive closer with a question that engages them directly.',
    });
  }

  return suggestions.slice(0, 3);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parse = ScanProposalRequest.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parse.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { proposal } = parse.data;

    const aiResult = scoreAIBurstiness(proposal);
    const llmResult = scoreLLMTells(proposal);
    const personalResult = scorePersonalization(proposal);
    const lengthResult = scoreLength(proposal);
    const ctaResult = scoreCTA(proposal);

    const aiScore = aiResult.score + llmResult.score;
    const personalScore = personalResult.score;
    const lengthScore = lengthResult.score;
    const ctaScore = ctaResult.score;

    const rawScore = aiScore + personalScore + lengthScore + ctaScore;
    const score = Math.min(100, Math.max(0, rawScore));

    const allIssues = [
      ...aiResult.issues,
      ...llmResult.issues,
      ...personalResult.issues,
      ...lengthResult.issues,
      ...ctaResult.issues,
    ];

    const suggestions = buildSuggestions(
      aiResult.issues,
      personalResult.issues,
      lengthResult.issues,
      ctaResult.issues,
    );

    const response: z.infer<typeof ScanProposalResponse> = {
      score,
      aiScore,
      personalScore,
      lengthScore,
      ctaScore,
      issues: allIssues,
      suggestions,
    };

    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (_err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
