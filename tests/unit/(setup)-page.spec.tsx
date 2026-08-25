// Smoke test for the marketing landing page hero CTA contract.
// Asserts the rendered-HTML boundaries that the founder relies on for
// top-of-funnel outreach:
//   - "Request Early Access" anchor targets the Scanner capture fragment
//     (regression guard against the dead mailto: that shipped in the
//     previous CTA card).
//   - The hero's primary + secondary CTAs keep their working hrefs.
//   - The hero centering wrapper carries mx-auto and the CTA row carries
//     justify-center so the button group tracks the page's center axis at
//     every breakpoint.
//
// The page is a Server Component; we mount the function-returned tree
// directly under jsdom. Heavier client islands (ProposalScanner /
// ProposalTracker / ProCheckoutButton) are stubbed so the test exercises
// only the page-level surface we own.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/scanner/proposal-scanner', () => ({
  ProposalScanner: () => null,
}));

vi.mock('@/components/tracker/proposal-tracker', () => ({
  ProposalTracker: () => null,
}));

vi.mock('@/components/custom/pro-checkout-button', () => ({
  ProCheckoutButton: () => null,
}));

import HomePage from '@/app/(setup)/page';

function findAnchorByText(
  root: ParentNode,
  predicate: (text: string) => boolean,
): HTMLAnchorElement | undefined {
  return Array.from(root.querySelectorAll('a')).find((a) =>
    predicate((a.textContent ?? '').trim()),
  );
}

describe('home page hero CTA contract', () => {
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
  });

  it('Request Early Access anchor points at the Scanner fragment', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<HomePage />);
    });

    const anchor = findAnchorByText(container, (text) => text.startsWith('Request Early Access'));
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('#proposal-scanner');
  });

  it('hero primary and secondary CTAs keep their working hrefs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<HomePage />);
    });

    const tryItFree = findAnchorByText(container, (text) => text.startsWith('Try It Free'));
    expect(tryItFree).toBeTruthy();
    expect(tryItFree?.getAttribute('href')).toBe('#proposal-scanner');

    const seeHowItWorks = findAnchorByText(container, (text) =>
      text.startsWith('See How It Works'),
    );
    expect(seeHowItWorks).toBeTruthy();
    expect(seeHowItWorks?.getAttribute('href')).toBe('/#features');
  });

  it('hero centering wrapper carries mx-auto and CTA row carries justify-center', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<HomePage />);
    });

    const heroBadge = Array.from(container.querySelectorAll('span')).find((el) =>
      (el.textContent ?? '').includes('Chrome Extension — Early Access'),
    );
    expect(heroBadge).toBeTruthy();

    const heroColumn = heroBadge?.parentElement;
    expect(heroColumn).toBeTruthy();
    const heroColumnClass = heroColumn?.getAttribute('class') ?? '';
    expect(heroColumnClass).toContain('mx-auto');
    expect(heroColumnClass).toContain('max-w-2xl');

    const ctaRow = heroColumn?.querySelector('div.mt-8');
    expect(ctaRow).toBeTruthy();
    const ctaRowClass = ctaRow?.getAttribute('class') ?? '';
    expect(ctaRowClass).toContain('justify-center');
  });
});
