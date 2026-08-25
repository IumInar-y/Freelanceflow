// @polsia:user-owned
'use client';

import { Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TierBannerVariant = 'free' | 'pro' | 'preview-pro';

interface TierBannerProps {
  variant: TierBannerVariant;
  onUpgrade?: () => void;
}

export function TierBanner({ variant, onUpgrade }: TierBannerProps) {
  if (variant === 'pro') {
    return (
      <div
        data-testid="tier-banner"
        data-variant="pro"
        className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs"
      >
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="size-3" />
        </span>
        <span className="font-semibold text-primary">Pro active</span>
      </div>
    );
  }

  if (variant === 'preview-pro') {
    return (
      <div
        data-testid="tier-banner"
        data-variant="preview-pro"
        className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs"
      >
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="size-3" />
        </span>
        <span className="font-semibold text-primary">Pro active (preview)</span>
      </div>
    );
  }

  return (
    <div
      data-testid="tier-banner"
      data-variant="free"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Lock className="size-3.5" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">You&apos;re on Free — 10-row cap</p>
          <p className="text-xs text-muted-foreground">
            Upgrade for unlimited rows, Pro badges, and platform breakdowns
          </p>
        </div>
      </div>
      {onUpgrade && (
        <Button
          type="button"
          size="sm"
          onClick={onUpgrade}
          className="shrink-0"
          data-testid="tier-banner-upgrade"
        >
          Upgrade
        </Button>
      )}
    </div>
  );
}
