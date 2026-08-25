import 'server-only';

import type { SendEmailInput } from '@/lib/email/send';

type NurtureEmail = Omit<SendEmailInput, 'to'>;

const BRAND_ORANGE = '#e67e22';
const BRAND_DARK = '#0f172a';

function baseHtml(body: string): string {
  return `<!DOCTYPE html>
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
            ${body}
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
}

export function nurtureEmail1(siteUrl: string): NurtureEmail {
  const scannerUrl = `${siteUrl}/#scanner`;
  return {
    subject: "Here's your full proposal breakdown",
    html: baseHtml(`
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Your score is in — here's what it means.</p>
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">Proposals that score under 60 on AI likelihood get 17% fewer replies on average, per GigRadar's 2024 data. The patterns are fixable — and that's exactly what the FreelanceFlow AI rewrite tool is built to do.</p>
      <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">The biggest triggers clients notice:</p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#334155;font-size:15px;line-height:1.8;">
        <li>Generic openers that don't name the project</li>
        <li>Phrases like "I am highly experienced" instead of specific results</li>
        <li>Structured lists where a human would write a paragraph</li>
      </ul>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">The rewrite tool targets your exact issues — not a one-size-fits-all template.</p>
      <a href="${scannerUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Go rewrite it now →</a>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Takes about 30 seconds. No login required.</p>
    `),
  };
}

export function nurtureEmail2(siteUrl: string): NurtureEmail {
  const scannerUrl = `${siteUrl}/#scanner`;
  return {
    subject: 'The 5 phrases that scream ChatGPT to Upwork clients',
    html: baseHtml(`
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Clients skip proposals in under 8 seconds. These 5 openers make it easy for them.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">1. "I hope this finds you well"</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">The single most overused opener on Upwork. It signals you didn't read the job post and copy-pasted a template — clients see it dozens of times a day.</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">2. "I am a professional developer with X years of experience"</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Clients don't care how long you've been a developer — they care whether you can solve their specific problem. "Years of experience" is noise; your last relevant project is signal.</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">3. "I am very dedicated to delivering quality work"</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Everyone says this. Nobody who would actually write low-quality work admits it. This phrase fills space without telling the client anything they couldn't assume about any candidate.</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">4. "I have worked on many similar projects"</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">"Many similar" is a red flag. Which projects? What outcome? An AI generates this phrase when it has no specific example to give. Clients know — and they wonder what you're hiding.</p>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">5. "Please feel free to reach out"</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Passive closers hand the decision back to the client. Proposals that win end with a specific invitation: "Can we jump on a 15-min call this week?" drives action; "feel free to reach out" does not.</p>
      </div>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">FreelanceFlow AI flags all 5 automatically — and rewrites them into specific, client-first language.</p>
      <a href="${scannerUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Scan your next proposal →</a>
    `),
  };
}

export function nurtureEmailUpgrade(siteUrl: string): NurtureEmail {
  const signupUrl = `${siteUrl}/signup`;
  return {
    subject: 'Unlock the full FreelanceFlow AI Pro suite',
    html: baseHtml(`
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
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">📬 Smart CRM & Follow-ups</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Never let a warm lead go cold. Track every client conversation in one place with auto-reminders built for freelancers.</p>
      </div>
      <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:24px;background:#fff7ed;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">💸 Invoicing & Revenue Tracking</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Send invoices, track payments, and see your monthly freelance revenue — no spreadsheet required.</p>
      </div>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">The scanner showed you the problem. Pro fixes it — proposal by proposal.</p>
      <a href="${signupUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Get FreelanceFlow AI Pro →</a>
      <p style="margin:20px 0 0;color:#64748b;font-size:13px;">Early access pricing won't last. Lock it in now.</p>
    `),
  };
}

export function nurtureEmail3(siteUrl: string): NurtureEmail {
  const waitlistUrl = `${siteUrl}/#waitlist`;
  return {
    subject: 'Coming soon: the full FreelanceFlow AI suite',
    html: baseHtml(`
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">You were early. Here's what's coming next.</p>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">The Proposal Scanner is just the start. Here's what the full FreelanceFlow AI suite will include:</p>
      <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">📊 Proposal Tracker</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Know which proposals get viewed, shortlisted, or ghosted. Spot the patterns in what's winning — and double down.</p>
      </div>
      <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:16px;background:#fff7ed;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">📬 Smart CRM</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Track every lead, follow up on the right ones, and never let a warm prospect go cold. Built for freelancers, not enterprise teams.</p>
      </div>
      <div style="border-left:3px solid ${BRAND_ORANGE};padding:12px 16px;margin-bottom:24px;background:#fff7ed;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">💸 Invoicing & Revenue Tracking</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Send invoices, track payments, and see your monthly revenue — all without a spreadsheet. Integrated with the CRM so you always know where each client stands.</p>
      </div>
      <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.65;">Early-access members get first dibs — and a say in which features ship first. Join the waitlist and we'll notify you the moment it goes live.</p>
      <a href="${waitlistUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Join the early-access waitlist →</a>
      <p style="margin:20px 0 0;color:#64748b;font-size:13px;">No spam. Just one email when we launch.</p>
    `),
  };
}
