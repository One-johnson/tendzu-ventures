"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { NotificationRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, ExternalLink, Mail, MailOpen, MoreHorizontal, Trash2 } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

export type NotificationFilter = "all" | "unread" | "read";

interface NotificationsListProps {
  notifications: NotificationRecord[] | undefined;
  unreadCount?: number;
  compact?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onMarkRead?: (id: Id<"notifications">) => void;
  onMarkUnread?: (id: Id<"notifications">) => void;
  onDelete?: (id: Id<"notifications">) => void;
  onMarkAllRead?: () => void;
  showHeader?: boolean;
  showViewAll?: boolean;
}

function NotificationTypeBadge({ type }: { type: NotificationRecord["type"] }) {
  const labels: Record<NotificationRecord["type"], string> = {
    sale: "Sale",
    restock: "Restock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
  };

  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {labels[type]}
    </span>
  );
}

export function NotificationsList({
  notifications,
  unreadCount,
  compact = false,
  selectable = false,
  selectedIds,
  onSelectionChange,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onMarkAllRead,
  showHeader = true,
  showViewAll = false,
}: NotificationsListProps) {
  const allSelected =
    !!notifications?.length &&
    notifications.every((n) => selectedIds?.has(n._id));

  const toggleAll = () => {
    if (!notifications || !onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(notifications.map((n) => n._id)));
    }
  };

  const toggleOne = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {(unreadCount ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {(unreadCount ?? 0) > 0 && onMarkAllRead && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onMarkAllRead}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark all
              </Button>
            )}
            {showViewAll && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                <Link href="/notifications">
                  View all
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {selectable && (notifications?.length ?? 0) > 0 && (
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
          <span className="text-xs text-muted-foreground">
            {selectedIds?.size ?? 0} selected
          </span>
        </div>
      )}

      <ScrollArea className={cn("flex-1", compact ? "max-h-[min(520px,70vh)]" : "")}>
        {!notifications?.length ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Sales, restocks, and stock alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "group flex gap-3 px-4 py-3 transition-colors",
                  notification.isRead
                    ? "bg-card"
                    : "bg-yellow-50/80 dark:bg-yellow-950/20",
                  selectable && selectedIds?.has(notification._id) && "bg-muted/60"
                )}
              >
                {selectable && (
                  <Checkbox
                    checked={selectedIds?.has(notification._id)}
                    onCheckedChange={() => toggleOne(notification._id)}
                    aria-label={`Select ${notification.title}`}
                    className="mt-1"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <NotificationTypeBadge type={notification.type} />
                      </div>
                    </div>
                    {!notification.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>

                {(onMarkRead || onMarkUnread || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!notification.isRead && onMarkRead && (
                        <DropdownMenuItem
                          onClick={() => onMarkRead(notification._id as Id<"notifications">)}
                        >
                          <MailOpen className="mr-2 h-4 w-4" />
                          Mark as read
                        </DropdownMenuItem>
                      )}
                      {notification.isRead && onMarkUnread && (
                        <DropdownMenuItem
                          onClick={() => onMarkUnread(notification._id as Id<"notifications">)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Mark as unread
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                            onClick={() => onDelete(notification._id as Id<"notifications">)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
