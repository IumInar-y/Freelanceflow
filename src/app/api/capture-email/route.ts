import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { nurtureEmail1 } from '@/lib/email/nurture';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const captureSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  source: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = captureSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.flatten().fieldErrors.email?.[0];
    return NextResponse.json({ errors: { email: message } }, { status: 400 });
  }

  try {
    await prisma.emailCapture.create({
      data: { email: result.data.email, source: result.data.source },
    });

    // New capture: register contact + send welcome email (fire-and-forget, failures must not affect 201)
    const siteUrl = env.NEXT_PUBLIC_APP_URL ?? 'https://freelanceflow.ai';
    void (async () => {
      try {
        // Derive the contacts endpoint from POLSIA_EMAIL_PROXY_URL
        const proxyBase = env.POLSIA_EMAIL_PROXY_URL.replace(/\/+$/, '').replace(/\/send$/, '');
        await fetch(`${proxyBase}/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.POLSIA_API_KEY ?? ''}`,
          },
          body: JSON.stringify({ email: result.data.email, source: 'signup' }),
        });
      } catch {
        // Contact registration failure is non-fatal
      }

      try {
        await sendEmail({ to: result.data.email, ...nurtureEmail1(siteUrl) });
        await prisma.emailCapture.update({
          where: { email: result.data.email },
          data: { email1SentAt: new Date() },
        });
      } catch {
        // Email send failure is non-fatal
      }
    })();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const isUniqueViolation = err instanceof Error && err.message.includes('Unique constraint');
    if (isUniqueViolation) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return NextResponse.json({ errors: { email: 'Something went wrong.' } }, { status: 500 });
  }
}
