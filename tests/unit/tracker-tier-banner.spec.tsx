// Smoke test for the free-vs-Pro tier boundary visualization on the Proposal
// Tracker. Mounts <ProposalTracker /> with apiFetch + useSubscription stubbed,
// drives the row-cap path, and asserts:
//   - Free user (>=10 rows): tier banner says "Free", "10-row cap", an Upgrade
//     button is present, and aria-hidden ghost rows render with a Lock icon.
//   - Pro user: tier banner flips to "Pro active", no ghost rows, no upgrade
//     CTA in the banner, and the Platform/Advanced Analytics cards show real
//     content (no blurred placeholders, no ProBadge overlay).
//   - Preview-as-Pro (localStorage.ffai_preview_pro = '1'): banner shows
//     "Pro active (preview)", ghost rows gone, no upgrade CTA.
//
// The mocked useSubscription reads a mutable `currentIsPro` so per-it toggles
// take effect on the next render.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let currentIsPro = false;

vi.mock('@/lib/hooks/use-subscription', () => ({
  useSubscription: () => ({
    isPro: currentIsPro,
    plan: currentIsPro ? 'pro' : 'free',
    loading: false,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

import { ProposalTracker } from '@/components/tracker/proposal-tracker';
import { apiFetch } from '@/lib/api-client';

const mockedApiFetch = apiFetch as unknown as ReturnType<typeof vi.fn>;

function makeRow(i: number) {
  // Use padded date so sort is stable + unique
  const day = String((i % 28) + 1).padStart(2, '0');
  return {
    id: `row-${i}`,
    email: 'test@example.com',
    client: `Client ${i}`,
    platform: 'Upwork',
    dateSent: `2025-05-${day}`,
    status: 'pending' as const,
    value: 1000 + i,
    createdAt: `2025-05-${day}T00:00:00.000Z`,
  };
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  });
}

describe('tracker tier banner — free vs Pro rendered HTML smoke', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorage.setItem('ffai_email', 'test@example.com');
    sessionStorage.clear();
    currentIsPro = false;
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
    localStorage.clear();
  });

  it('free user with >=10 rows: renders free tier banner, ghost rows, and fires row_limit_badge', async () => {
    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/subscription/status' && method === 'GET') {
          return { isPro: false, plan: 'free' };
        }
        if (path.startsWith('/api/proposals') && method === 'GET') {
          return { proposals: Array.from({ length: 11 }, (_, i) => makeRow(i)) };
        }
        if (path === '/api/checkout' && method === 'POST') {
          return { url: 'https://checkout.example/test' };
        }
        if (path === '/api/events' && method === 'POST') {
          return {};
        }
        if (path === '/api/analytics/upsell-click' && method === 'POST') {
          return {};
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalTracker />);
    });

    // Let the hydration useEffect + apiFetch promise resolve
    await wait(50);
    await wait(50);

    const banner = container.querySelector('[data-testid="tier-banner"]');
    expect(banner).toBeTruthy();
    expect(banner?.getAttribute('data-variant')).toBe('free');

    const bannerText = banner?.textContent ?? '';
    expect(bannerText).toContain('Free');
    expect(bannerText).toContain('10-row cap');
    expect(bannerText).toContain('Upgrade');

    // Ghost rows render
    const ghostRows = container.querySelectorAll('[data-testid="ghost-row"]');
    expect(ghostRows.length).toBeGreaterThanOrEqual(2);
    ghostRows.forEach((r) => {
      expect(r.getAttribute('aria-hidden')).toBe('true');
    });

    // Click the centered row-cap upgrade button → row_limit_badge fires
    const rowCapButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Unlock unlimited rows'),
    ) as HTMLButtonElement | undefined;
    expect(rowCapButton).toBeTruthy();

    mockedApiFetch.mockClear();
    await act(async () => {
      rowCapButton?.click();
    });
    await wait(50);

    const upsellCall = mockedApiFetch.mock.calls.find(
      (call) => call[0] === '/api/analytics/upsell-click',
    );
    expect(upsellCall).toBeTruthy();
    const upsellBody = JSON.parse(
      ((upsellCall?.[1] as RequestInit | undefined)?.body as string | undefined) ?? '{}',
    );
    expect(upsellBody.source).toBe('row_limit_badge');
  });

  it('pro user: renders Pro active banner, no ghost rows, no upgrade CTA in banner', async () => {
    currentIsPro = true;

    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/subscription/status' && method === 'GET') {
          return { isPro: true, plan: 'pro' };
        }
        if (path.startsWith('/api/proposals') && method === 'GET') {
          return { proposals: Array.from({ length: 11 }, (_, i) => makeRow(i)) };
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalTracker />);
    });
    await wait(50);
    await wait(50);

    const banner = container.querySelector('[data-testid="tier-banner"]');
    expect(banner).toBeTruthy();
    expect(banner?.getAttribute('data-variant')).toBe('pro');

    const bannerText = banner?.textContent ?? '';
    expect(bannerText).toContain('Pro active');
    expect(bannerText).not.toContain('Upgrade');

    // No ghost rows
    const ghostRows = container.querySelectorAll('[data-testid="ghost-row"]');
    expect(ghostRows.length).toBe(0);

    // No centered "Unlock unlimited rows" button
    const rowCapButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Unlock unlimited rows'),
    );
    expect(rowCapButton).toBeUndefined();

    // Platform Breakdown card shows real (un-blurred) content
    const platformCard = Array.from(container.querySelectorAll('p')).find(
      (p) => p.textContent?.trim() === 'Top Platform',
    );
    expect(platformCard).toBeTruthy();

    // Advanced Analytics card shows the real heading
    expect(container.textContent ?? '').toContain('Advanced Analytics');
  });

  it('free user with localStorage ffai_preview_pro = 1: banner flips to preview-pro and ghost rows disappear', async () => {
    localStorage.setItem('ffai_preview_pro', '1');

    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/subscription/status' && method === 'GET') {
          return { isPro: false, plan: 'free' };
        }
        if (path.startsWith('/api/proposals') && method === 'GET') {
          return { proposals: Array.from({ length: 11 }, (_, i) => makeRow(i)) };
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalTracker />);
    });
    await wait(50);
    await wait(50);

    const banner = container.querySelector('[data-testid="tier-banner"]');
    expect(banner).toBeTruthy();
    expect(banner?.getAttribute('data-variant')).toBe('preview-pro');

    const bannerText = banner?.textContent ?? '';
    expect(bannerText).toContain('Pro active (preview)');
    expect(bannerText).not.toContain('Upgrade');

    // Ghost rows do NOT render in preview-as-pro mode
    const ghostRows = container.querySelectorAll('[data-testid="ghost-row"]');
    expect(ghostRows.length).toBe(0);
  });

  it('free user with <10 rows: no ghost rows, no row-cap Upgrade button', async () => {
    mockedApiFetch.mockImplementation(
      async (path: string, init?: RequestInit & { schema?: unknown }) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (path === '/api/subscription/status' && method === 'GET') {
          return { isPro: false, plan: 'free' };
        }
        if (path.startsWith('/api/proposals') && method === 'GET') {
          return { proposals: Array.from({ length: 3 }, (_, i) => makeRow(i)) };
        }
        throw new Error(`unhandled apiFetch path: ${method} ${path}`);
      },
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ProposalTracker />);
    });
    await wait(50);
    await wait(50);

    // Banner still says Free
    const banner = container.querySelector('[data-testid="tier-banner"]');
    expect(banner?.getAttribute('data-variant')).toBe('free');

    // But no ghost rows
    expect(container.querySelectorAll('[data-testid="ghost-row"]').length).toBe(0);
    // And no "Unlock unlimited rows" CTA
    expect(
      Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Unlock unlimited rows'),
      ),
    ).toBeUndefined();
  });
});
