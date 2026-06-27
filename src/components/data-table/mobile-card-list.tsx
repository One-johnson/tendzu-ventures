"use client";

import { flexRender, Row } from "@tanstack/react-table";
import { motion } from "framer-motion";

interface MobileCardListProps<TData> {
  rows: Row<TData>[];
  renderCard: (row: Row<TData>, index: number) => React.ReactNode;
  emptyMessage?: string;
}

export function MobileCardList<TData>({
  rows,
  renderCard,
  emptyMessage = "No results.",
}: MobileCardListProps<TData>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row, index) => (
        <motion.div
          key={row.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.25 }}
        >
          {renderCard(row, index)}
        </motion.div>
      ))}
    </div>
  );
}

export function MobileCard({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors active:bg-muted/50"
    >
      {children}
    </div>
  );
}

export function MobileCardField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/** Helper to render cell value from column */
export function getCellValue<TData>(row: Row<TData>, columnId: string): React.ReactNode {
  const cell = row.getAllCells().find((c) => c.column.id === columnId);
  if (!cell) return "—";
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}
