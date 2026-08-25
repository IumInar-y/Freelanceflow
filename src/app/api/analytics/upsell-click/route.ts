import 'server-only';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/analytics/upsell-click
// Public (fire-and-forget) — no auth required; click may happen pre-login.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const source = typeof body?.source === 'string' ? body.source : null;
  const email = typeof body?.email === 'string' && body.email ? body.email : null;

  if (!source) {
    return Response.json({ error: 'Missing source' }, { status: 400 });
  }

  try {
    await prisma.upsellEvent.create({
      data: { eventType: 'click', source, email },
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
