"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { NotificationRecord } from "@/types";
import { useSessionToken } from "@/components/providers/auth-provider";
import { NotificationsList, type NotificationFilter } from "@/components/notifications/notifications-list";
import { PageLoader } from "@/components/shared/page-loader";
import { FadeIn } from "@/components/motion/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationsPage() {
  const token = useSessionToken();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [bulkAction, setBulkAction] = useState<"delete" | null>(null);

  const notifications = useQuery(
    api.notifications.list,
    token ? { token, limit: 200 } : "skip"
  ) as NotificationRecord[] | undefined;

  const unreadCount = useQuery(
    api.notifications.unreadCount,
    token ? { token } : "skip"
  ) as number | undefined;

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAsUnread = useMutation(api.notifications.markAsUnread);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const bulkMarkAsRead = useMutation(api.notifications.bulkMarkAsRead);
  const bulkMarkAsUnread = useMutation(api.notifications.bulkMarkAsUnread);
  const removeNotification = useMutation(api.notifications.remove);
  const bulkRemove = useMutation(api.notifications.bulkRemove);
  const removeAll = useMutation(api.notifications.removeAll);

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    if (filter === "read") return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, filter]);

  const selectedArray = useMemo(
    () => Array.from(selectedIds) as Id<"notifications">[],
    [selectedIds]
  );

  const runBulk = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Action failed"));
    }
  };

  const handleBulkMarkRead = () =>
    runBulk(
      () => bulkMarkAsRead({ token: token!, ids: selectedArray }),
      "Marked as read"
    );

  const handleBulkMarkUnread = () =>
    runBulk(
      () => bulkMarkAsUnread({ token: token!, ids: selectedArray }),
      "Marked as unread"
    );

  const handleBulkDelete = () =>
    runBulk(() => bulkRemove({ token: token!, ids: selectedArray }), "Deleted notifications");

  const handleDeleteAll = async () => {
    if (!token) return;
    try {
      await removeAll({ token });
      toast.success("All notifications cleared");
      setSelectedIds(new Set());
      setConfirmDeleteAll(false);
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to clear notifications"));
    }
  };

  if (!notifications) return <PageLoader />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {notifications.length} total · {unreadCount ?? 0} unread
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
              <SelectTrigger className="h-10 w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            {(unreadCount ?? 0) > 0 && token && (
              <Button
                variant="outline"
                className="h-10"
                onClick={() => markAllAsRead({ token })}
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && token && (
              <Button
                variant="outline"
                className="h-10 text-red-600 hover:text-red-600 dark:text-red-400"
                onClick={() => setConfirmDeleteAll(true)}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
      </FadeIn>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="secondary" onClick={handleBulkMarkRead}>
            <MailOpen className="mr-1.5 h-3.5 w-3.5" />
            Mark read
          </Button>
          <Button size="sm" variant="secondary" onClick={handleBulkMarkUnread}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Mark unread
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkAction("delete")}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <NotificationsList
          notifications={filtered}
          unreadCount={unreadCount}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          showHeader={false}
          onMarkRead={
            token
              ? (id) => markAsRead({ token, id }).then(() => toast.success("Marked as read"))
              : undefined
          }
          onMarkUnread={
            token
              ? (id) => markAsUnread({ token, id }).then(() => toast.success("Marked as unread"))
              : undefined
          }
          onDelete={
            token
              ? async (id) => {
                  try {
                    await removeNotification({ token, id });
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      next.delete(id);
                      return next;
                    });
                    toast.success("Notification deleted");
                  } catch (error) {
                    toast.error(getFriendlyErrorMessage(error, "Failed to delete"));
                  }
                }
              : undefined
          }
        />
      </div>

      <AlertDialog open={bulkAction === "delete"} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} notifications?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBulkDelete();
                setBulkAction(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete every notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
