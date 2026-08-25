import 'server-only';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/events
// Public (fire-and-forget) — no auth required; view may happen pre-login.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const type = typeof body?.type === 'string' ? body.type : null;
  const surface = typeof body?.surface === 'string' ? body.surface : null;
  const email = typeof body?.email === 'string' && body.email ? body.email : null;

  if (!type || !surface) {
    return Response.json({ error: 'Missing type or surface' }, { status: 400 });
  }

  try {
    await prisma.upsellEvent.create({
      data: { eventType: type, source: surface, email },
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
