'use client';

import { CheckIcon, ExternalLinkIcon, SparklesIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  checkoutNotConfiguredMessage,
  describeCheckoutFailure,
  isStripeNotConfigured,
} from '@/components/custom/pro-checkout-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { apiFetch } from '@/lib/api-client';
import {
  getUpgradeNudge,
  pickProTipCopy,
  resolveProTip,
} from '@/lib/business/scanner-funnel-match';
import { AnalyticsFunnelResponse, type SurfaceFunnelRow } from '@/lib/contracts/analytics';
import { CheckoutSessionResponseSchema } from '@/lib/contracts/checkout';
import { GenerateFromPromptResponse, RewriteProposalResponse } from '@/lib/contracts/rewrite';
import { ScanProposalResponse } from '@/lib/contracts/scan';
import { type UpgradeEligibility, UpgradeEligibilitySchema } from '@/lib/contracts/scanner-tip';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { cn } from '@/lib/utils';
import { waitlistSchema } from '@/lib/waitlist/schema';

const FUNNEL_CACHE_KEY = 'ffai_scanner_funnel';
const FUNNEL_ELIGIBILITY_CACHE_KEY = 'ffai_scanner_eligibility';
const FUNNEL_CACHE_TTL_MS = 5 * 60 * 1000;
const SCANNER_SOURCE = 'scanner_results';

interface CachedFunnel {
  items: SurfaceFunnelRow[];
  cachedAt: number;
}

interface CachedEligibility {
  items: UpgradeEligibility;
  cachedAt: number;
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score < 40
      ? 'var(--destructive)'
      : score < 70
        ? 'var(--yellow-500)'
        : score < 90
          ? 'var(--brand-500)'
          : 'var(--green-500)';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 0.6s var(--ease-out-expo)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ── Sub-score bar row ────────────────────────────────────────────────────────

function SubScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ── Rewrite section sub-component ────────────────────────────────────────────

interface RewriteSectionProps {
  originalProposal: string;
  promptText: string;
  onPromptTextChange: (v: string) => void;
  rewriteResult: string | null;
  generateResult: string | null;
  rewriteLoading: boolean;
  generateLoading: boolean;
  copiedRewrite: boolean;
  copiedGenerate: boolean;
  onRewrite: () => void;
  onGenerate: () => void;
  onCopyRewrite: () => void;
  onCopyGenerate: () => void;
  selectedOption: 'A' | 'B' | null;
  onSelectOption: (o: 'A' | 'B') => void;
  jobUrl: string | null;
  onTrackCopy: () => void;
  onTrackOpen: () => void;
}

function ProposalRewriteSection({
  originalProposal,
  promptText,
  onPromptTextChange,
  rewriteResult,
  generateResult,
  rewriteLoading,
  generateLoading,
  copiedRewrite,
  copiedGenerate,
  onRewrite,
  onGenerate,
  onCopyRewrite,
  onCopyGenerate,
  selectedOption,
  onSelectOption,
  jobUrl,
  onTrackCopy,
  onTrackOpen,
}: RewriteSectionProps) {
  const optionAActive = selectedOption === 'A';
  return (
    <div className="animate-[fade-up_0.4s_ease-out_both] space-y-6 border-t border-border pt-6">
      <p className="text-sm font-semibold text-foreground">Now let&apos;s fix it →</p>

      <div className="flex flex-wrap gap-6">
        {/* Option A — Rewrite from original */}
        <div
          className={cn(
            'min-w-0 transition-[flex-basis] duration-300 ease-out-expo',
            optionAActive ? 'basis-full' : 'basis-full sm:basis-[calc(50%-12px)]',
          )}
        >
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Option A — Rewrite from original
              </p>
              <Button
                type="button"
                onClick={() => {
                  onSelectOption('A');
                  onRewrite();
                }}
                disabled={rewriteLoading}
                size="default"
              >
                {rewriteLoading ? (
                  <>
                    <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Rewriting…
                  </>
                ) : (
                  'Rewrite My Proposal'
                )}
              </Button>

              {rewriteResult && (
                <>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Original</p>
                      <div
                        className={cn(
                          'overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap transition-[max-height] duration-300 ease-out-expo',
                          optionAActive ? 'max-h-96' : 'max-h-48',
                        )}
                      >
                        {originalProposal}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">Rewritten</p>
                      <div
                        className={cn(
                          'overflow-y-auto rounded-lg border border-primary/30 bg-card p-3 text-xs leading-relaxed whitespace-pre-wrap transition-[max-height] duration-300 ease-out-expo',
                          optionAActive ? 'max-h-96' : 'max-h-48',
                        )}
                      >
                        {rewriteResult}
                      </div>
                    </div>
                  </div>
                  <div
                    data-testid="rewrite-sticky-action-bar"
                    className="sticky bottom-2 mt-3 flex items-center justify-end gap-2 rounded-lg border border-border bg-card/90 p-2 backdrop-blur"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid="copy-proposal-button"
                      onClick={() => {
                        onCopyRewrite();
                        onTrackCopy();
                      }}
                      className="text-xs"
                    >
                      {copiedRewrite ? (
                        <>
                          <CheckIcon className="mr-1 size-3" />
                          Copied!
                        </>
                      ) : (
                        'Copy proposal'
                      )}
                    </Button>
                    {jobUrl ? (
                      <Button
                        type="button"
                        asChild
                        variant="outline"
                        size="sm"
                        onClick={() => onTrackOpen()}
                        className="text-xs"
                      >
                        <a
                          data-testid="open-upwork-link"
                          href={jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLinkIcon className="mr-1 size-3" />
                          Open job in Upwork
                        </a>
                      </Button>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              className="text-xs"
                            >
                              <ExternalLinkIcon className="mr-1 size-3" />
                              Open job in Upwork
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Job link unavailable</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Option B — Write from scratch */}
        <div
          className={cn(
            'min-w-0 transition-[flex-basis] duration-300 ease-out-expo',
            optionAActive ? 'basis-full' : 'basis-full sm:basis-[calc(50%-12px)]',
          )}
        >
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Option B — Write from scratch
              </p>
              <p className="text-sm text-muted-foreground">
                Describe the job/project and your skills
              </p>
              <Input
                placeholder="Full-stack developer applying for a React dashboard project for a SaaS startup"
                value={promptText}
                onChange={(e) => onPromptTextChange(e.target.value)}
                onFocus={() => onSelectOption('B')}
                maxLength={300}
                className="text-sm"
              />
              <Button
                type="button"
                onClick={onGenerate}
                disabled={generateLoading || promptText.trim().length < 10}
                size="default"
              >
                {generateLoading ? (
                  <>
                    <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Generating…
                  </>
                ) : (
                  'Generate Proposal'
                )}
              </Button>

              {generateResult && (
                <>
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {generateResult}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCopyGenerate}
                    className="text-xs"
                  >
                    {copiedGenerate ? (
                      <>
                        <CheckIcon className="mr-1 size-3" />
                        Copied ✓
                      </>
                    ) : (
                      'Copy'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type ScanState = 'idle' | 'loading' | 'results';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ProposalScanner() {
  const [proposal, setProposal] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ScanState>('idle');
  const [scanResult, setScanResult] = useState<ScanProposalResponse | null>(null);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [genCount, setGenCount] = useState(0);
  const [showLimitGate, setShowLimitGate] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  // Rewrite state
  const [promptText, setPromptText] = useState('');
  const [rewriteResult, setRewriteResult] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<string | null>(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [copiedRewrite, setCopiedRewrite] = useState(false);
  const [copiedGenerate, setCopiedGenerate] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [savedJobUrl, setSavedJobUrl] = useState<string | null>(null);

  // Pro tip funnel state — the scanner's recorded surface is held client-side
  // (kept out of `ProposalEntry` to avoid a schema migration); the funnel
  // response is cached in sessionStorage with the same TTL pattern as the
  // subscription status hook.
  const [funnelItems, setFunnelItems] = useState<SurfaceFunnelRow[] | null>(null);

  // Free-safe eligibility state. Wire shape is { surface, hasUpgradeSample } only.
  const [eligibilityItems, setEligibilityItems] = useState<UpgradeEligibility | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const { isPro, plan } = useSubscription();

  // Read generation counter from localStorage on mount (SSR-safe)
  useEffect(() => {
    const raw = localStorage.getItem('ffai_gen_count');
    const parsed = parseInt(raw ?? '0', 10);
    setGenCount(Number.isNaN(parsed) ? 0 : parsed);
  }, []);

  // Read the saved-job URL from localStorage on mount so the rewrite section's
  // "Open job in Upwork" CTA can deep-link back to the original Upwork listing.
  // Wrapped in try/catch because localStorage access can throw in private-mode
  // browsers. Value is expected to be a plain string Upwork job URL.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ffai_saved_job_url');
      if (raw && raw.length > 0) {
        setSavedJobUrl(raw);
      }
    } catch {
      // ignore — leave savedJobUrl as null so the tooltip fallback renders
    }
  }, []);

  // Auto-focus email input when results appear
  useEffect(() => {
    if (state === 'results' && !emailSubmitted) {
      emailInputRef.current?.focus();
    }
  }, [state, emailSubmitted]);

  // Fetch the Pro plan's surface-funnel analytics once the results panel is
  // up for a Pro caller. Free callers skip the network round-trip entirely;
  // their matcher short-circuits to null.
  useEffect(() => {
    if (state !== 'results' || !isPro || funnelItems !== null) return;

    let cancelled = false;

    try {
      const raw = sessionStorage.getItem(FUNNEL_CACHE_KEY);
      if (raw) {
        const cached: CachedFunnel = JSON.parse(raw);
        if (Date.now() - cached.cachedAt < FUNNEL_CACHE_TTL_MS) {
          setFunnelItems(cached.items);
          return;
        }
      }
    } catch {
      // ignore parse errors — fall through to fetch
    }

    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const url = `/api/admin/analytics/funnel?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&plan=pro`;

    apiFetch(url, { schema: AnalyticsFunnelResponse })
      .then((data) => {
        if (cancelled) return;
        setFunnelItems(data.items);
        try {
          const cache: CachedFunnel = { items: data.items, cachedAt: Date.now() };
          sessionStorage.setItem(FUNNEL_CACHE_KEY, JSON.stringify(cache));
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        if (!cancelled) setFunnelItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [state, isPro, funnelItems]);

  // Fetch the free-safe upgrade-eligibility once the results panel is up
  // for a non-Pro caller. The endpoint returns sanitized { surface, hasUpgradeSample }
  // rows — no viewCount/clickCount/conversionRate/revenueUsd cross the wire.
  useEffect(() => {
    if (state !== 'results' || isPro || eligibilityItems !== null) return;

    let cancelled = false;

    try {
      const raw = sessionStorage.getItem(FUNNEL_ELIGIBILITY_CACHE_KEY);
      if (raw) {
        const cached: CachedEligibility = JSON.parse(raw);
        if (Date.now() - cached.cachedAt < FUNNEL_CACHE_TTL_MS) {
          setEligibilityItems(cached.items);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }

    apiFetch('/api/scanner/upgrade-eligibility', { schema: UpgradeEligibilitySchema })
      .then((data) => {
        if (cancelled) return;
        setEligibilityItems(data);
        try {
          const cache: CachedEligibility = { items: data, cachedAt: Date.now() };
          sessionStorage.setItem(FUNNEL_ELIGIBILITY_CACHE_KEY, JSON.stringify(cache));
        } catch {
          // ignore storage errors
        }
      })
      .catch(() => {
        if (!cancelled) setEligibilityItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [state, isPro, eligibilityItems]);

  const proTip = useMemo(
    () =>
      funnelItems === null
        ? null
        : resolveProTip({
            scannerSource: SCANNER_SOURCE,
            funnelItems,
            userPlan: isPro ? 'pro' : null,
          }),
    [funnelItems, isPro],
  );

  const proTipBody = useMemo<string | null>(() => {
    if (!proTip) return null;
    const variant = pickProTipCopy(SCANNER_SOURCE, funnelItems ?? []);
    const pct = (proTip.conversionRate * 100).toFixed(1);
    switch (variant) {
      case 'strong':
        return `Steady Pro demand from this surface — your pitches are landing at ${pct}% conversion. Keep going to Pro for the full funnel trend.`;
      case 'gentle':
        return `Pro upgrades from this surface are below the average right now — Pro gives you the per-surface breakdown to find the next opportunity.`;
      case 'standard':
        return proTip.body;
    }
  }, [proTip, funnelItems]);

  const upgradeNudge = useMemo(() => {
    if (isPro) return null;
    if (state !== 'results') return null;
    if (eligibilityItems === null) return null;
    const userPlan: 'free' | 'solo' | null =
      plan === 'free' ? 'free' : plan === 'solo' ? 'solo' : null;
    return getUpgradeNudge({
      scannerSource: SCANNER_SOURCE,
      eligibility: eligibilityItems,
      userPlan,
    });
  }, [state, isPro, eligibilityItems, plan]);

  async function handleUpgradeNudge() {
    try {
      const { url } = await apiFetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro' }),
        schema: CheckoutSessionResponseSchema,
      });
      window.location.href = url;
    } catch (err) {
      if (isStripeNotConfigured(err)) {
        toast.error(checkoutNotConfiguredMessage());
      } else {
        const { description } = describeCheckoutFailure(err);
        toast.error(description);
      }
    }
  }

  async function handleAnalyze() {
    if (!proposal.trim() || state === 'loading') return;
    setError(null);
    setState('loading');

    try {
      const [result] = await Promise.all([
        apiFetch('/api/scan-proposal', {
          method: 'POST',
          body: JSON.stringify({ proposal }),
          schema: ScanProposalResponse,
        }),
        delay(1750),
      ]);
      setScanResult(result);
      setState('results');
    } catch {
      setError('Scan failed — please try again.');
      setState('idle');
    }
  }

  async function handleEmailSubmit() {
    if (!email.trim()) return;
    setEmailError(null);
    const validation = waitlistSchema.safeParse({ email });
    if (!validation.success) {
      setEmailError(validation.error.flatten().fieldErrors.email?.[0] ?? 'Invalid email');
      return;
    }
    try {
      await apiFetch('/api/capture-email', {
        method: 'POST',
        body: JSON.stringify({ email, source: 'scanner_gate' }),
      });
    } catch {
      // capture failure is non-blocking — still unlock the rewrite
    }
    localStorage.setItem('ffai_email', email);
    setEmailSubmitted(true);
  }

  async function handleRewrite() {
    if (rewriteLoading) return;
    setSelectedOption('A');
    if (!isPro && genCount >= 3) {
      setShowLimitGate(true);
      return;
    }
    setRewriteLoading(true);
    try {
      const [result] = await Promise.all([
        apiFetch('/api/rewrite-proposal', {
          method: 'POST',
          body: JSON.stringify({ email, proposal, issues: scanResult?.issues }),
          schema: RewriteProposalResponse,
        }),
        delay(1750),
      ]);
      setRewriteResult(result.rewritten);
      const next = genCount + 1;
      setGenCount(next);
      localStorage.setItem('ffai_gen_count', String(next));
    } catch {
      setError('Rewrite failed — please try again.');
    } finally {
      setRewriteLoading(false);
    }
  }

  async function handleGenerate() {
    if (!promptText.trim() || generateLoading) return;
    if (!isPro && genCount >= 3) {
      setShowLimitGate(true);
      return;
    }
    setGenerateLoading(true);
    try {
      const [result] = await Promise.all([
        apiFetch('/api/generate-from-prompt', {
          method: 'POST',
          body: JSON.stringify({ email, prompt: promptText }),
          schema: GenerateFromPromptResponse,
        }),
        delay(1750),
      ]);
      setGenerateResult(result.generated);
      const next = genCount + 1;
      setGenCount(next);
      localStorage.setItem('ffai_gen_count', String(next));
    } catch {
      setError('Generation failed — please try again.');
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleCopyRewrite() {
    if (!rewriteResult) return;
    await navigator.clipboard.writeText(rewriteResult).catch(() => {});
    setCopiedRewrite(true);
    setTimeout(() => setCopiedRewrite(false), 2000);
  }

  async function handleCopyGenerate() {
    if (!generateResult) return;
    await navigator.clipboard.writeText(generateResult).catch(() => {});
    setCopiedGenerate(true);
    setTimeout(() => setCopiedGenerate(false), 1500);
  }

  // Upsell-event fire-and-forget posts. Mirrors proposal-tracker.tsx:168-171 —
  // never await, never throw, swallow the error with .catch so a flapping
  // analytics endpoint never breaks the Copy/Open UX.
  function trackRewriteCopy() {
    apiFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({ type: 'rewrite_copy', surface: 'rewrite_section' }),
    }).catch(() => {});
  }

  function trackRewriteOpenUpwork() {
    apiFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({ type: 'rewrite_open_upwork', surface: 'rewrite_section' }),
    }).catch(() => {});
  }

  const canAnalyze = proposal.trim().length >= 50 && state !== 'loading';
  const canSubmitEmail = email.trim().length > 0 && !emailSubmitted;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Instantly Score Your Proposals
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste any freelance proposal to detect AI-sounding language, weak personalization, and
          missed CTAs.
        </p>
      </div>

      {/* Input area — always visible until results */}
      {state === 'idle' || state === 'loading' ? (
        <div className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Paste your freelance proposal here…&#10;&#10;E.g. &quot;Hi, I hope this message finds you well. I am a professional developer with 5+ years of experience. I have worked on many projects and I am very dedicated to delivering quality work on time…&quot;"
            className="min-h-[180px] resize-y text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyze();
            }}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {proposal.length}/2000 chars · Ctrl+Enter to analyze
            </span>
            <Button onClick={handleAnalyze} disabled={!canAnalyze} size="default">
              {state === 'loading' ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Analyzing…
                </>
              ) : (
                'Analyze Proposal'
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Results panel ── */}
      {state === 'results' && scanResult ? (
        <div className="space-y-6">
          {/* Score + sub-scores */}
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <ScoreRing score={scanResult.score} />
            <div className="flex-1 space-y-3 sm:pt-2">
              <SubScoreBar label="AI Likelihood" value={scanResult.aiScore} max={65} />
              <SubScoreBar label="Personalization" value={scanResult.personalScore} max={20} />
              <SubScoreBar label="Length" value={scanResult.lengthScore} max={10} />
              <SubScoreBar label="CTA" value={scanResult.ctaScore} max={5} />
            </div>
          </div>

          {/* Pro tip — only renders when the user's most-converting Pro
              surface matches the scanner's recorded surface for this job.
              Free users and non-matches fall through and render nothing. */}
          {proTip ? (
            <div className="flex items-start gap-3 rounded-lg border border-brand-500/30 bg-brand-50/40 p-4 dark:bg-brand-900/20">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-brand-500/50 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300"
                  >
                    Pro tip
                  </Badge>
                  <span className="text-xs font-medium text-brand-700 dark:text-brand-300">
                    {proTip.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {proTipBody ?? proTip.body}
                </p>
              </div>
            </div>
          ) : null}

          {upgradeNudge ? (
            <div
              data-testid="upgrade-nudge-card"
              className="flex items-center justify-between gap-3 rounded-lg border border-brand-500/30 bg-brand-50/40 p-4 dark:bg-brand-900/20"
            >
              <div className="flex items-start gap-3">
                <SparklesIcon className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <p className="text-xs leading-relaxed text-foreground">{upgradeNudge.copy}</p>
              </div>
              <Button type="button" size="sm" onClick={handleUpgradeNudge} className="shrink-0">
                Upgrade
              </Button>
            </div>
          ) : null}

          {/* Issues */}
          {scanResult.issues.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Issues Detected
              </p>
              <div className="flex flex-wrap gap-2">
                {scanResult.issues.map((issue) => (
                  <Badge key={issue} variant="outline" className="text-xs font-normal">
                    {issue}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions — revealed after email submission */}
          {emailSubmitted && scanResult.suggestions.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">
                3 Quick Wins — Apply These Now
              </p>
              <div className="space-y-4">
                {scanResult.suggestions.map((s, idx) => (
                  <div
                    key={`${s.before.slice(0, 20)}-${idx}`}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Suggestion {idx + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.reason}</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground line-through opacity-60">
                        {s.before}
                      </p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        {s.after}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email gate */}
          {!emailSubmitted ? (
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="mb-1 text-sm font-semibold text-foreground">Unlock the full rewrite</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Enter your email to get a full AI rewrite targeting your exact issues — or generate
                a fresh proposal from scratch.
              </p>
              <div className="flex gap-2">
                <Input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="you@example.com"
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEmailSubmit();
                  }}
                />
                <Button onClick={handleEmailSubmit} disabled={!canSubmitEmail} size="default">
                  Unlock Free Rewrite
                </Button>
              </div>
              {emailError && (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>
          ) : null}

          {/* Rewrite section — revealed after email submission */}
          {emailSubmitted && scanResult ? (
            showLimitGate ? (
              <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  You&apos;ve used your 3 free rewrites.
                </p>
                <p className="text-xs text-muted-foreground">
                  Unlock unlimited proposals with a plan →
                </p>
                <Button
                  type="button"
                  size="default"
                  onClick={async () => {
                    try {
                      const { url } = await apiFetch('/api/checkout', {
                        method: 'POST',
                        body: JSON.stringify({ plan: 'pro' }),
                        schema: CheckoutSessionResponseSchema,
                      });
                      setCheckoutError(false);
                      window.location.href = url;
                    } catch (err) {
                      if (isStripeNotConfigured(err)) {
                        setCheckoutError(true);
                        toast.error(checkoutNotConfiguredMessage());
                      } else {
                        toast.error('Could not open checkout — please try again.');
                      }
                    }
                  }}
                >
                  See Pricing Plans
                </Button>
                {checkoutError && (
                  <Alert variant="destructive" className="max-w-md mx-auto text-left">
                    <AlertTitle>Checkout unavailable</AlertTitle>
                    <AlertDescription>{checkoutNotConfiguredMessage()}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <ProposalRewriteSection
                originalProposal={proposal}
                promptText={promptText}
                onPromptTextChange={setPromptText}
                rewriteResult={rewriteResult}
                generateResult={generateResult}
                rewriteLoading={rewriteLoading}
                generateLoading={generateLoading}
                copiedRewrite={copiedRewrite}
                copiedGenerate={copiedGenerate}
                onRewrite={handleRewrite}
                onGenerate={handleGenerate}
                onCopyRewrite={handleCopyRewrite}
                onCopyGenerate={handleCopyGenerate}
                selectedOption={selectedOption}
                onSelectOption={setSelectedOption}
                jobUrl={savedJobUrl}
                onTrackCopy={trackRewriteCopy}
                onTrackOpen={trackRewriteOpenUpwork}
              />
            )
          ) : null}

          {error && emailSubmitted && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Reset */}
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setState('idle');
                setProposal('');
                setScanResult(null);
                setEmailSubmitted(false);
                setEmail('');
                setError(null);
                setEmailError(null);
                setShowLimitGate(false);
                setPromptText('');
                setRewriteResult(null);
                setGenerateResult(null);
                setRewriteLoading(false);
                setGenerateLoading(false);
                setCopiedRewrite(false);
                setCopiedGenerate(false);
                setSelectedOption(null);
                setFunnelItems(null);
                try {
                  sessionStorage.removeItem(FUNNEL_CACHE_KEY);
                } catch {
                  // ignore storage errors
                }
              }}
              className="text-xs"
            >
              Scan another proposal
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
