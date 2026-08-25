import 'server-only';
import { NextResponse } from 'next/server';
import {
  CreateProposalRequest,
  type ProposalCreateResponse,
  type ProposalListResponse,
  type ProposalStatus,
} from '@/lib/contracts/proposals';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  const sessionUser = await getSessionUser();

  if (sessionUser) {
    // Authenticated: return all proposals for this user by userId,
    // plus any legacy email-keyed rows for their email that have no userId yet.
    const rows = await prisma.proposalEntry.findMany({
      where: {
        OR: [{ userId: sessionUser.id }, { email: sessionUser.email, userId: null }],
      },
      orderBy: { createdAt: 'asc' },
    });
    const response: ProposalListResponse = {
      proposals: rows.map(({ userId: _uid, ...r }) => ({
        ...r,
        status: r.status as ProposalStatus,
        createdAt: r.createdAt.toISOString(),
      })),
    };
    return NextResponse.json(response);
  }

  // Unauthenticated: require email query param for backward compat
  if (!email) {
    return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
  }

  const rows = await prisma.proposalEntry.findMany({
    where: { email, userId: null },
    orderBy: { createdAt: 'asc' },
  });

  const response: ProposalListResponse = {
    proposals: rows.map(({ userId: _uid, ...r }) => ({
      ...r,
      status: r.status as ProposalStatus,
      createdAt: r.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = CreateProposalRequest.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const sessionUser = await getSessionUser();

  const row = await prisma.proposalEntry.create({
    data: {
      ...result.data,
      userId: sessionUser?.id ?? null,
    },
  });

  const { userId: _uid, ...rowData } = row;
  const response: ProposalCreateResponse = {
    proposal: {
      ...rowData,
      status: row.status as ProposalStatus,
      createdAt: row.createdAt.toISOString(),
    },
  };

  return NextResponse.json(response, { status: 201 });
}
