"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { NotificationRecord } from "@/types";
import { useSessionToken } from "@/components/providers/auth-provider";
import { NotificationsList } from "@/components/notifications/notifications-list";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const token = useSessionToken();

  const unreadCount = useQuery(
    api.notifications.unreadCount,
    token ? { token } : "skip"
  ) as number | undefined;

  const notifications = useQuery(
    api.notifications.list,
    token ? { token, limit: 20, unreadOnly: false } : "skip"
  ) as NotificationRecord[] | undefined;

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAsUnread = useMutation(api.notifications.markAsUnread);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const removeNotification = useMutation(api.notifications.remove);

  const handleMarkRead = async (id: Id<"notifications">) => {
    if (!token) return;
    try {
      await markAsRead({ token, id });
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to mark as read"));
    }
  };

  const handleMarkUnread = async (id: Id<"notifications">) => {
    if (!token) return;
    try {
      await markAsUnread({ token, id });
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to mark as unread"));
    }
  };

  const handleDelete = async (id: Id<"notifications">) => {
    if (!token) return;
    try {
      await removeNotification({ token, id });
      toast.success("Notification deleted");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to delete"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14 text-left">
          <SheetTitle>Notifications</SheetTitle>
          {(unreadCount ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <NotificationsList
            notifications={notifications}
            unreadCount={unreadCount}
            compact
            showHeader={false}
            onMarkRead={token ? handleMarkRead : undefined}
            onMarkUnread={token ? handleMarkUnread : undefined}
            onDelete={token ? handleDelete : undefined}
          />
        </div>

        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="flex flex-col gap-2">
            {(unreadCount ?? 0) > 0 && token && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  markAllAsRead({ token }).then(() => toast.success("All marked as read"))
                }
              >
                Mark all as read
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild onClick={() => onOpenChange(false)}>
              <Link href="/notifications">
                View all notifications
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
