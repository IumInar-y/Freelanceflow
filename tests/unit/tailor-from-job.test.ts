// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

// Neutralize server-only so the route handler can be imported in tests.
vi.mock('server-only', () => ({}));

const findFirstMock = vi.fn();
const requireAuthMock = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    matchedJob: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

import {
  composeTailoredPrompt,
  VOICE_CONTEXT_NOT_CONFIGURED,
} from '@/lib/business/tailor-from-job';
import { TailorFromJobRequest, TailorFromJobResponse } from '@/lib/contracts/tailor-from-job';

const SESSION_USER = { id: 'user-1', email: 'u@example.com' } as never;

afterEach(() => {
  findFirstMock.mockReset();
  requireAuthMock.mockReset();
});

describe('TailorFromJobRequest — request shape', () => {
  it('accepts a jobId-only body', () => {
    expect(TailorFromJobRequest.safeParse({ jobId: 'abc' }).success).toBe(true);
  });

  it('accepts an optional winsContext under the cap', () => {
    expect(
      TailorFromJobRequest.safeParse({ jobId: 'abc', winsContext: 'voice notes' }).success,
    ).toBe(true);
  });

  it('rejects an empty jobId', () => {
    expect(TailorFromJobRequest.safeParse({ jobId: '' }).success).toBe(false);
  });

  it('rejects a missing jobId', () => {
    expect(TailorFromJobRequest.safeParse({}).success).toBe(false);
  });

  it('rejects a winsContext longer than the cap', () => {
    const oversized = 'x'.repeat(2001);
    expect(TailorFromJobRequest.safeParse({ jobId: 'abc', winsContext: oversized }).success).toBe(
      false,
    );
  });
});

describe('composeTailoredPrompt — composition', () => {
  it('includes the job title verbatim', () => {
    const prompt = composeTailoredPrompt({ title: 'Next.js + Prisma rewrite for B2B SaaS' });
    expect(prompt).toContain('Next.js + Prisma rewrite for B2B SaaS');
  });

  it('includes the category when provided', () => {
    const prompt = composeTailoredPrompt({
      title: 'Build a Stripe-backed dashboard',
      category: 'Web Development',
    });
    expect(prompt).toContain('Category: Web Development');
  });

  it('omits the category line when null', () => {
    const prompt = composeTailoredPrompt({ title: 'Build a thing', category: null });
    expect(prompt).not.toContain('Category:');
  });

  it('includes the job description with title keywords when present', () => {
    const description =
      'Need a Next.js engineer to ship a multi-tenant dashboard. Must know Prisma migrations.';
    const prompt = composeTailoredPrompt({ title: 'Next.js dashboard', description });
    expect(prompt).toContain('Next.js engineer');
    expect(prompt).toContain('multi-tenant');
    expect(prompt).toContain('Prisma migrations');
  });

  it('falls back gracefully when description is null', () => {
    const prompt = composeTailoredPrompt({ title: 'A title', description: null });
    expect(prompt).toContain('(not provided)');
    expect(prompt).not.toContain('\n\nnull');
  });

  it('falls back gracefully when title is null', () => {
    const prompt = composeTailoredPrompt({ title: null });
    expect(prompt).toContain('(title not provided)');
  });

  it('includes the winsContext verbatim when provided', () => {
    const winsContext = 'Seniors-only tone; lead with the win "shipped X in Y days"; no buzzwords.';
    const prompt = composeTailoredPrompt({ title: 'Anything', winsContext });
    expect(prompt).toContain(winsContext);
    expect(prompt).toContain('Voice-context');
  });

  it('emits the [voice-context not configured] sentinel when winsContext is empty', () => {
    expect(composeTailoredPrompt({ title: 'X', winsContext: '' })).toContain(
      VOICE_CONTEXT_NOT_CONFIGURED,
    );
    expect(composeTailoredPrompt({ title: 'X' })).toContain(VOICE_CONTEXT_NOT_CONFIGURED);
    expect(composeTailoredPrompt({ title: 'X', winsContext: '   ' })).toContain(
      VOICE_CONTEXT_NOT_CONFIGURED,
    );
  });

  it('truncates a too-large description with an explicit marker', () => {
    const long = 'A'.repeat(10_000);
    const prompt = composeTailoredPrompt({ title: 'X', description: long });
    expect(prompt).toContain('[description truncated to 8000 chars]');
    expect(prompt.length).toBeLessThan(long.length + 500);
  });

  it('response schema accepts the composed output', () => {
    const prompt = composeTailoredPrompt({
      title: 'Tailor flow',
      description: 'An Upwork job description.',
      winsContext: 'voice notes',
    });
    expect(TailorFromJobResponse.safeParse({ prompt, jobId: 'job-1' }).success).toBe(true);
  });
});

describe('POST /api/proposals/tailor-from-job — route behavior', () => {
  const post = (body: unknown) =>
    import('@/app/api/proposals/tailor-from-job/route').then(({ POST }) =>
      POST(
        new Request('http://test/api/proposals/tailor-from-job', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      ),
    );

  it('returns 200 with a tailored prompt and the request jobId when the row is owned by the caller', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findFirstMock.mockResolvedValue({
      id: 'matched-1',
      title: 'Next.js dashboard for SaaS',
      category: 'Web Development',
      description: 'Need a senior Next.js engineer.',
    });

    const res = await post({ jobId: 'matched-1', winsContext: 'Lead with shipped-wins.' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobId).toBe('matched-1');
    expect(typeof body.prompt).toBe('string');
    expect(body.prompt).toContain('Next.js dashboard for SaaS');
    expect(body.prompt).toContain('Need a senior Next.js engineer.');
    expect(body.prompt).toContain('Lead with shipped-wins.');

    // verify the findFirst was scoped by both id AND userId (no IDOR).
    const call = findFirstMock.mock.calls.at(-1)?.[0] as {
      where?: { id?: string; userId?: string };
    };
    expect(call?.where?.id).toBe('matched-1');
    expect(call?.where?.userId).toBe('user-1');
  });

  it('returns 404 when the job does not exist OR belongs to a different caller (IDOR-safe)', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findFirstMock.mockResolvedValue(null);

    const res = await post({ jobId: 'does-not-exist' });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('surfaces the sentinel when the caller omits winsContext', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findFirstMock.mockResolvedValue({
      id: 'matched-2',
      title: 'Implement Oauth2 + refresh tokens',
      category: null,
      description: null,
    });

    const res = await post({ jobId: 'matched-2' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompt).toContain(VOICE_CONTEXT_NOT_CONFIGURED);
    expect(body.prompt).toContain('Implement Oauth2 + refresh tokens');
  });

  it('returns 400 on a malformed body', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    const res = await post({});
    expect(res.status).toBe(400);
  });

  it('returns 401 when requireAuth throws (no session)', async () => {
    requireAuthMock.mockRejectedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await post({ jobId: 'matched-3' });
    expect(res.status).toBe(401);
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
