import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nurtureEmail2, nurtureEmail3 } from '@/lib/email/nurture';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = env.NEXT_PUBLIC_APP_URL;
  const now = Date.now();
  const cutoff2 = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const cutoff3 = new Date(now - 5 * 24 * 60 * 60 * 1000);

  let sent2 = 0;
  let sent3 = 0;
  let errors = 0;

  const rows2 = await prisma.emailCapture.findMany({
    where: { email2SentAt: null, createdAt: { lte: cutoff2 } },
  });

  for (const row of rows2) {
    try {
      await sendEmail({ to: row.email, ...nurtureEmail2(siteUrl) });
      await prisma.emailCapture.update({
        where: { id: row.id },
        data: { email2SentAt: new Date() },
      });
      sent2++;
    } catch {
      errors++;
    }
  }

  const rows3 = await prisma.emailCapture.findMany({
    where: { email3SentAt: null, createdAt: { lte: cutoff3 } },
  });

  for (const row of rows3) {
    try {
      await sendEmail({ to: row.email, ...nurtureEmail3(siteUrl) });
      await prisma.emailCapture.update({
        where: { id: row.id },
        data: { email3SentAt: new Date() },
      });
      sent3++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ sent2, sent3, errors });
}
