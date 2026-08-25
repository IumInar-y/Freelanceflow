// Smoke test for the free-user upgrade nudge path. Mount ProposalScanner with
// apiFetch stubbed to return the sanitized eligibility shape (and a stub scan
// result) and useSubscription stubbed to a free user, drive the analyze
// handler, and assert:
//   - nudge copy renders
//   - Upgrade button renders
//   - no funnel numerics leak into document.body.textContent
//
// This complements the per-helper unit tests in scanner-funnel-match.test.ts:
// those lock the no-leak invariant at the pure-function boundary; this locks
// it at the rendered-HTML boundary for free users.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/hooks/use-subscription', () => ({
  useSubscription: () => ({ isPro: false, plan: 'free', loading: false }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

import { ProposalScanner } from '@/components/scanner/proposal-scanner';
import { apiFetch } from '@/lib/api-client';

const mockedApiFetch = apiFetch as unknown as ReturnType<typeof vi.fn>;

function makeScanResult() {
  return {
    score: 72,
    aiScore: 30,
    personalScore: 14,
    lengthScore: 8,
    ctaScore: 3,
    issues: ['Uses generic opener', 'No clear CTA'],
    suggestions: [
      { before: 'I am a developer', after: 'I built your React dashboard', reason: 'Personalize' },
    ],
  };
}

function makeEligibility(hasUpgradeSample = true) {
  return [
    { surface: 'scanner_results', hasUpgradeSample },
    { surface: 'scanner_gate', hasUpgradeSample: false },
    { surface: 'rewrite_section', hasUpgradeSample: true },
    { surface: 'billing_pricing', hasUpgradeSample: true },
    { surface: 'dashboard_cta', hasUpgradeSample: false },
  ];
}

const PROPOSAL_TEXT =
  'I am a dedicated full-stack developer with 5+ years of experience working on many projects and would love to help you bring your vision to life. Let us schedule a quick call to discuss the next steps and finalize the engagement timeline as soon as you are ready so we can move forward together.';

function setNativeValue(htmlElement: HTMLElement, value: string) {
  const proto = Object.getPrototypeOf(htmlElement) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(htmlElement, value);
  htmlElement.dispatchEvent(new Event('input', { bubbles: true }));
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  });
}

describe('scanner upgrade nudge — free-user rendered HTML smoke', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    container.remove();
    mockedApiFetch.mockReset();
    sessionStorage.clear();
  });

  it('renders the nudge card on free user with eligible surface and leaks no funnel numerics', async () => {
    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/scan-proposal' && method === 'POST') {
          return makeScanResult();
        }
        if (path === '/api/scanner/upgrade-eligibility') {
          return makeEligibility(true);
        }
        if (path === '/api/checkout') {
          return { url: 'https://checkout.example/test' };
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalScanner />);
    });

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    await act(async () => {
      setNativeValue(textarea, PROPOSAL_TEXT);
    });

    const analyzeButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Analyze Proposal',
    ) as HTMLButtonElement | undefined;
    expect(analyzeButton).toBeTruthy();
    expect(analyzeButton?.disabled).toBe(false);

    await act(async () => {
      analyzeButton?.click();
    });

    // handleAnalyze awaits delay(1750) before transitioning to results.
    await wait(1900);

    const nudgeCard = container.querySelector('[data-testid="upgrade-nudge-card"]');
    expect(nudgeCard).toBeTruthy();
    const nudgeText = nudgeCard?.textContent ?? '';
    expect(nudgeText).toContain('above average');
    expect(nudgeText).toContain('Upgrade');

    const upgradeButton = Array.from(nudgeCard?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Upgrade',
    );
    expect(upgradeButton).toBeTruthy();

    const rendered = document.body.textContent ?? '';

    // No percent symbols, no decimals — the free-user bundle should be numeric-free.
    expect(rendered).not.toMatch(/%/);
    expect(rendered).not.toMatch(/\d+\.\d+/);

    for (const forbidden of [
      'viewCount',
      'clickCount',
      'conversionRate',
      'revenueUsd',
      'upgradeCount',
    ]) {
      expect(rendered).not.toContain(forbidden);
    }

    expect(rendered).not.toMatch(/\bconvert\b\s+\d/i);
    expect(rendered).not.toMatch(/\d+\s+converts?/i);
  });

  it('does NOT render the nudge when the surface has no upgrade sample', async () => {
    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/scan-proposal' && method === 'POST') {
          return makeScanResult();
        }
        if (path === '/api/scanner/upgrade-eligibility') {
          return makeEligibility(false);
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalScanner />);
    });

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    await act(async () => {
      setNativeValue(textarea, PROPOSAL_TEXT);
    });
    const analyzeButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Analyze Proposal',
    ) as HTMLButtonElement | undefined;
    expect(analyzeButton).toBeTruthy();
    expect(analyzeButton?.disabled).toBe(false);

    await act(async () => {
      analyzeButton?.click();
    });
    await wait(1900);
    await wait(50);

    expect(container.querySelector('[data-testid="upgrade-nudge-card"]')).toBeNull();
  });
});
