'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api-client';
import {
  AdminAnalyticsResponse,
  AnalyticsFunnelResponse,
  type SurfaceFunnelRow,
  type UpsellEventRow,
} from '@/lib/contracts/analytics';

const dateRangeSchema = z
  .object({
    from: z.string().min(1, 'Required'),
    to: z.string().min(1, 'Required'),
  })
  .refine((v) => v.from <= v.to, { path: ['to'], message: 'To must be on or after From' });

type DateRange = z.infer<typeof dateRangeSchema>;

function isoDateDaysAgo(days: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoDateToday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_FROM = isoDateDaysAgo(30);
const DEFAULT_TO = isoDateToday();

function formatUsd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function downloadCsv(events: UpsellEventRow[]) {
  const header = ['createdAt', 'eventType', 'source', 'email', 'plan', 'amountUsd'];
  const lines = events.map((e) =>
    [
      e.createdAt,
      e.eventType,
      e.source ?? '',
      e.email ?? '',
      e.plan ?? '',
      e.amountUsd != null ? String(e.amountUsd) : '',
    ].join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'upsell-events.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<typeof AdminAnalyticsResponse._type | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [funnelItems, setFunnelItems] = useState<SurfaceFunnelRow[] | null>(null);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [funnelAppliedRange, setFunnelAppliedRange] = useState<{ from: string; to: string }>(
    null as never,
  );

  const form = useForm<DateRange>({
    resolver: zodResolver(dateRangeSchema),
    defaultValues: { from: DEFAULT_FROM, to: DEFAULT_TO },
  });

  useEffect(() => {
    apiFetch('/api/admin/analytics', { schema: AdminAnalyticsResponse })
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      });
  }, []);

  const loadFunnel = useCallback(async (values: DateRange) => {
    setFunnelError(null);
    setFunnelItems(null);
    try {
      const fromIso = new Date(`${values.from}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${values.to}T23:59:59.999Z`).toISOString();
      const res = await apiFetch(
        `/api/admin/analytics/funnel?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        { schema: AnalyticsFunnelResponse },
      );
      setFunnelItems(res.items);
      setFunnelAppliedRange({ from: values.from, to: values.to });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load funnel';
      setFunnelError(msg);
      toast.error('Could not load funnel');
    }
  }, []);

  useEffect(() => {
    void loadFunnel({ from: DEFAULT_FROM, to: DEFAULT_TO });
  }, [loadFunnel]);

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-4 w-20 rounded bg-muted/50" />
              <div className="mt-2 h-8 w-16 rounded bg-muted/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Clicks
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">
            {data.totalClicks.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Upgrades
          </p>
          <p className="mt-1 text-3xl font-bold text-primary tabular-nums">
            {data.totalUpgrades.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Conversion Rate
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">
            {formatPct(data.conversionRate)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Revenue
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground tabular-nums">
            {formatUsd(data.totalRevenueUsd)}
          </p>
        </Card>
      </div>

      {/* Upsell funnel by surface */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Upsell Funnel by Surface</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Views, clicks, upgrades, and revenue grouped by where the CTA fires.
              {funnelAppliedRange && (
                <>
                  {' '}
                  <span className="text-muted-foreground">
                    {funnelAppliedRange.from} → {funnelAppliedRange.to}
                  </span>
                </>
              )}
            </p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                void loadFunnel(values);
              })}
              className="flex items-end gap-2"
            >
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 w-40" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 w-40" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" className="h-8">
                Apply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  form.reset({ from: DEFAULT_FROM, to: DEFAULT_TO }, { keepValues: false });
                  void loadFunnel({ from: DEFAULT_FROM, to: DEFAULT_TO });
                }}
              >
                Reset
              </Button>
            </form>
          </Form>
        </div>

        {funnelError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {funnelError}
          </div>
        ) : funnelItems === null ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Upgrades</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-3 w-32 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted/50" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : funnelItems.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Upgrades</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No funnel data for this range.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Surface</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Upgrades</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelItems.map((row) => (
                  <TableRow key={row.surface}>
                    <TableCell>
                      <Badge variant="outline">{row.surface}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.viewCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.clickCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-primary">
                      {row.upgradeCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatPct(row.conversionRate)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatUsd(row.revenueUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent events table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Events{' '}
            <span className="text-muted-foreground font-normal">
              (last {data.recentEvents.length})
            </span>
          </h2>
          {data.recentEvents.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(data.recentEvents)}
              className="text-xs"
            >
              Download CSV
            </Button>
          )}
        </div>

        {data.recentEvents.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentEvents.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.eventType === 'upgrade' ? 'default' : 'secondary'}>
                        {e.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {e.source ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{e.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">{e.plan ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {e.amountUsd != null ? formatUsd(e.amountUsd) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
