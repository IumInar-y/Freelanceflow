'use client';

import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CHECKOUT_SUPPORT_EMAIL,
  checkoutNotConfiguredMessage,
} from '@/components/custom/pro-checkout-button';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

type State = 'verifying' | 'success' | 'error';

export default function BillingSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState<State>('verifying');
  const [plan, setPlan] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 12;

  const poll = useCallback(async () => {
    if (!sessionId) {
      setState('error');
      return;
    }

    try {
      const data = await apiFetch('/api/subscription/activate', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      const result = data as { activated?: boolean; plan?: string };
      if (result.activated) {
        try {
          sessionStorage.removeItem('ffai_pro_status');
        } catch {
          /* ignore */
        }
        setPlan(result.plan ?? null);
        setState('success');
        return;
      }
    } catch {
      // verification not ready yet — retry below
    }

    attemptsRef.current += 1;
    if (attemptsRef.current < MAX_ATTEMPTS) {
      setTimeout(poll, 1500);
    } else {
      setState('error');
    }
  }, [sessionId]);

  const errorToastFiredRef = useRef(false);
  useEffect(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    if (state === 'error' && !errorToastFiredRef.current) {
      errorToastFiredRef.current = true;
      toast.error(checkoutNotConfiguredMessage());
    }
  }, [state]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-section">
      <div className="mx-auto max-w-md text-center">
        {state === 'verifying' && (
          <>
            <Loader2 className="mx-auto mb-4 size-12 animate-spin text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              Confirming your payment…
            </h1>
            <p className="mt-3 text-muted-foreground">
              Just a moment — we&apos;re verifying your subscription.
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 size-12 text-green-500" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              You&apos;re on the {plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Pro'} plan!
            </h1>
            <p className="mt-3 text-muted-foreground">
              All Pro features are now unlocked. Head back to the Proposal Tracker to see your full
              pipeline.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/#proposal-tracker">Open Proposal Tracker</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              Couldn&apos;t confirm payment
            </h1>
            <p className="mt-3 text-muted-foreground">
              {checkoutNotConfiguredMessage()}{' '}
              <a
                href={`mailto:${CHECKOUT_SUPPORT_EMAIL}`}
                className="text-primary underline underline-offset-2"
              >
                {CHECKOUT_SUPPORT_EMAIL}
              </a>
              .
            </p>
            <Button className="mt-8" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
