const { PrismaClient } = require('@prisma/client');

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://freelanceflow.ai';
const SIGNUP_URL = `${SITE_URL}/signup`;
const BRAND_ORANGE = '#e67e22';
const BRAND_DARK = '#0f172a';

const SUBJECT = 'Unlock the full FreelanceFlow AI Pro suite';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FreelanceFlow AI</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${BRAND_DARK};padding:20px 32px;">
            <span style="color:${BRAND_ORANGE};font-size:18px;font-weight:700;letter-spacing:-0.5px;">FreelanceFlow AI</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">You've been using the scanner. Here's what Pro unlocks.</p>
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">Thousands of freelancers have scanned their proposals with FreelanceFlow AI. The ones winning more jobs have one thing in common: they're not just scanning — they're rewriting.</p>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">✏️ AI Proposal Rewriter</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Paste your proposal, get a rewrite that sounds human, targets the client's specific ask, and avoids every AI trigger phrase. Takes 30 seconds.</p>
            </div>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">📊 Proposal Tracker</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Know which proposals get viewed, shortlisted, or ghosted — so you can double down on what's actually landing.</p>
            </div>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">📬 Smart CRM &amp; Follow-ups</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Never let a warm lead go cold. Track every client conversation in one place with auto-reminders built for freelancers.</p>
            </div>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:24px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">💸 Invoicing &amp; Revenue Tracking</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Send invoices, track payments, and see your monthly freelance revenue — no spreadsheet required.</p>
            </div>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">The scanner showed you the problem. Pro fixes it — proposal by proposal.</p>
            <a href="${SIGNUP_URL}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Get FreelanceFlow AI Pro →</a>
            <p style="margin:20px 0 0;color:#64748b;font-size:13px;">Early access pricing won't last. Lock it in now.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">FreelanceFlow AI · You're receiving this because you scanned a proposal.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const BODY = `You've been using the scanner. Here's what Pro unlocks.

Thousands of freelancers have scanned their proposals with FreelanceFlow AI. The ones winning more jobs have one thing in common: they're not just scanning — they're rewriting.

✏️ AI Proposal Rewriter
Paste your proposal, get a rewrite that sounds human, targets the client's specific ask, and avoids every AI trigger phrase. Takes 30 seconds.

📊 Proposal Tracker
Know which proposals get viewed, shortlisted, or ghosted — so you can double down on what's actually landing.

📬 Smart CRM & Follow-ups
Never let a warm lead go cold. Track every client conversation in one place with auto-reminders built for freelancers.

💸 Invoicing & Revenue Tracking
Send invoices, track payments, and see your monthly freelance revenue — no spreadsheet required.

The scanner showed you the problem. Pro fixes it — proposal by proposal.

Get FreelanceFlow AI Pro: ${SIGNUP_URL}`;

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

async function main() {
  const prisma = new PrismaClient();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const rows = await prisma.emailCapture.findMany({
    where: { upgradeNudgeSentAt: null, createdAt: { lte: cutoff } },
  });
  for (const row of rows) {
    try {
      await sendViaProxy(row.email, SUBJECT, HTML, BODY);
      await prisma.emailCapture.update({
        where: { id: row.id },
        data: { upgradeNudgeSentAt: new Date() },
      });
    } catch (err) {
      process.stderr.write(`upgrade-nudge failed: ${row.email} — ${err.message}\n`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`${e}\n`);
  process.exit(1);
});
