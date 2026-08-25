// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

// Neutralize server-only so the route handler can be imported in tests.
vi.mock('server-only', () => ({}));

const findManyMock = vi.fn();
const requireAuthMock = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    proposalEntry: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

vi.mock('@/lib/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

import * as voiceProfileModule from '@/lib/business/voice-profile';
import { buildVoiceProfile, type VoiceProfile } from '@/lib/business/voice-profile';
import { VoiceProfileResponse } from '@/lib/contracts/voice-profile';

const SESSION_USER = { id: 'user-1', email: 'u@example.com' } as never;

const SAFE_DEFAULT: VoiceProfile = {
  avgSentenceLen: 0,
  topOpeners: [],
  tone: 'balanced',
  sampleSize: 0,
};

afterEach(() => {
  findManyMock.mockReset();
  requireAuthMock.mockReset();
  vi.restoreAllMocks();
});

describe('GET /api/proposals/voice-profile — route behavior', () => {
  const get = () =>
    import('@/app/api/proposals/voice-profile/route').then(({ GET }) =>
      GET(new Request('http://test/api/proposals/voice-profile', { method: 'GET' })),
    );

  it('returns 200 with a profile for users with wins', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findManyMock.mockResolvedValue([
      {
        id: 'p-1',
        status: 'won',
        body: 'I shipped a thing. It worked out well for everyone involved.',
      },
      {
        id: 'p-2',
        status: 'won',
        body: 'I delivered the dashboard on time. The team was happy with the result.',
      },
    ] as never);

    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toBeDefined();

    // The profile shape matches the real helper output and parses cleanly.
    expect(VoiceProfileResponse.safeParse(body).success).toBe(true);

    // Real helper output should match what's in the body.
    const expected = buildVoiceProfile([
      { status: 'won', body: 'I shipped a thing. It worked out well for everyone involved.' },
      {
        status: 'won',
        body: 'I delivered the dashboard on time. The team was happy with the result.',
      },
    ]);
    expect(body.profile).toEqual(expected);

    // Verify the findMany was scoped by BOTH userId AND status (no IDOR).
    const call = findManyMock.mock.calls.at(-1)?.[0] as {
      where?: { userId?: string; status?: string };
    };
    expect(call?.where?.userId).toBe('user-1');
    expect(call?.where?.status).toBe('won');
  });

  it('returns 401 when requireAuth throws (no session)', async () => {
    requireAuthMock.mockRejectedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }));

    const res = await get();
    expect(res.status).toBe(401);
    // No data leak: findMany is never called before auth resolves.
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns 200 with the safe-default profile when findMany is empty (cross-user / no wins)', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    // Empty array simulates the IDOR-safe case: "no rows for me" is
    // indistinguishable from "rows exist for someone else". Scope returns [].
    findManyMock.mockResolvedValue([]);

    const res = await get();
    // NOT 404, NOT 500 — IDOR-safe list-shaped reads return 200-empty.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ profile: SAFE_DEFAULT });
    expect(VoiceProfileResponse.safeParse(body).success).toBe(true);

    // Verify the WHERE was scoped by userId AND status (no post-filter IDOR).
    const call = findManyMock.mock.calls.at(-1)?.[0] as {
      where?: { userId?: string; status?: string };
    };
    expect(call?.where?.userId).toBe('user-1');
    expect(call?.where?.status).toBe('won');
  });

  it('filters out rows missing a body before reaching buildVoiceProfile', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    // Today ProposalEntry has no body column, so all rows come back with
    // body=null/undefined. The route must filter these out before calling
    // the helper.
    findManyMock.mockResolvedValue([
      { id: 'p-1', status: 'won', body: null },
      { id: 'p-2', status: 'won', body: '' },
      { id: 'p-3', status: 'won' },
    ] as never);

    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    // With zero non-empty bodies, buildVoiceProfile receives [] -> safe default.
    expect(body).toEqual({ profile: SAFE_DEFAULT });
  });

  it('returns a non-empty topOpeners array when a fixture ProposalEntry body contains a recognizable opener', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findManyMock.mockResolvedValue([
      {
        id: 'p-1',
        status: 'won',
        body: 'I shipped the dashboard. It worked out well for everyone involved.',
      },
    ] as never);

    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.profile.topOpeners)).toBe(true);
    expect(body.profile.topOpeners.length).toBeGreaterThan(0);
    // The helper joins the first two sentence-opener tokens lowercased;
    // 'I shipped the dashboard' -> 'i shipped'.
    expect(body.profile.topOpeners).toContain('i shipped');
    expect(VoiceProfileResponse.safeParse(body).success).toBe(true);
  });

  it('returns a non-2xx status when the helper emits a malformed profile (zod rejects)', async () => {
    requireAuthMock.mockResolvedValue(SESSION_USER);
    findManyMock.mockResolvedValue([{ id: 'p-1', status: 'won', body: 'any content' }] as never);

    // Force the helper to return something that violates VoiceProfileSchema.
    vi.spyOn(voiceProfileModule, 'buildVoiceProfile').mockReturnValue({
      avgSentenceLen: 'not a number',
      topOpeners: 'not an array',
      tone: 'shouty',
      sampleSize: -1,
    } as unknown as VoiceProfile);

    const res = await get();
    // zod parse throws → let the framework's error path surface (non-2xx).
    expect(res.status).toBeGreaterThanOrEqual(500);

    // The malformed payload must NEVER be sent to the wire.
    const body = await res.json().catch(() => null);
    expect(body).not.toHaveProperty('profile');
  });
});

describe('VoiceProfileResponse — wire contract', () => {
  it('parses the safe-default shape', () => {
    expect(VoiceProfileResponse.safeParse({ profile: SAFE_DEFAULT }).success).toBe(true);
  });

  it('rejects a missing profile key', () => {
    expect(VoiceProfileResponse.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid tone value', () => {
    expect(
      VoiceProfileResponse.safeParse({
        profile: { ...SAFE_DEFAULT, tone: 'shouty' },
      }).success,
    ).toBe(false);
  });

  it('rejects non-numeric avgSentenceLen', () => {
    expect(
      VoiceProfileResponse.safeParse({
        profile: { ...SAFE_DEFAULT, avgSentenceLen: '0' },
      }).success,
    ).toBe(false);
  });
});
