// @polsia:user-owned
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PROPOSAL_WON_EVENT = 'proposal-won';

export function getChecklistKey(rowId: string): string {
  return `ffai_won_checklist_dismissed__${rowId}`;
}

export function hasSeenChecklist(rowId: string): boolean {
  return localStorage.getItem(getChecklistKey(rowId)) === '1';
}

export function dismissChecklist(rowId: string): void {
  localStorage.setItem(getChecklistKey(rowId), '1');
}

interface ProposalWonDetail {
  id: string;
  client: string;
  value: number;
}

const ITEMS = [
  { id: 'kickoff', label: 'Send kickoff message' },
  { id: 'milestones', label: 'Set milestones' },
  { id: 'hours', label: 'Log first 5 hours' },
] as const;

export function WonOnboardingChecklist() {
  const [open, setOpen] = useState(false);
  const [currentWinId, setCurrentWinId] = useState<string | null>(null);
  const [currentWin, setCurrentWin] = useState<ProposalWonDetail | null>(null);
  const [itemChecked, setItemChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleWin(event: Event) {
      const ce = event as CustomEvent<ProposalWonDetail>;
      const detail = ce.detail;
      if (!detail?.id) return;
      if (hasSeenChecklist(detail.id)) return;
      setCurrentWinId(detail.id);
      setCurrentWin(detail);
      setItemChecked({});
      setOpen(true);
    }

    window.addEventListener(PROPOSAL_WON_EVENT, handleWin);
    return () => {
      window.removeEventListener(PROPOSAL_WON_EVENT, handleWin);
    };
  }, []);

  function handleDismiss() {
    if (currentWinId) {
      dismissChecklist(currentWinId);
    }
    setOpen(false);
    setCurrentWinId(null);
    setCurrentWin(null);
    setItemChecked({});
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kickoff checklist</DialogTitle>
          <DialogDescription>
            Congrats on the win{currentWin?.client ? ` — ${currentWin.client}` : ''}. Walk through
            these three steps to start the engagement strong.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {ITEMS.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={`won-check-${item.id}`}
                checked={Boolean(itemChecked[item.id])}
                onCheckedChange={(value) =>
                  setItemChecked((prev) => ({ ...prev, [item.id]: Boolean(value) }))
                }
              />
              <label
                htmlFor={`won-check-${item.id}`}
                className="cursor-pointer text-sm font-medium leading-none text-foreground"
              >
                {item.label}
              </label>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button type="button" onClick={handleDismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
