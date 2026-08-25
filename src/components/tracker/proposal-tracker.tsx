// @polsia:user-owned
'use client';

import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  checkoutNotConfiguredMessage,
  describeCheckoutFailure,
  isStripeNotConfigured,
} from '@/components/custom/pro-checkout-button';
import { GhostRow } from '@/components/custom/tracker/ghost-row';
import { TierBanner } from '@/components/custom/tracker/tier-banner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api-client';
import { CheckoutSessionResponseSchema } from '@/lib/contracts/checkout';
import {
  ProposalCreateResponse,
  ProposalListResponse,
  type ProposalRow,
  type ProposalStatus,
} from '@/lib/contracts/proposals';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { waitlistSchema } from '@/lib/waitlist/schema';

type FormState = {
  client: string;
  platform: string;
  dateSent: string;
  status: ProposalStatus;
  value: string;
};

const EMPTY_FORM: FormState = {
  client: '',
  platform: 'Upwork',
  dateSent: new Date().toISOString().slice(0, 10),
  status: 'pending',
  value: '',
};

const STORAGE_KEY = 'ffai_proposals';
const EMAIL_KEY = 'ffai_email';
const FREE_ROW_LIMIT = 10;
const PROPOSAL_WON_EVENT = 'proposal-won';

const PLATFORMS = ['Upwork', 'Fiverr', 'Toptal', 'Freelancer.com', 'Other'] as const;

// Heights for the blurred analytics chart placeholder (aria-hidden, stable values)
const CHART_BARS = [40, 65, 30, 80, 55, 90, 45] as const;

const PREVIEW_PRO_STORAGE_KEY = 'ffai_preview_pro';
const _GHOST_ROW_COUNT = 3;
const GHOST_ROW_INDICES = [0, 1, 2] as const;
const GHOST_ROW_KEYS = ['ghost-row-0', 'ghost-row-1', 'ghost-row-2'] as const;

function persist(rows: ProposalRow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function statusBadgeVariant(
  status: ProposalStatus,
): 'secondary' | 'outline' | 'default' | 'destructive' {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'replied':
      return 'outline';
    case 'won':
      return 'default';
    case 'lost':
      return 'destructive';
  }
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatRate(numerator: number, denominator: number) {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function ProBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
    >
      <Lock className="size-2.5" />
      Pro
    </button>
  );
}

function downloadCsv(rows: ProposalRow[]) {
  const header = ['Date Sent', 'Client', 'Platform', 'Status', 'Value'];
  const lines = rows.map((r) =>
    [r.dateSent, `"${r.client.replace(/"/g, '""')}"`, r.platform, r.status, r.value].join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'proposals.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function computePlatformBreakdown(rows: ProposalRow[]): string {
  if (rows.length === 0) return '—';
  const counts: Record<string, number> = {};
  for (const r of rows) {
    counts[r.platform] = (counts[r.platform] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return '—';
  return `${top[0]} ${Math.round((top[1] / rows.length) * 100)}%`;
}

export function ProposalTracker() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  // undefined = not yet hydrated, null = hydrated but no email, string = has email
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ProposalRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [gateEmail, setGateEmail] = useState('');
  const [gateEmailError, setGateEmailError] = useState<string | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  const { isPro } = useSubscription();

  const handleUpgradeClick = async (source: string) => {
    apiFetch('/api/analytics/upsell-click', {
      method: 'POST',
      body: JSON.stringify({ source, email: email ?? null }),
    }).catch(() => {});
    try {
      const { url } = await apiFetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro' }),
        schema: CheckoutSessionResponseSchema,
      });
      setCheckoutError(false);
      window.location.href = url;
    } catch (err) {
      setCheckoutError(isStripeNotConfigured(err));
      const { description } = describeCheckoutFailure(err);
      toast.error(description);
    }
  };

  useEffect(() => {
    const rawProposals = localStorage.getItem(STORAGE_KEY);
    if (rawProposals) {
      try {
        setRows(JSON.parse(rawProposals) as ProposalRow[]);
      } catch {
        /* ignore */
      }
    }

    const storedEmail = localStorage.getItem(EMAIL_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
      apiFetch(`/api/proposals?email=${encodeURIComponent(storedEmail)}`, {
        schema: ProposalListResponse,
      })
        .then((data) => {
          setRows(data.proposals);
          persist(data.proposals);
        })
        .catch(() => {});
    } else {
      setEmail(null);
    }
  }, []);

  // Preview-as-Pro toggle: when set in localStorage, the banner shows "Pro active" and
  // the ghost rows disappear without flipping the underlying row cap.
  const [previewAsPro, setPreviewAsPro] = useState<boolean>(false);

  useEffect(() => {
    setPreviewAsPro(localStorage.getItem(PREVIEW_PRO_STORAGE_KEY) === '1');
  }, []);

  useEffect(() => {
    const onStorage = () => {
      setPreviewAsPro(localStorage.getItem(PREVIEW_PRO_STORAGE_KEY) === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const effectiveIsPro = isPro || previewAsPro;

  const sortedRows = [...rows].sort((a, b) => b.dateSent.localeCompare(a.dateSent));
  const displayedRows = isPro ? sortedRows : sortedRows.slice(0, FREE_ROW_LIMIT);

  const totalEarnings = rows.filter((r) => r.status === 'won').reduce((s, r) => s + r.value, 0);
  const replyCount = rows.filter((r) => r.status !== 'pending').length;
  const wonCount = rows.filter((r) => r.status === 'won').length;

  // Fire view event whenever the row-cap CTA renders
  useEffect(() => {
    if (!isPro && sortedRows.length >= FREE_ROW_LIMIT) {
      apiFetch('/api/events', {
        method: 'POST',
        body: JSON.stringify({ type: 'upsell_cta_view', surface: 'row_cap' }),
      }).catch(() => {});
    }
  }, [isPro, sortedRows.length]);

  function openAdd() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(row: ProposalRow) {
    setEditingRow(row);
    setForm({
      client: row.client,
      platform: row.platform,
      dateSent: row.dateSent,
      status: row.status,
      value: String(row.value),
    });
    setDialogOpen(true);
  }

  async function handleGateSubmit() {
    if (!gateEmail.trim()) return;
    setGateEmailError(null);
    const validation = waitlistSchema.safeParse({ email: gateEmail });
    if (!validation.success) {
      setGateEmailError(validation.error.flatten().fieldErrors.email?.[0] ?? 'Invalid email');
      return;
    }
    setGateSubmitting(true);
    try {
      await apiFetch('/api/capture-email', {
        method: 'POST',
        body: JSON.stringify({ email: gateEmail, source: 'tracker_gate' }),
      });
    } catch {
      // non-blocking — still unlock
    } finally {
      setGateSubmitting(false);
    }
    localStorage.setItem(EMAIL_KEY, gateEmail);
    setEmail(gateEmail);
    apiFetch(`/api/proposals?email=${encodeURIComponent(gateEmail)}`, {
      schema: ProposalListResponse,
    })
      .then((data) => {
        setRows(data.proposals);
        persist(data.proposals);
      })
      .catch(() => {});
  }

  async function handleSubmit() {
    if (!form.client.trim() || !form.dateSent) return;
    setSaving(true);

    const value = parseFloat(form.value) || 0;

    try {
      if (editingRow) {
        const optimistic = rows.map((r) =>
          r.id === editingRow.id
            ? {
                ...r,
                client: form.client,
                platform: form.platform,
                dateSent: form.dateSent,
                status: form.status,
                value,
              }
            : r,
        );
        setRows(optimistic);
        persist(optimistic);
        setDialogOpen(false);

        if (editingRow.status !== 'won' && form.status === 'won') {
          window.dispatchEvent(
            new CustomEvent(PROPOSAL_WON_EVENT, {
              detail: { id: editingRow.id, client: form.client, value },
            }),
          );
        }

        if (email) {
          const result = await apiFetch(`/api/proposals/${editingRow.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              client: form.client,
              platform: form.platform,
              dateSent: form.dateSent,
              status: form.status,
              value,
            }),
            schema: ProposalCreateResponse,
          });
          const updated = rows.map((r) => (r.id === editingRow.id ? result.proposal : r));
          setRows(updated);
          persist(updated);
        }
      } else {
        const tempId = `local-${crypto.randomUUID()}`;
        const newRow: ProposalRow = {
          id: tempId,
          email: email ?? '',
          client: form.client,
          platform: form.platform,
          dateSent: form.dateSent,
          status: form.status,
          value,
          createdAt: new Date().toISOString(),
        };
        const optimistic = [...rows, newRow];
        setRows(optimistic);
        persist(optimistic);
        setDialogOpen(false);

        if (email) {
          const result = await apiFetch('/api/proposals', {
            method: 'POST',
            body: JSON.stringify({
              email,
              client: form.client,
              platform: form.platform,
              dateSent: form.dateSent,
              status: form.status,
              value,
            }),
            schema: ProposalCreateResponse,
          });
          const replaced = optimistic.map((r) => (r.id === tempId ? result.proposal : r));
          setRows(replaced);
          persist(replaced);
        }
      }
    } catch {
      toast.error('Failed to save — changes kept locally.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: ProposalRow) {
    const filtered = rows.filter((r) => r.id !== row.id);
    setRows(filtered);
    persist(filtered);

    if (email && !row.id.startsWith('local-')) {
      try {
        await apiFetch(`/api/proposals/${row.id}`, { method: 'DELETE' });
      } catch {
        toast.error('Failed to delete from server — removed locally.');
      }
    }
  }

  // Not yet hydrated — avoid SSR flash
  if (email === undefined) return null;

  // Email gate overlay
  if (email === null) {
    return (
      <div className="relative w-full select-none">
        {/* Ghost (blurred) tracker preview */}
        <div className="pointer-events-none space-y-6 blur-sm opacity-40" aria-hidden="true">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Proposal Tracker
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Log your sent proposals and watch your pipeline at a glance.
              </p>
            </div>
            <Button disabled size="default">
              + Add Proposal
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['Total Sent', 'Reply Rate', 'Win Rate', 'Total Earnings'].map((label) => (
              <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-2xl font-bold text-foreground">—</p>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Date Sent', 'Client', 'Platform', 'Status', 'Value', 'Actions'].map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">2024-06-0{i}</TableCell>
                    <TableCell className="text-sm font-medium">Client {i}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Upwork</TableCell>
                    <TableCell>
                      <Badge variant="secondary">pending</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">$500</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled>
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Overlay card */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-xl backdrop-blur-sm text-center space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-foreground">Unlock your Tracker</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email to access the full Proposal Tracker and sync your pipeline across
                devices.
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                value={gateEmail}
                onChange={(e) => {
                  setGateEmail(e.target.value);
                  setGateEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGateSubmit();
                }}
                placeholder="you@example.com"
                className="text-sm"
                autoFocus
              />
              {gateEmailError && (
                <p className="text-xs text-destructive text-left" role="alert">
                  {gateEmailError}
                </p>
              )}
              <Button
                type="button"
                className="w-full"
                onClick={handleGateSubmit}
                disabled={gateSubmitting || !gateEmail.trim()}
              >
                {gateSubmitting ? 'Unlocking…' : 'Unlock Free Tracker'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {checkoutError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Checkout unavailable</AlertTitle>
          <AlertDescription>{checkoutNotConfiguredMessage()}</AlertDescription>
        </Alert>
      )}
      <TierBanner
        variant={effectiveIsPro ? (previewAsPro ? 'preview-pro' : 'pro') : 'free'}
        onUpgrade={effectiveIsPro ? undefined : () => handleUpgradeClick('tier_banner')}
      />
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Proposal Tracker
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Log your sent proposals and watch your pipeline at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPro ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => downloadCsv(sortedRows)}
              className="gap-1.5"
            >
              Export CSV
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      disabled
                      className="gap-1.5 opacity-60"
                    >
                      <Lock className="size-3.5" />
                      Export CSV
                      <ProBadge onClick={() => handleUpgradeClick('export_csv')} />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to Pro to export your proposals as CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button type="button" onClick={openAdd} size="default">
            + Add Proposal
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Sent</p>
          <p className="font-display text-2xl font-bold text-foreground">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Reply Rate</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {formatRate(replyCount, rows.length)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="font-display text-2xl font-bold text-primary">
            {formatRate(wonCount, rows.length)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Earnings</p>
          <p className="font-display text-2xl font-bold text-foreground">
            {formatCurrency(totalEarnings)}
          </p>
        </div>
        {/* Platform Breakdown — Pro unlocked */}
        {isPro ? (
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Top Platform</p>
            <p className="font-display text-lg font-bold text-foreground truncate">
              {computePlatformBreakdown(rows)}
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Platform Breakdown</p>
            <p className="font-display text-2xl font-bold text-foreground blur-sm select-none">
              Upwork 60%
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-card/70">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ProBadge onClick={() => handleUpgradeClick('platform_badge')} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pro feature</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Analytics — Pro unlocked */}
      {isPro ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Advanced Analytics</p>
          <div className="flex items-end gap-2 h-16">
            {rows.length > 0
              ? sortedRows.slice(0, 7).map((r) => {
                  const maxVal = Math.max(...rows.map((x) => x.value), 1);
                  const heightPct = Math.max(8, Math.round((r.value / maxVal) * 100));
                  return (
                    <TooltipProvider key={r.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            role="img"
                            title={`${r.client}: ${formatCurrency(r.value)}`}
                            className="flex-1 rounded bg-primary/70 hover:bg-primary transition-colors cursor-default"
                            style={{ height: `${heightPct}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{r.client}</p>
                          <p className="text-xs font-semibold">{formatCurrency(r.value)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })
              : CHART_BARS.map((h) => (
                  <div
                    key={h}
                    className="flex-1 rounded bg-muted/40"
                    style={{ height: `${h}%` }}
                    aria-hidden="true"
                  />
                ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Top proposals by value · Win rate: {formatRate(wonCount, rows.length)}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
          <div className="blur-sm opacity-40 pointer-events-none select-none" aria-hidden="true">
            <p className="mb-3 text-sm font-semibold text-foreground">Advanced Analytics</p>
            <div className="flex items-end gap-2 h-16">
              {CHART_BARS.map((h) => (
                <div key={h} className="flex-1 rounded bg-primary/40" style={{ height: `${h}%` }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Earnings trend · Win rate over time
            </p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/80">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <ProBadge onClick={() => handleUpgradeClick('advanced_analytics')} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pro feature</p>
              </TooltipContent>
            </Tooltip>
            <p className="text-xs text-muted-foreground">Earnings trend, win rate &amp; more</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleUpgradeClick('advanced_analytics')}
              className="text-xs"
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Sent</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No proposals yet — click &quot;+ Add Proposal&quot; to log your first one.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {displayedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm tabular-nums">{row.dateSent}</TableCell>
                    <TableCell className="text-sm font-medium">{row.client}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.platform}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(row.status)} className="capitalize">
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(row.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(row)}
                          className="h-7 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row)}
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isPro && !previewAsPro && sortedRows.length >= FREE_ROW_LIMIT && (
                  <>
                    {GHOST_ROW_INDICES.map((i) => (
                      <GhostRow key={GHOST_ROW_KEYS[i]} index={i} />
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} className="py-3 text-center">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpgradeClick('row_limit_badge')}
                            className="text-xs"
                          >
                            <Lock className="size-3" />
                            Unlock unlimited rows
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRow ? 'Edit Proposal' : 'Add Proposal'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tracker-client">Client / Project</Label>
              <Input
                id="tracker-client"
                value={form.client}
                onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                placeholder="Acme Corp — dashboard redesign"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracker-platform">Platform</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}
              >
                <SelectTrigger id="tracker-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracker-date">Date Sent</Label>
              <Input
                id="tracker-date"
                type="date"
                value={form.dateSent}
                onChange={(e) => setForm((f) => ({ ...f, dateSent: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracker-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProposalStatus }))}
              >
                <SelectTrigger id="tracker-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tracker-value">Dollar Value</Label>
              <Input
                id="tracker-value"
                type="number"
                min="0"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !form.client.trim() || !form.dateSent}
            >
              {saving ? 'Saving…' : editingRow ? 'Save Changes' : 'Add Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
