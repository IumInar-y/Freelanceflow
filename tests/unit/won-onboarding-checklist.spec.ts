import { beforeEach, describe, expect, it } from 'vitest';

import {
  dismissChecklist,
  getChecklistKey,
  hasSeenChecklist,
} from '../../src/components/custom/dashboard/won-onboarding-checklist';

describe('won onboarding checklist — flag key', () => {
  it('derives a per-row localStorage key with double-underscore separator', () => {
    expect(getChecklistKey('abc-123')).toBe('ffai_won_checklist_dismissed__abc-123');
  });

  it('keeps the prefix stable for ids containing underscores', () => {
    expect(getChecklistKey('row_42')).toBe('ffai_won_checklist_dismissed__row_42');
  });
});

describe('won onboarding checklist — dismiss persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports unseen before any write and persists after dismiss', () => {
    expect(hasSeenChecklist('abc-123')).toBe(false);

    dismissChecklist('abc-123');

    expect(localStorage.getItem('ffai_won_checklist_dismissed__abc-123')).toBe('1');
    expect(hasSeenChecklist('abc-123')).toBe(true);
  });

  it('stores dismissal per row id', () => {
    dismissChecklist('abc-123');

    expect(hasSeenChecklist('abc-123')).toBe(true);
    expect(hasSeenChecklist('different-id')).toBe(false);
    expect(localStorage.getItem('ffai_won_checklist_dismissed__different-id')).toBeNull();
  });
});
