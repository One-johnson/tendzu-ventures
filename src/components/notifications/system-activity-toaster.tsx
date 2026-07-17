"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import type { NotificationRecord } from "@/types";
import { toast } from "sonner";

/**
 * Shows a Sonner toast whenever a new in-app notification arrives after the
 * initial subscription sync (skips the first snapshot so refresh doesn't spam).
 */
export function SystemActivityToaster() {
  const token = useSessionToken();
  const notifications = useQuery(
    api.notifications.list,
    token ? { token, limit: 10, unreadOnly: false } : "skip"
  ) as NotificationRecord[] | undefined;

  const readyRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notifications) return;

    if (!readyRef.current) {
      seenIdsRef.current = new Set(notifications.map((n) => n._id));
      readyRef.current = true;
      return;
    }

    const fresh = notifications.filter((n) => !seenIdsRef.current.has(n._id));
    for (const notification of [...fresh].reverse()) {
      seenIdsRef.current.add(notification._id);

      const isAlert =
        notification.type === "low_stock" || notification.type === "out_of_stock";

      if (isAlert) {
        toast.warning(notification.title, {
          id: notification._id,
          description: notification.message,
        });
      } else {
        toast.success(notification.title, {
          id: notification._id,
          description: notification.message,
        });
      }
    }

    // Cap memory: keep ids from the current window plus a buffer
    if (seenIdsRef.current.size > 200) {
      seenIdsRef.current = new Set(notifications.map((n) => n._id));
    }
  }, [notifications]);

  return null;
}
