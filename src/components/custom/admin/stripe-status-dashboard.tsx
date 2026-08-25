'use client';

import { useEffect, useState } from 'react';
import { DashboardCard } from '@/components/custom/dashboard/dashboard-card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-client';
import { StripeStatusResponse } from '@/lib/contracts/stripe-status';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StripeStatusDashboard() {
  const [data, setData] = useState<StripeStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/stripe-status', { schema: StripeStatusResponse })
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load Stripe status');
      });
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <DashboardCard
          title="Stripe"
          description="Stripe configuration status for the deployed environment."
        >
          <div className="h-12 animate-pulse rounded bg-muted/40" />
        </DashboardCard>
        <DashboardCard
          title="Billing cron sync"
          description="When the subscription events drain cron last completed a cycle."
        >
          <div className="h-12 animate-pulse rounded bg-muted/40" />
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard
        title="Stripe"
        description="Stripe configuration status for the deployed environment."
        action={
          data.ready ? (
            <Badge className="border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Ready
            </Badge>
          ) : (
            <Badge className="border-transparent bg-red-100 text-red-700 hover:bg-red-100">
              Missing env vars
            </Badge>
          )
        }
      >
        <p className="mt-4 text-xs text-muted-foreground">
          Set these in the Polsia platform env to enable checkout.
        </p>
      </DashboardCard>

      <DashboardCard
        title="Required env vars"
        description="Each must be populated for Stripe checkout to work."
      >
        <ul className="grid gap-3">
          {data.keys.map((k) => (
            <li
              key={k.name}
              className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background px-4 py-3 text-sm"
            >
              <code className="font-mono text-foreground">{k.name}</code>
              {k.present ? (
                <span className="text-xs font-medium text-emerald-700">Present</span>
              ) : (
                <span className="text-xs font-medium text-red-700">Missing</span>
              )}
            </li>
          ))}
        </ul>
      </DashboardCard>

      <DashboardCard
        title="Billing cron sync"
        description="When the subscription events drain cron last completed a cycle."
        action={
          data.lastSyncAt ? (
            <Badge variant="outline" className="border-emerald-200 text-emerald-700">
              Healthy
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-200 text-red-700">
              Never synced
            </Badge>
          )
        }
      >
        {data.lastSyncAt ? (
          <p className="text-sm text-foreground tabular-nums">{formatDateTime(data.lastSyncAt)}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Never synced</p>
        )}
      </DashboardCard>
    </div>
  );
}
