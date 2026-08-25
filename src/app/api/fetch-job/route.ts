import 'server-only';
import { NextResponse } from 'next/server';
import { FetchJobRequest } from '@/lib/contracts/job';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function detectPlatform(url: string): string {
  if (url.includes('upwork.com')) return 'Upwork';
  if (url.includes('fiverr.com')) return 'Fiverr';
  if (url.includes('freelancer.com')) return 'Freelancer';
  if (url.includes('toptal.com')) return 'Toptal';
  if (url.includes('guru.com')) return 'Guru';
  if (url.includes('peopleperhour.com')) return 'PeoplePerHour';
  return 'Unknown';
}

function extractTitle(html: string): string {
  const patterns = [
    /<h1[^>]*class="[^"]*job-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const captured = match?.[1];
    if (captured) {
      return captured
        .replace(/<[^>]+>/g, '')
        .trim()
        .slice(0, 200);
    }
  }
  return 'Freelance Project';
}

function extractDescription(html: string): string {
  const patterns = [
    /class="[^"]*job-description[^"]*"[^>]*>([\s\S]{100,3000}?)<\//i,
    /class="[^"]*description[^"]*"[^>]*>([\s\S]{100,3000}?)<\//i,
    /<p[^>]*>([\s\S]{100,2000}?)<\/p>/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const captured = match?.[1];
    if (captured) {
      return captured
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1500);
    }
  }
  const stripped = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 800);
}

function extractSkills(html: string): string[] {
  const skills: string[] = [];
  const skillPatterns = [
    /class="[^"]*skill[^"]*"[^>]*>([\s\S]*?)<\//gi,
    /class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\//gi,
    /class="[^"]*badge[^"]*"[^>]*>([\s\S]*?)<\//gi,
  ];
  for (const pattern of skillPatterns) {
    for (const match of html.matchAll(pattern)) {
      const skill = (match[1] ?? '').replace(/<[^>]+>/g, '').trim();
      if (skill && skill.length < 60 && !skills.includes(skill)) {
        skills.push(skill);
      }
    }
    if (skills.length > 0) break;
  }
  return skills.slice(0, 10);
}

function extractBudget(html: string): string {
  const patterns = [
    /\$[\d,]+\s*[-–]\s*\$[\d,]+/,
    /\$[\d,]+(?:\.\d+)?(?:\s*\/\s*hr)?/,
    /budget[:\s]*\$[\d,]+/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[0].trim();
  }
  return '';
}

export async function POST(req: Request) {
  const parsed = FetchJobRequest.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request: url must be a valid URL' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { url } = parsed.data;

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProposalBot/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch job listing (HTTP ${res.status})` },
        { status: 502, headers: CORS_HEADERS },
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the job listing URL' },
      { status: 502, headers: CORS_HEADERS },
    );
  }

  const job = {
    title: extractTitle(html),
    description: extractDescription(html),
    skills: extractSkills(html),
    budget: extractBudget(html),
    platform: detectPlatform(url),
  };

  return NextResponse.json(job, { headers: CORS_HEADERS });
}
