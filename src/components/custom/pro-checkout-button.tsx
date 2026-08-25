'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { CheckoutSessionResponseSchema } from '@/lib/contracts/checkout';

export const CHECKOUT_SUPPORT_EMAIL = 'support@polsia.com';
export const CHECKOUT_NOT_CONFIGURED_PREFIX =
  'Payments are being set up — please try again in a few minutes, or email ';
export const CHECKOUT_NOT_CONFIGURED_SUFFIX = ' if this persists.';

export function checkoutNotConfiguredMessage(): string {
  return CHECKOUT_NOT_CONFIGURED_PREFIX + CHECKOUT_SUPPORT_EMAIL + CHECKOUT_NOT_CONFIGURED_SUFFIX;
}

export function isStripeNotConfigured(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = err.cause as { error?: unknown } | null | undefined;
  return cause?.error === 'stripe_not_configured';
}

type CheckoutFailure = {
  title: string;
  description: string;
};

const CHECKOUT_FAILURE_TITLE = 'Checkout unavailable';
const CHECKOUT_GENERIC_DESCRIPTION = 'Could not open checkout — please try again.';
const CHECKOUT_PROVIDER_DESCRIPTION =
  "We couldn't reach the payment provider. Please try again in a moment.";

export function describeCheckoutFailure(err: unknown): CheckoutFailure {
  if (err instanceof Error) {
    const cause = err.cause;
    if (cause !== null && typeof cause === 'object') {
      const code = (cause as { error?: unknown }).error;
      if (typeof code === 'string') {
        if (code === 'stripe_not_configured') {
          return {
            title: CHECKOUT_FAILURE_TITLE,
            description: checkoutNotConfiguredMessage(),
          };
        }
        if (code === 'checkout_creation_failed') {
          return {
            title: CHECKOUT_FAILURE_TITLE,
            description: CHECKOUT_PROVIDER_DESCRIPTION,
          };
        }
      }
    }
    if (/failed \(\d{3}\)/.test(err.message)) {
      return {
        title: CHECKOUT_FAILURE_TITLE,
        description: CHECKOUT_GENERIC_DESCRIPTION,
      };
    }
  }
  return {
    title: CHECKOUT_FAILURE_TITLE,
    description: CHECKOUT_GENERIC_DESCRIPTION,
  };
}

interface ProCheckoutButtonProps {
  plan?: 'pro' | 'solo';
  className?: string;
}

export function ProCheckoutButton({ plan = 'pro', className }: ProCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutErrorMsg, setCheckoutErrorMsg] = useState<string | null>(null);

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    setCheckoutErrorMsg(null);
    try {
      const { url } = await apiFetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
        schema: CheckoutSessionResponseSchema,
      });
      window.location.href = url;
    } catch (err) {
      const { description } = describeCheckoutFailure(err);
      setCheckoutErrorMsg(description);
      toast.error(description);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleUpgrade} disabled={loading} className={className}>
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            {plan === 'solo' ? 'Get Started' : 'Upgrade to Pro'}
            <ArrowRight aria-hidden="true" className="ml-2 size-4" />
          </>
        )}
      </Button>
      {checkoutErrorMsg && (
        <Alert variant="destructive" role="alert" className="max-w-md">
          <AlertTitle>Checkout unavailable</AlertTitle>
          <AlertDescription>{checkoutErrorMsg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
