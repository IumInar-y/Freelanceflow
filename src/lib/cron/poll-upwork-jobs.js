// Upwork job-feed monitor — runs every 30 minutes per polsia.toml (registered 2026-07-24).
//
// Iterates UserSavedFilter rows, calls `upworkClient.searchJobs(filter)` (currently a
// deterministic mock — see below), persists any new rows to MatchedJob, and advances
// each filter's `lastSeenJobId` cursor on success. Per-filter try/catch isolates a
// failing filter from the rest of the tick.
//
// Own PrismaClient (mirrors process-billing-events.js + weekly-revenue-digest.js);
// `npm install` is not used — `@prisma/client` ships with the deployment's
// `--include=dev` install. No `console.*` (biome noConsole: warn).
//
// Pure-logic CANONICAL COPY: src/lib/business/upwork-monitor.ts. This file inlines a
// mirror of the same helpers (mockSearchJobs, selectNewJobs, pruneOlderThan24h) because
// the cron runs as plain `node src/lib/cron/poll-upwork-jobs.js` and cannot import TS
// at runtime. The mirror lives below under "MIRROR — pure helpers"; any change to
// either copy should be applied to both until single-source extraction.

const { PrismaClient } = require('@prisma/client');
const { createHash } = require('node:crypto');

// MIRROR — pure helpers. Keep semantically identical to src/lib/business/upwork-monitor.ts.

function filterHash(filter) {
  const canonical = [
    filter.query,
    filter.category ?? '',
    filter.postedAfter instanceof Date ? filter.postedAfter.toISOString() : '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 10);
}

function mockSearchJobs(filter) {
  const hash = filterHash(filter);
  const postBase = filter.postedAfter ?? new Date(0);
  return Array.from({ length: 5 }, (_, i) => {
    const postedAt = new Date(postBase.getTime() + i * 60000);
    return {
      id: `${hash}-${i}`,
      title: `${filter.query} — sample listing ${i + 1}`,
      category: filter.category ?? null,
      description: `${filter.query}: brief from sample listing ${i + 1}. Deterministic mock; a real Upwork client will replace this with the upstream job body.`,
      postedAt,
    };
  });
}

function selectNewJobs(rawJobs, lastSeenJobId) {
  const sorted = rawJobs.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!lastSeenJobId) return sorted;
  const idx = sorted.findIndex((j) => j.id === lastSeenJobId);
  if (idx === -1) return sorted;
  return sorted.slice(idx + 1);
}

async function pruneOlderThan24h(prisma) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.matchedJob.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

const upworkClient = { searchJobs: mockSearchJobs };

async function main() {
  const prisma = new PrismaClient();
  try {
    await pruneOlderThan24h(prisma);
    const filters = await prisma.userSavedFilter.findMany({});

    let persisted = 0;
    let failed = 0;
    for (const filter of filters) {
      try {
        const rawJobs = upworkClient.searchJobs({
          query: filter.query,
          category: filter.category ?? undefined,
          postedAfter: filter.postedAfter ?? undefined,
        });
        const newJobs = selectNewJobs(rawJobs, filter.lastSeenJobId);
        if (newJobs.length) {
          await prisma.matchedJob.createMany({
            data: newJobs.map((j) => ({
              userId: filter.userId ?? undefined,
              filterId: filter.id,
              jobId: j.id,
              title: j.title ?? undefined,
              category: j.category ?? undefined,
              description: j.description ?? undefined,
              postedAt: j.postedAt ?? undefined,
            })),
          });
        }
        const newMax = newJobs.length ? newJobs[newJobs.length - 1].id : null;
        if (newMax && newMax !== filter.lastSeenJobId) {
          await prisma.userSavedFilter.update({
            where: { id: filter.id },
            data: { lastSeenJobId: newMax },
          });
        }
        persisted += 1;
      } catch (err) {
        failed += 1;
        process.stderr.write(
          `poll-upwork-jobs filter=${filter.id} failed: ${err?.message ? err.message : err}\n`,
        );
      }
    }
    process.stderr.write(
      `poll-upwork-jobs persisted=${persisted} failed=${failed} total=${filters.length}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  process.stderr.write(`${e?.stack ? e.stack : e}\n`);
  process.exit(1);
});
