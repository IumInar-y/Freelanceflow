// Upwork job-feed monitor — pure business logic.
//
// Single function boundary: `upworkClient.searchJobs(filter)`. Body is a deterministic
// mock so a future commit can swap it for a real Upwork GraphQL/REST call without touching
// callers (the cron script and any future /api route). Mock is deterministic on
// (query, category, postedAfter) so two cron runs over the same filter emit the same
// stream — and `selectNewJobs` proves nothing is re-emitted by the cursor boundary.
//
// The cron script `src/lib/cron/poll-upwork-jobs.js` inlines a mirror of these helpers
// (same pattern as `weekly-revenue-digest.js`). The mirror lives at the bottom of that
// file and is annotated with this file path so a future single-source extraction is obvious.

import { createHash } from 'node:crypto';
import { z } from 'zod';

export const SEARCH_JOBS_CONTRACT = z.object({
  query: z.string().min(1).max(200),
  category: z.string().min(1).max(64).optional(),
  postedAfter: z.date().optional(),
});

export type SearchJobsFilter = z.infer<typeof SEARCH_JOBS_CONTRACT>;

export interface UpworkJobRow {
  id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  postedAt: Date | null;
}

// Generate a short hex hash of (query|category|postedAfterIso). Used both as the
// determinism seed for the mock stream and as part of each synthetic job id so
// the same filter always produces the same five ids.
function filterHash(filter: SearchJobsFilter): string {
  const canonical = [
    filter.query,
    filter.category ?? '',
    filter.postedAfter?.toISOString() ?? '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 10);
}

export function mockSearchJobs(filter: SearchJobsFilter): UpworkJobRow[] {
  const hash = filterHash(filter);
  const postBase = filter.postedAfter ?? new Date(0);
  return Array.from({ length: 5 }, (_, i) => {
    const postedAt = new Date(postBase.getTime() + i * 60_000);
    const id = `${hash}-${i}`;
    return {
      id,
      title: `${filter.query} — sample listing ${i + 1}`,
      category: filter.category ?? null,
      description: `${filter.query}: brief from sample listing ${i + 1}. Deterministic mock; a real Upwork client will replace this with the upstream job body.`,
      postedAt,
    };
  });
}

// Pure dedup: drop everything whose `id` is <= `lastSeenJobId` in the deterministic
// id-sorted order, return the new tail. Returns [] when the cursor is already at the max.
export function selectNewJobs(
  rawJobs: UpworkJobRow[],
  lastSeenJobId: string | null,
): UpworkJobRow[] {
  const sorted = rawJobs.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!lastSeenJobId) return sorted;
  const idx = sorted.findIndex((j) => j.id === lastSeenJobId);
  if (idx === -1) return sorted;
  return sorted.slice(idx + 1);
}

interface PrismaLike {
  matchedJob: { deleteMany(args: { where: { createdAt: { lt: Date } } }): Promise<unknown> };
}

export async function pruneOlderThan24h(prisma: PrismaLike): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.matchedJob.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

export interface SavedFilterRow {
  id: string;
  userId: string | null;
  query: string;
  category: string | null;
  postedAfter: Date | null;
  lastSeenJobId: string | null;
}

export interface UpworkClientLike {
  searchJobs: (filter: SearchJobsFilter) => UpworkJobRow[];
}

export interface ProjectFilterResult {
  persistedFilterIds: string[];
  failedFilterIds: string[];
}

// Pure projection of the cron's per-filter body. Drives the third acceptance test
// (per-user error isolation) without booting Prisma: inject a client and a fake
// `searchJobs`; the helper runs the same projection the cron inlines.
export async function projectPollOneFilter(
  filters: SavedFilterRow[],
  client: UpworkClientLike,
  perFilter: (filter: SavedFilterRow, jobs: UpworkJobRow[]) => Promise<void>,
): Promise<ProjectFilterResult> {
  const persistedFilterIds: string[] = [];
  const failedFilterIds: string[] = [];
  for (const filter of filters) {
    try {
      const rawJobs = client.searchJobs(
        SEARCH_JOBS_CONTRACT.parse({
          query: filter.query,
          category: filter.category ?? undefined,
          postedAfter: filter.postedAfter ?? undefined,
        }),
      );
      const newJobs = selectNewJobs(rawJobs, filter.lastSeenJobId);
      await perFilter(filter, newJobs);
      persistedFilterIds.push(filter.id);
    } catch {
      failedFilterIds.push(filter.id);
    }
  }
  return { persistedFilterIds, failedFilterIds };
}

// Default export wires the deterministic mock. A future real-client swap only needs
// to reassign `upworkClient.searchJobs` (or replace this object).
export const upworkClient: UpworkClientLike = {
  searchJobs: mockSearchJobs,
};
