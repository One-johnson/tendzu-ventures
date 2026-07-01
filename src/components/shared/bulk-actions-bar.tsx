"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionsBar({ count, onClear, children, className }: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2",
        className
      )}
    >
      <span className="text-sm font-medium">{count} selected</span>
      {children}
      <Button size="sm" variant="ghost" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}
