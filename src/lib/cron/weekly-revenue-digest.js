// Weekly revenue digest — ships a one-shot summary to every active Pro/Solo subscriber.
// Runs Mondays 09:00 UTC via the cron entry in polsia.toml.
// Mirrors src/lib/cron/send-email-2.js end-to-end: own PrismaClient, own sendViaProxy(), inline
// HTML shell (no .ts imports — this script runs as plain `node src/lib/cron/weekly-revenue-digest.js`).

const { PrismaClient } = require('@prisma/client');

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://freelanceflow.ai';
const DASHBOARD_URL = `${SITE_URL}/admin/analytics/funnel`;
const BRAND_ORANGE = '#e67e22';
const BRAND_DARK = '#0f172a';

// Owner-authored one-liner — edit WEEKLY_REVENUE_NOTE each week to personalize the digest.
const THIS_WEEK_NOTE =
  process.env.WEEKLY_REVENUE_NOTE ||
  'A short operator-authored note about this week — set WEEKLY_REVENUE_NOTE.';

const SUBJECT = 'Your weekly FreelanceFlow AI revenue digest';

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatBreakdown(rows) {
  return rows.map((r) => `${WEEKDAY_NAMES_SHORT[r.weekday]} ${formatUsd(r.revenueUsd)}`).join(', ');
}

function renderHtmlShell({ mrr, totalActiveSubscribers, topSurface, weekdayBreakdown, note }) {
  const breakdownLine = formatBreakdown(weekdayBreakdown);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FreelanceFlow AI · Weekly revenue digest</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${BRAND_DARK};padding:20px 32px;">
            <span style="color:${BRAND_ORANGE};font-size:18px;font-weight:700;letter-spacing:-0.5px;">FreelanceFlow AI</span>
            <span style="color:#cbd5e1;font-size:12px;margin-left:12px;letter-spacing:0.4px;text-transform:uppercase;">Weekly digest</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Your weekly revenue digest</p>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;"><strong>New MRR this week:</strong> ${formatUsd(mrr)}</p>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;"><strong>Total active subscribers:</strong> ${totalActiveSubscribers}</p>
            <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;"><strong>Top-converting surface:</strong> ${topSurface}</p>
            <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:16px 0;">
              <p style="margin:0 0 6px;color:#0f172a;font-size:13px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;">By weekday</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${breakdownLine}</p>
            </div>
            <p style="margin:16px 0 24px;color:#334155;font-size:15px;line-height:1.65;">${note}</p>
            <a href="${DASHBOARD_URL}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Open the Pro-funnel dashboard →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">FreelanceFlow AI · You are receiving this because you are an active Pro or Solo subscriber.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderTextBody({ mrr, totalActiveSubscribers, topSurface, weekdayBreakdown, note }) {
  const breakdownLine = formatBreakdown(weekdayBreakdown);
  return `Your weekly FreelanceFlow AI revenue digest

New MRR this week: ${formatUsd(mrr)}
Total active subscribers: ${totalActiveSubscribers}
Top-converting surface: ${topSurface}

By weekday: ${breakdownLine}

${note}

Open the Pro-funnel dashboard: ${DASHBOARD_URL}

You are receiving this because you are an active Pro or Solo subscriber.`;
}

async function sendViaProxy(to, subject, html, body) {
  if (!process.env.POLSIA_API_KEY) {
    return;
  }
  const proxyUrl = process.env.POLSIA_EMAIL_PROXY_URL
    ? `${process.env.POLSIA_EMAIL_PROXY_URL.replace(/\/+$/, '').replace(/\/send$/, '')}/send`
    : 'https://polsia.com/api/proxy/email/send';
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.POLSIA_API_KEY}`,
    },
    body: JSON.stringify({ to, subject, body, html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`proxy ${res.status}: ${detail}`);
  }
}

async function gatherDigest(prisma) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  // 1) Per-weekday MRR from upgrade events in the last 7 days.
  const weekdayRows = await prisma.$queryRaw`
    SELECT EXTRACT(dow FROM "createdAt")::int AS weekday,
           COALESCE(SUM("amountUsd"), 0)::float8 AS revenue
    FROM "UpsellEvent"
    WHERE "eventType" = 'upgrade'
      AND "createdAt" >= ${sinceIso}::timestamptz
    GROUP BY 1
    ORDER BY 1
  `;
  const weekdayBreakdown = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const row = weekdayRows.find((r) => Number(r.weekday) === d);
    return { weekday: d, revenueUsd: Number(row?.revenue ?? 0) };
  });

  const newMrrUsd = weekdayBreakdown.reduce((sum, row) => sum + row.revenueUsd, 0);

  // 2) Total active paid subscribers (pro / solo).
  const totalActiveSubscribers = await prisma.userPlan.count({
    where: { plan: { in: ['pro', 'solo'] }, active: true },
  });

  // 3) Top-converting surface in window — group by UpsellEvent.source, ranked by upgrade revenue.
  const topSourceRows = await prisma.$queryRaw`
    SELECT "source",
           COALESCE(SUM(CASE WHEN "eventType" = 'upgrade' THEN "amountUsd" ELSE 0 END), 0)::float8 AS revenue
    FROM "UpsellEvent"
    WHERE "createdAt" >= ${sinceIso}::timestamptz
    GROUP BY "source"
    ORDER BY revenue DESC
    LIMIT 1
  `;
  const topSurface = topSourceRows[0]?.source ?? 'n/a';

  return { newMrrUsd, totalActiveSubscribers, topSurface, weekdayBreakdown };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const { newMrrUsd, totalActiveSubscribers, topSurface, weekdayBreakdown } =
      await gatherDigest(prisma);
    const note = THIS_WEEK_NOTE;
    const html = renderHtmlShell({
      mrr: newMrrUsd,
      totalActiveSubscribers,
      topSurface,
      weekdayBreakdown,
      note,
    });
    const text = renderTextBody({
      mrr: newMrrUsd,
      totalActiveSubscribers,
      topSurface,
      weekdayBreakdown,
      note,
    });

    const recipients = await prisma.userPlan.findMany({
      where: { plan: { in: ['pro', 'solo'] }, active: true },
      select: { email: true },
    });

    let sent = 0;
    let errors = 0;
    for (const { email } of recipients) {
      try {
        await sendViaProxy(email, SUBJECT, html, text);
        sent += 1;
      } catch (err) {
        process.stderr.write(`weekly-digest failed: ${email} — ${err.message}\n`);
        errors += 1;
      }
    }

    process.stderr.write(
      `weekly-digest sent=${sent} errors=${errors} mrr=${digest.newMrrUsd.toFixed(2)} activeSubs=${digest.totalActiveSubscribers} topSurface=${digest.topSurface}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`${e.stack || e}\n`);
  process.exit(1);
});
