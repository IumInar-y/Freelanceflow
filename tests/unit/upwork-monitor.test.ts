// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  mockSearchJobs,
  projectPollOneFilter,
  type SavedFilterRow,
  type SearchJobsFilter,
  selectNewJobs,
  type UpworkJobRow,
  upworkClient,
} from '@/lib/business/upwork-monitor';

const filter: SearchJobsFilter = { query: 'nextjs', category: 'eng' };

describe('upworkClient.searchJobs — filter→mock-job match + determinism', () => {
  it('returns jobs whose category matches the filter and postedAt is at-or-after postedAfter', () => {
    const postedAfter = new Date('2026-07-24T00:00:00Z');
    const jobs = upworkClient.searchJobs({ query: 'nextjs', category: 'eng', postedAfter });
    expect(jobs.length).toBeGreaterThan(0);
    for (const j of jobs) {
      expect(j.category).toBe('eng');
      expect(j.postedAt).not.toBeNull();
      expect(j.postedAt?.getTime()).toBeGreaterThanOrEqual(postedAfter.getTime());
    }
  });

  it('falls back to category=null when filter omits category', () => {
    const jobs = mockSearchJobs({ query: 'react' });
    expect(jobs.length).toBeGreaterThan(0);
    for (const j of jobs) expect(j.category).toBeNull();
  });

  it('returns the SAME ids for two calls with identical filters (deterministic property)', () => {
    const a = upworkClient.searchJobs(filter);
    const b = upworkClient.searchJobs(filter);
    expect(a.map((j) => j.id)).toEqual(b.map((j) => j.id));
  });

  it('returns DIFFERENT ids for different filters (no collisions across filters)', () => {
    const a = upworkClient.searchJobs({ query: 'nextjs', category: 'eng' });
    const b = upworkClient.searchJobs({ query: 'react', category: 'eng' });
    expect(a.map((j) => j.id)).not.toEqual(b.map((j) => j.id));
  });
});

describe('selectNewJobs — dedup behavior', () => {
  function fiveJobs(): UpworkJobRow[] {
    return [
      { id: 'h-0', title: null, category: null, description: null, postedAt: null },
      { id: 'h-1', title: null, category: null, description: null, postedAt: null },
      { id: 'h-2', title: null, category: null, description: null, postedAt: null },
      { id: 'h-3', title: null, category: null, description: null, postedAt: null },
      { id: 'h-4', title: null, category: null, description: null, postedAt: null },
    ];
  }

  it('drops everything strictly before/including lastSeen and returns the new tail', () => {
    const raw = fiveJobs();
    const out = selectNewJobs(raw, 'h-2');
    expect(out.map((j) => j.id)).toEqual(['h-3', 'h-4']);
  });

  it('returns [] when cursor is already at the max id (no re-emission)', () => {
    expect(selectNewJobs(fiveJobs(), 'h-4')).toEqual([]);
  });

  it('returns the full sorted stream when cursor is null', () => {
    expect(selectNewJobs(fiveJobs(), null).map((j) => j.id)).toEqual([
      'h-0',
      'h-1',
      'h-2',
      'h-3',
      'h-4',
    ]);
  });

  it('returns the full sorted stream when cursor does not match any id (safety)', () => {
    expect(selectNewJobs(fiveJobs(), 'not-an-id').map((j) => j.id)).toEqual([
      'h-0',
      'h-1',
      'h-2',
      'h-3',
      'h-4',
    ]);
  });

  it('advancing the cursor to the new max and re-running returns [] (full round-trip)', () => {
    const raw = fiveJobs();
    const first = selectNewJobs(raw, 'h-2');
    const newMax = first.at(-1)?.id ?? null;
    expect(newMax).toBe('h-4');
    expect(selectNewJobs(raw, newMax)).toEqual([]);
  });

  it('sorts before comparing so an out-of-order cursor boundary still cuts correctly', () => {
    const raw = [
      { id: 'h-3', title: null, category: null, description: null, postedAt: null },
      { id: 'h-0', title: null, category: null, description: null, postedAt: null },
      { id: 'h-4', title: null, category: null, description: null, postedAt: null },
      { id: 'h-1', title: null, category: null, description: null, postedAt: null },
      { id: 'h-2', title: null, category: null, description: null, postedAt: null },
    ];
    expect(selectNewJobs(raw, 'h-2').map((j) => j.id)).toEqual(['h-3', 'h-4']);
  });
});

describe('projectPollOneFilter — per-filter error isolation', () => {
  function makeFilter(id: string, lastSeenJobId: string | null = null): SavedFilterRow {
    return {
      id,
      userId: null,
      query: id,
      category: null,
      postedAfter: null,
      lastSeenJobId,
    };
  }

  it('persists the good filter and isolates the bad filter (one error does not abort the loop)', async () => {
    const filters = [makeFilter('bad', null), makeFilter('good', null)];
    const seenPersisted: string[] = [];
    const client = {
      searchJobs: (f: SearchJobsFilter) => {
        if (f.query === 'bad') throw new Error('boom');
        return [
          { id: `${f.query}-0`, title: 't', category: null, description: null, postedAt: null },
          { id: `${f.query}-1`, title: 't', category: null, description: null, postedAt: null },
        ];
      },
    };
    const result = await projectPollOneFilter(filters, client, async (filter, jobs) => {
      if (jobs.length) seenPersisted.push(`${filter.id}:${jobs.length}`);
    });
    expect(result.failedFilterIds).toEqual(['bad']);
    expect(result.persistedFilterIds).toEqual(['good']);
    expect(seenPersisted).toEqual(['good:2']);
  });

  it('continues after the bad filter to a third filter (isolation across many)', async () => {
    const filters = [makeFilter('a-bad'), makeFilter('b-good'), makeFilter('c-good')];
    const persisted: string[] = [];
    const client = {
      searchJobs: (f: SearchJobsFilter) => {
        if (f.query === 'a-bad') throw new Error('boom');
        return [
          { id: `${f.query}-0`, title: 't', category: null, description: null, postedAt: null },
        ];
      },
    };
    const result = await projectPollOneFilter(filters, client, async (filter, jobs) => {
      if (jobs.length) persisted.push(filter.id);
    });
    expect(result.failedFilterIds).toEqual(['a-bad']);
    expect(result.persistedFilterIds.sort()).toEqual(['b-good', 'c-good']);
    expect(persisted.sort()).toEqual(['b-good', 'c-good']);
  });

  it('cursor advancement on the good filter is reflected in dedup on a second call', async () => {
    const filter = makeFilter('good', null);
    const seededJobs = [
      { id: 'good-0', title: 't', category: null, description: null, postedAt: null },
      { id: 'good-1', title: 't', category: null, description: null, postedAt: null },
    ];
    let lastSeen: string | null = null;
    const client = {
      searchJobs: () => seededJobs,
    };
    const firstJobBatches: UpworkJobRow[][] = [];
    await projectPollOneFilter([filter], client, async (_f, jobs) => {
      firstJobBatches.push(jobs);
      lastSeen = jobs.at(-1)?.id ?? null;
    });
    expect(firstJobBatches[0]?.map((j) => j.id)).toEqual(['good-0', 'good-1']);
    expect(lastSeen).toBe('good-1');

    // Second call simulates the cron advancing the cursor: write the new max back
    // and re-run. selectNewJobs sees the cursor and emits nothing.
    const secondFilter = makeFilter('good', lastSeen);
    const secondJobBatches: UpworkJobRow[][] = [];
    await projectPollOneFilter([secondFilter], client, async (_f, jobs) => {
      secondJobBatches.push(jobs);
    });
    expect(secondJobBatches[0]).toEqual([]);
  });
});
