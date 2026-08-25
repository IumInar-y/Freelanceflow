import 'server-only';

import type { SendEmailInput } from '@/lib/email/send';

type ConfirmationEmail = Omit<SendEmailInput, 'to'>;

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
            <p style="margin:0;color:#94a3b8;font-size:12px;">FreelanceFlow AI · You're receiving this because you activated a subscription.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function subscriptionConfirmedEmail(
  plan: 'solo' | 'pro',
  siteUrl: string,
): ConfirmationEmail {
  const capitalizedPlan = plan === 'pro' ? 'Pro' : 'Solo';
  const trackerUrl = `${siteUrl}/#proposal-tracker`;
  const supportEmail = process.env.POLSIA_OWNER_EMAIL ?? 'freelanceflow-ai@polsia.app';

  return {
    subject: `Your FreelanceFlow AI ${capitalizedPlan} plan is active`,
    html: baseHtml(`
      <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Your ${capitalizedPlan} plan is now active.</p>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">Welcome to FreelanceFlow AI. Your ${capitalizedPlan} subscription is confirmed and you're ready to go.</p>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">Head over to the Proposal Tracker to start logging your proposals and tracking which ones land.</p>
      <a href="${trackerUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;">Go to Proposal Tracker →</a>
      <p style="margin:24px 0 0;color:#64748b;font-size:13px;">Need help? Reply to this email or contact us at <a href="mailto:${supportEmail}" style="color:${BRAND_ORANGE};">${supportEmail}</a>.</p>
    `),
  };
}
