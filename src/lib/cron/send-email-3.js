const { PrismaClient } = require('@prisma/client');

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://freelanceflow.ai';
const WAITLIST_URL = `${SITE_URL}/#waitlist`;
const BRAND_ORANGE = '#e67e22';
const BRAND_DARK = '#0f172a';

const EMAIL_3_SUBJECT = 'Coming soon: the full FreelanceFlow AI suite';

const EMAIL_3_HTML = `<!DOCTYPE html>
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
            <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">You were early. Here's what's coming next.</p>
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">The Proposal Scanner is just the start. Here's what the full FreelanceFlow AI suite will include:</p>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">&#128202; Proposal Tracker</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Know which proposals get viewed, shortlisted, or ghosted. Spot the patterns in what's winning — and double down.</p>
            </div>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">&#128236; Smart CRM</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Track every lead, follow up on the right ones, and never let a warm prospect go cold. Built for freelancers, not enterprise teams.</p>
            </div>
            <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:24px;background:#fff7ed;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">&#128184; Invoicing &amp; Revenue Tracking</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Send invoices, track payments, and see your monthly revenue — all without a spreadsheet. Integrated with the CRM so you always know where each client stands.</p>
            </div>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">Early-access members get first dibs — and a say in which features ship first. Join the waitlist and we'll notify you the moment it goes live.</p>
            <a href="${WAITLIST_URL}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Join the early-access waitlist →</a>
            <p style="margin:20px 0 0;color:#64748b;font-size:13px;">No spam. Just one email when we launch.</p>
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

const EMAIL_3_BODY = `You were early. Here's what's coming next.

The Proposal Scanner is just the start. Here's the full FreelanceFlow AI suite:

Proposal Tracker
Know which proposals get viewed, shortlisted, or ghosted. Spot the patterns in what's winning — and double down.

Smart CRM
Track every lead, follow up on the right ones, and never let a warm prospect go cold.

Invoicing & Revenue Tracking
Send invoices, track payments, and see your monthly revenue — all without a spreadsheet.

Early-access members get first dibs — and a say in which features ship first.

Join the early-access waitlist: ${WAITLIST_URL}

No spam. Just one email when we launch.`;

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
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const rows = await prisma.emailCapture.findMany({
    where: { email3SentAt: null, createdAt: { lte: cutoff } },
  });
  for (const row of rows) {
    try {
      await sendViaProxy(row.email, EMAIL_3_SUBJECT, EMAIL_3_HTML, EMAIL_3_BODY);
      await prisma.emailCapture.update({
        where: { id: row.id },
        data: { email3SentAt: new Date() },
      });
    } catch (err) {
      process.stderr.write(`email-3 failed: ${row.email} — ${err.message}\n`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`${e}\n`);
  process.exit(1);
});
