"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmLogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmLogoutDialog({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmLogoutDialogProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (loggingOut) return;
    onOpenChange(next);
    if (!next) setLoggingOut(false);
  };

  const handleConfirm = async () => {
    setLoggingOut(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Keep dialog open so the user can retry or cancel.
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="border-border bg-card sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </span>
            Log out?
          </AlertDialogTitle>
          <AlertDialogDescription>
            You will need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loggingOut} className="touch-manipulation">
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={loggingOut}
            className="touch-manipulation"
            onClick={handleConfirm}
          >
            {loggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Log out"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
