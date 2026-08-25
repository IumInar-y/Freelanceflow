import { describe, expect, it } from 'vitest';
import {
  THIS_WEEK_NOTE_PLACEHOLDER,
  weeklyRevenueDigestEmail,
} from '@/lib/email/weekly-revenue-digest';

const SITE_URL = 'https://example.test';

const baseInput = {
  newMrrUsd: 1234.56,
  totalActiveSubscribers: 42,
  topSurface: 'platform_badge',
  weekdayBreakdown: [
    { weekday: 0, revenueUsd: 50 },
    { weekday: 1, revenueUsd: 200 },
    { weekday: 2, revenueUsd: 175.5 },
    { weekday: 3, revenueUsd: 300 },
    { weekday: 4, revenueUsd: 250 },
    { weekday: 5, revenueUsd: 184.06 },
    { weekday: 6, revenueUsd: 75 },
  ],
  note: 'Test note',
  siteUrl: SITE_URL,
};

describe('weeklyRevenueDigestEmail', () => {
  it('returns a non-empty subject that signals a weekly digest', () => {
    const result = weeklyRevenueDigestEmail(baseInput);
    expect(result.subject).toMatch(/^Your weekly/i);
    expect(result.subject).toContain('digest');
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it('renders the digest body fields into the html (with $ entity-encoded)', () => {
    const result = weeklyRevenueDigestEmail(baseInput);
    // expect 1234.56 → "$1234.56" via ($amount.toFixed(2)); dollar sign stays literal so we assert
    // the rendered numeric portion rather than the dollar sign.
    expect(result.html).toContain('1234.56');
    expect(result.html).toContain('Total active subscribers');
    expect(result.html).toContain('42');
    expect(result.html).toContain('platform_badge');
    expect(result.html).toContain('By weekday');
    expect(result.html).toContain('Test note');
  });

  it('escapes an XSS payload instead of injecting a <script> tag', () => {
    const result = weeklyRevenueDigestEmail({
      ...baseInput,
      topSurface: '<script>alert(1)</script>',
    });
    // renderEmail auto-escapes via escapeHtml, so the literal angle brackets become entities.
    expect(result.html).not.toContain('<script>alert(1)</script>');
    expect(result.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders a plain-text body suitable for non-html clients', () => {
    const result = weeklyRevenueDigestEmail(baseInput);
    expect(result.text).toContain('New MRR this week: $1234.56');
    expect(result.text).toContain('Total active subscribers: 42');
    expect(result.text).toContain('Top-converting surface: platform_badge');
    expect(result.text).toContain('By weekday:');
    expect(result.text).toContain('Test note');
  });

  it('keeps THIS_WEEK_NOTE_PLACEHOLDER as a non-empty editable string', () => {
    expect(typeof THIS_WEEK_NOTE_PLACEHOLDER).toBe('string');
    expect(THIS_WEEK_NOTE_PLACEHOLDER.length).toBeGreaterThan(0);
  });
});
