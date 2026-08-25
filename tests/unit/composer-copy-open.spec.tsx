// Smoke test for the Copy Proposal + Open Job sticky action bar inside the
// proposal scanner's rewrite section. Mounts <ProposalScanner /> with apiFetch
// stubbed + useSubscription stubbed to Pro so the 3-free-rewrites cap doesn't
// trip, drives analyze → email → rewrite, and asserts:
//   - sticky action bar renders when rewriteResult is present
//   - "Copy proposal" button exists, flips to "Copied!" then back to
//     "Copy proposal" after ~2s, and writes the rewrite to clipboard
//   - "Open job in Upwork" anchor has the seeded job URL and target=_blank
//   - both Copy and Open trigger POST /api/events with the expected event types
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/hooks/use-subscription', () => ({
  useSubscription: () => ({ isPro: true, plan: 'pro', loading: false }),
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

const PROPOSAL_TEXT =
  'I am a dedicated full-stack developer with 5+ years of experience working on many projects and would love to help you bring your vision to life. Let us schedule a quick call to discuss the next steps and finalize the engagement timeline as soon as you are ready so we can move forward together.';

const REWRITTEN_TEXT = 'Polished rewrite text';
const SAVED_JOB_URL = 'https://www.upwork.com/jobs/~01abcde-0';

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

describe('composer copy/open — rewrite section sticky action bar', () => {
  let root: Root | null = null;
  let mountedContainer: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    if (mountedContainer) {
      mountedContainer.remove();
      mountedContainer = null;
    }
    mockedApiFetch.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  async function mountAndDriveRewrite(savedJobUrl: string | null) {
    if (savedJobUrl) {
      localStorage.setItem('ffai_saved_job_url', savedJobUrl);
    } else {
      localStorage.removeItem('ffai_saved_job_url');
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    mountedContainer = container;

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
    await act(async () => {
      analyzeButton?.click();
    });

    // handleAnalyze awaits delay(1750) before transitioning to results.
    await wait(1900);

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    expect(emailInput).toBeTruthy();
    await act(async () => {
      setNativeValue(emailInput, 'test@example.com');
    });
    const unlockButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Unlock Free Rewrite',
    ) as HTMLButtonElement | undefined;
    expect(unlockButton).toBeTruthy();
    await act(async () => {
      unlockButton?.click();
    });
    await wait(50);

    const rewriteButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Rewrite My Proposal',
    ) as HTMLButtonElement | undefined;
    expect(rewriteButton).toBeTruthy();
    await act(async () => {
      rewriteButton?.click();
    });

    // handleRewrite awaits delay(1750) before resolving; wait it out plus slack.
    await wait(1900);

    return container;
  }

  it('shows Copy + Open after rewrite, copies to clipboard, fires upsell events', async () => {
    const calls: Array<{ path: string; body: unknown }> = [];

    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ path: `${method} ${path}`, body });
        if (path === '/api/scan-proposal' && method === 'POST') {
          return makeScanResult();
        }
        if (path === '/api/rewrite-proposal' && method === 'POST') {
          return { rewritten: REWRITTEN_TEXT };
        }
        if (path === '/api/events' && method === 'POST') {
          return { ok: true };
        }
        throw new Error(`unhandled apiFetch call: ${method} ${path}`);
      },
    );

    const container = await mountAndDriveRewrite(SAVED_JOB_URL);

    const actionBar = container.querySelector('[data-testid="rewrite-sticky-action-bar"]');
    expect(actionBar).toBeTruthy();

    const copyButton = actionBar?.querySelector(
      '[data-testid="copy-proposal-button"]',
    ) as HTMLButtonElement | null;
    expect(copyButton).toBeTruthy();
    expect(copyButton?.textContent?.trim()).toBe('Copy proposal');

    const openLink = actionBar?.querySelector(
      '[data-testid="open-upwork-link"]',
    ) as HTMLAnchorElement | null;
    expect(openLink).toBeTruthy();
    expect(openLink?.getAttribute('href')).toBe(SAVED_JOB_URL);
    expect(openLink?.getAttribute('target')).toBe('_blank');
    expect(openLink?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(openLink?.textContent?.trim()).toContain('Open job in Upwork');

    calls.length = 0;
    await act(async () => {
      copyButton?.click();
    });

    const writeTextSpy = navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>;
    expect(writeTextSpy).toHaveBeenCalledWith(REWRITTEN_TEXT);

    // Synchronously after the click the label should flip to "Copied!".
    expect(
      (
        container.querySelector('[data-testid="copy-proposal-button"]') as HTMLButtonElement | null
      )?.textContent?.trim(),
    ).toBe('Copied!');

    // Wait past the 2000ms reset and assert the label flips back.
    await wait(2100);
    expect(
      (
        container.querySelector('[data-testid="copy-proposal-button"]') as HTMLButtonElement | null
      )?.textContent?.trim(),
    ).toBe('Copy proposal');

    const copyEventCalls = calls.filter((c) => c.path === 'POST /api/events');
    expect(copyEventCalls.length).toBeGreaterThan(0);
    expect(
      copyEventCalls.some((c) => {
        const body = c.body as { type?: string; surface?: string } | undefined;
        return body?.type === 'rewrite_copy' && body?.surface === 'rewrite_section';
      }),
    ).toBe(true);

    calls.length = 0;
    await act(async () => {
      openLink?.click();
    });

    const openEventCalls = calls.filter((c) => c.path === 'POST /api/events');
    expect(openEventCalls.length).toBeGreaterThan(0);
    expect(
      openEventCalls.some((c) => {
        const body = c.body as { type?: string; surface?: string } | undefined;
        return body?.type === 'rewrite_open_upwork' && body?.surface === 'rewrite_section';
      }),
    ).toBe(true);
  }, 15000);

  it('renders disabled Open button with tooltip when saved-job URL is missing', async () => {
    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/scan-proposal' && method === 'POST') {
          return makeScanResult();
        }
        if (path === '/api/rewrite-proposal' && method === 'POST') {
          return { rewritten: REWRITTEN_TEXT };
        }
        if (path === '/api/events' && method === 'POST') {
          return { ok: true };
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    const container = await mountAndDriveRewrite(null);

    const actionBar = container.querySelector('[data-testid="rewrite-sticky-action-bar"]');
    expect(actionBar).toBeTruthy();

    const openLink = actionBar?.querySelector('a[data-testid="open-upwork-link"]');
    expect(openLink).toBeNull();

    const disabledOpenButton = Array.from(actionBar?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Open job in Upwork',
    ) as HTMLButtonElement | undefined;
    expect(disabledOpenButton).toBeTruthy();
    expect(disabledOpenButton?.disabled).toBe(true);

    // Radix Tooltip wraps the disabled button in a <span> via `asChild` so a
    // disabled child can still receive hover/focus events. Confirm the
    // wrapper span is present in the DOM.
    expect(disabledOpenButton?.parentElement?.tagName).toBe('SPAN');
  }, 15000);
});
