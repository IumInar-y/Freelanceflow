// @polsia:user-owned — your email templates. Edit freely.
// Pass RAW values into renderEmail(); it auto-escapes its heading/body/cta/footer on line 38 of
// templates.ts. Pre-escaping with escapeHtml() would double-escape.

import type { SendEmailInput } from '@/lib/email/send';
import { renderEmail } from '@/lib/email/templates';

type DigestEmail = Omit<SendEmailInput, 'to'>;

/**
 * Edit in place each week. Rendered as a one-line "this week" note in the digest email.
 * Pulled from process.env.WEEKLY_REVENUE_NOTE at the cron entry point.
 */
export const THIS_WEEK_NOTE_PLACEHOLDER =
  'A short operator-authored note about this week — edit WEEKLY_REVENUE_NOTE.';

export interface WeekdayRow {
  weekday: number; // 0 = Sunday … 6 = Saturday
  revenueUsd: number;
}

export interface WeeklyRevenueDigestInput {
  newMrrUsd: number;
  totalActiveSubscribers: number;
  topSurface: string;
  weekdayBreakdown: WeekdayRow[];
  note: string;
  siteUrl: string;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function formatWeekdayBreakdown(rows: WeekdayRow[]): string {
  return rows
    .map((r) => `${(WEEKDAY_NAMES[r.weekday] ?? '').slice(0, 3)} $${r.revenueUsd.toFixed(0)}`)
    .join(', ');
}

/** Build the weekly revenue digest email — subject, html shell, plain text. */
export function weeklyRevenueDigestEmail(input: WeeklyRevenueDigestInput): DigestEmail {
  const dashboardUrl = `${input.siteUrl}/admin/analytics/funnel`;
  const body = [
    `New MRR this week: $${input.newMrrUsd.toFixed(2)}`,
    `Total active subscribers: ${input.totalActiveSubscribers}`,
    `Top-converting surface: ${input.topSurface}`,
    `By weekday: ${formatWeekdayBreakdown(input.weekdayBreakdown)}`,
    input.note,
  ];
  const { html, text } = renderEmail({
    heading: 'Your weekly revenue digest',
    body,
    cta: { label: 'Open the Pro-funnel dashboard →', url: dashboardUrl },
    footer: 'You are receiving this because you are an active Pro or Solo subscriber.',
  });
  return {
    subject: 'Your weekly FreelanceFlow AI revenue digest',
    html,
    text,
  };
}
