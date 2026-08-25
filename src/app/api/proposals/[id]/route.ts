import 'server-only';
import { NextResponse } from 'next/server';
import {
  type ProposalCreateResponse,
  type ProposalStatus,
  UpdateProposalRequest,
} from '@/lib/contracts/proposals';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const result = UpdateProposalRequest.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const sessionUser = await getSessionUser();

  try {
    // Build ownership-scoped where clause
    const ownershipWhere = sessionUser
      ? { id, OR: [{ userId: sessionUser.id }, { userId: null }] }
      : { id };

    const row = await prisma.proposalEntry.updateMany({
      where: ownershipWhere,
      data: result.data,
    });

    if (row.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.proposalEntry.findUnique({ where: { id } });
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { userId: _uid, ...updatedData } = updated;
    const response: ProposalCreateResponse = {
      proposal: {
        ...updatedData,
        status: updated.status as ProposalStatus,
        createdAt: updated.createdAt.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sessionUser = await getSessionUser();

  try {
    // Scope deletion: authenticated users can only delete their own rows
    // (or legacy email-only rows). Unauthenticated users can delete any row
    // (the client tracks ownership via email in localStorage — legacy behaviour).
    const ownershipWhere = sessionUser
      ? { id, OR: [{ userId: sessionUser.id }, { userId: null }] }
      : { id };

    const result = await prisma.proposalEntry.deleteMany({ where: ownershipWhere });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
