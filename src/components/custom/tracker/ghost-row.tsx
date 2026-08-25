// @polsia:user-owned
'use client';

import { Lock } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

interface GhostRowProps {
  index: number;
}

export function GhostRow({ index }: GhostRowProps) {
  return (
    <TableRow aria-hidden="true" data-testid="ghost-row" data-ghost-index={index}>
      <TableCell className="text-sm tabular-nums blur-sm opacity-60 select-none pointer-events-none">
        ——/——/——
      </TableCell>
      <TableCell className="text-sm font-medium blur-sm opacity-60 select-none pointer-events-none">
        Locked — Upgrade to Pro
      </TableCell>
      <TableCell className="text-sm text-muted-foreground blur-sm opacity-60 select-none pointer-events-none">
        Locked
      </TableCell>
      <TableCell>
        <span className="inline-block h-3 w-12 rounded bg-muted blur-sm opacity-60 select-none pointer-events-none" />
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums blur-sm opacity-60 select-none pointer-events-none">
        $——
      </TableCell>
      <TableCell className="text-right">
        <span
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70"
          aria-hidden="true"
        >
          <Lock className="size-3.5" />
        </span>
      </TableCell>
    </TableRow>
  );
}
