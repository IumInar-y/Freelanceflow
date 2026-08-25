// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { buildVoiceProfile, type Proposal, type VoiceProfile } from '@/lib/business/voice-profile';

describe('buildVoiceProfile', () => {
  it('returns the safe default profile when the input is empty', () => {
    const profile = buildVoiceProfile([]);
    expect(profile.sampleSize).toBe(0);
    expect(profile.avgSentenceLen).toBe(0);
    expect(profile.topOpeners).toEqual([]);
    expect(profile.tone).toBe('balanced');
  });

  it('computes a profile for a small sample (<5 proposals)', () => {
    const won: Proposal[] = [
      { status: 'won', body: 'I shipped a small dashboard. The client liked the result.' },
      { status: 'won', body: 'I built a signup form. It worked the first time.' },
    ];
    const profile = buildVoiceProfile(won);
    expect(profile.sampleSize).toBe(2);
    expect(profile.topOpeners.length).toBeLessThanOrEqual(3);
    expect(['formal', 'casual', 'balanced']).toContain(profile.tone);
    expect(Number.isFinite(profile.avgSentenceLen)).toBe(true);
  });

  it('computes a profile for a large synthetic sample (>50 proposals) deterministically', () => {
    const won: Proposal[] = Array.from({ length: 60 }, () => ({
      status: 'won' as const,
      body: 'I shipped a feature. The team was happy with the result.',
    }));
    const first = buildVoiceProfile(won);
    const second = buildVoiceProfile(won);

    expect(first.sampleSize).toBe(60);
    expect(first.topOpeners.length).toBeLessThanOrEqual(3);
    expect(first.topOpeners.length).toBeGreaterThan(0);
    expect(first.avgSentenceLen).toBeGreaterThanOrEqual(1);
    expect(first.avgSentenceLen).toBeLessThanOrEqual(50);
    expect(Number.isFinite(first.avgSentenceLen)).toBe(true);
    expect(first).toEqual(second);
  });

  it('classifies tone at the formal / casual / balanced boundaries', () => {
    const formalCorpus: Proposal[] = [
      {
        status: 'won',
        body:
          'Our organization delivered a comprehensive twelve-month strategic engagement that produced measurable outcomes for the entire organization and all stakeholders involved. ' +
          'The technical implementation methodology that we adopted for this complex distributed systems integration addressed all challenging requirements throughout the entire engagement lifecycle. ' +
          'Stakeholders throughout the organization received detailed written progress reports that outlined every blocker and projected effort across all critical workstreams at quarterly intervals. ' +
          'Each engagement phase concluded with a comprehensive written archival summary suitable for inclusion in the permanent organizational record for future institutional reference.',
      },
    ];
    expect(buildVoiceProfile(formalCorpus).tone).toBe('formal');

    const casualCorpus: Proposal[] = [
      { status: 'won', body: "I shipped it. It's done. You're gonna love it." },
      { status: 'won', body: "We're rolling. Don't worry, it's working out." },
      { status: 'won', body: "I've got it. We'll be done soon. It's looking great." },
      { status: 'won', body: "I built it. It's working. You're all set." },
    ];
    expect(buildVoiceProfile(casualCorpus).tone).toBe('casual');

    const balancedCorpus: Proposal[] = [
      { status: 'won', body: "I've shipped the dashboard. The team is happy." },
      { status: 'won', body: 'Delivered a working prototype for the auth flow.' },
    ];
    expect(buildVoiceProfile(balancedCorpus).tone).toBe('balanced');
  });

  it('extracts top openers by frequency with alphabetical tiebreak', () => {
    const won: Proposal[] = [
      { status: 'won', body: 'I built the dashboard. We delivered the integration.' },
      { status: 'won', body: 'I built the auth flow. I shipped the migration.' },
      { status: 'won', body: 'I shipped the release. I built the runner.' },
    ];
    const profile = buildVoiceProfile(won);
    // Counts: i built = 3, i shipped = 2, we delivered = 1.
    // Sorted by count desc → i built first, i shipped next, we delivered last.
    expect(profile.topOpeners).toEqual(['i built', 'i shipped', 'we delivered']);
    expect(profile.topOpeners.length).toBeLessThanOrEqual(3);
    expect(profile.topOpeners.length).toBeGreaterThan(0);
  });

  it('has a stable JSON shape regardless of input size', () => {
    const won: Proposal[] = [
      { status: 'won', body: 'I shipped a thing. It worked out well for everyone involved.' },
    ];
    const profile: VoiceProfile = buildVoiceProfile(won);
    const { avgSentenceLen, topOpeners, tone, sampleSize }: VoiceProfile = profile;
    expect(typeof avgSentenceLen).toBe('number');
    expect(Array.isArray(topOpeners)).toBe(true);
    expect(['formal', 'casual', 'balanced']).toContain(tone);
    expect(typeof sampleSize).toBe('number');

    expect(Object.keys(JSON.parse(JSON.stringify(profile))).sort()).toEqual([
      'avgSentenceLen',
      'sampleSize',
      'tone',
      'topOpeners',
    ]);

    // Re-serialize a different profile and confirm the shape is lock-stable.
    const emptyKeys = Object.keys(JSON.parse(JSON.stringify(buildVoiceProfile([])))).sort();
    expect(emptyKeys).toEqual(['avgSentenceLen', 'sampleSize', 'tone', 'topOpeners']);
  });
});
