const { PrismaClient } = require('@prisma/client');

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://freelanceflow.ai';
const SCANNER_URL = `${SITE_URL}/#scanner`;
const BRAND_ORANGE = '#e67e22';
const BRAND_DARK = '#0f172a';

const EMAIL_2_SUBJECT = 'The 5 phrases that scream ChatGPT to Upwork clients';

const EMAIL_2_HTML = `<!DOCTYPE html>
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
            <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Clients skip proposals in under 8 seconds. These 5 openers make it easy for them.</p>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">1. "I hope this finds you well"</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">The most overused opener on Upwork. It signals you copy-pasted a template — clients see it dozens of times a day.</p>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">2. "I am a professional developer with X years of experience"</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Clients care about your last relevant project, not how long you've been coding. Results are signal; years are noise.</p>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">3. "I am very dedicated to delivering quality work"</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Everyone says this. This phrase fills space without telling the client anything they couldn't assume about any candidate.</p>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:16px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">4. "I have worked on many similar projects"</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">An AI generates this when it has no specific example. Name the project, name the result.</p>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#0f172a;font-size:14px;font-weight:600;">5. "Please feel free to reach out"</p>
              <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Passive closers hand the decision back. "Can we jump on a 15-min call this week?" drives action. "Feel free to reach out" does not.</p>
            </div>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">FreelanceFlow AI flags all 5 automatically — and rewrites them into specific, client-first language.</p>
            <a href="${SCANNER_URL}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Scan your next proposal →</a>
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

const EMAIL_2_BODY = `Clients skip proposals in under 8 seconds. These 5 openers make it easy for them.

1. "I hope this finds you well"
The most overused opener on Upwork. It signals you copy-pasted a template — clients see it dozens of times a day.

2. "I am a professional developer with X years of experience"
Clients care about your last relevant project, not how long you've been coding. Results are signal; years are noise.

3. "I am very dedicated to delivering quality work"
Everyone says this. This phrase fills space without telling the client anything they couldn't assume about any candidate.

4. "I have worked on many similar projects"
An AI generates this when it has no specific example. Name the project, name the result.

5. "Please feel free to reach out"
Passive closers hand the decision back. "Can we jump on a 15-min call this week?" drives action.

FreelanceFlow AI flags all 5 automatically — and rewrites them into specific, client-first language.

Scan your next proposal: ${SCANNER_URL}`;

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
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const rows = await prisma.emailCapture.findMany({
    where: { email2SentAt: null, createdAt: { lte: cutoff } },
  });
  for (const row of rows) {
    try {
      await sendViaProxy(row.email, EMAIL_2_SUBJECT, EMAIL_2_HTML, EMAIL_2_BODY);
      await prisma.emailCapture.update({
        where: { id: row.id },
        data: { email2SentAt: new Date() },
      });
    } catch (err) {
      process.stderr.write(`email-2 failed: ${row.email} — ${err.message}\n`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  process.stderr.write(`${e}\n`);
  process.exit(1);
});
