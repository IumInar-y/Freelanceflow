// @polsia:user-owned
'use client';

import { useEffect, useState } from 'react';
import type { z } from 'zod';
import { DashboardCard } from '@/components/custom/dashboard/dashboard-card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { VoiceProfileResponse } from '@/lib/contracts/voice-profile';

type Profile = z.infer<typeof VoiceProfileResponse>['profile'];

interface State {
  profile: Profile | null;
  error: string | null;
}

const TONE_VARIANT: Record<Profile['tone'], 'outline' | 'secondary' | 'default'> = {
  formal: 'outline',
  casual: 'secondary',
  balanced: 'default',
};

export function VoiceProfileCard() {
  const [state, setState] = useState<State>({ profile: null, error: null });

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/proposals/voice-profile', { schema: VoiceProfileResponse })
      .then((data) => {
        if (!cancelled) setState({ profile: data.profile, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Request failed';
        setState({ profile: null, error: msg });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardCard
      title="Voice fingerprint"
      description="Built from your won proposals; updates as you mark new ones."
    >
      {state.error ? (
        <p className="text-sm text-muted-foreground">Could not load voice profile.</p>
      ) : !state.profile ? (
        <p className="text-sm text-muted-foreground">Loading voice profile…</p>
      ) : state.profile.sampleSize === 0 ? (
        <p className="text-sm text-muted-foreground">
          No won proposals yet — your fingerprint builds as proposals are marked won.
        </p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg sentence length
            </dt>
            <dd className="text-2xl font-semibold tabular-nums text-foreground">
              {state.profile.avgSentenceLen.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">words</span>
            </dd>
          </div>

          <div className="grid gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tone
            </dt>
            <dd>
              <Badge variant={TONE_VARIANT[state.profile.tone]}>{state.profile.tone}</Badge>
            </dd>
          </div>

          <div className="grid gap-1 sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Top openers
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {state.profile.topOpeners.map((opener) => (
                <Badge key={opener} variant="outline">
                  {opener}
                </Badge>
              ))}
            </dd>
          </div>

          <div className="grid gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sample size
            </dt>
            <dd className="text-2xl font-semibold tabular-nums text-foreground">
              {state.profile.sampleSize}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {state.profile.sampleSize === 1 ? 'proposal' : 'proposals'}
              </span>
            </dd>
          </div>
        </dl>
      )}
    </DashboardCard>
  );
}
