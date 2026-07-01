"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth, useSessionToken } from "@/components/providers/auth-provider";

export function CredentialPromptBanner() {
  const { user } = useAuth();
  const token = useSessionToken();
  const dismissPrompt = useMutation(api.auth.dismissCredentialPrompt);

  if (!user?.showCredentialPrompt || !token) {
    return null;
  }

  const handleDismiss = async () => {
    try {
      await dismissPrompt({ token });
      toast.message("Reminder dismissed", {
        description: "You can update your email or password anytime from Account settings.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not dismiss reminder");
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-yellow-500/30 bg-yellow-50/80 p-4 dark:bg-yellow-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Update your default admin credentials
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You signed in with the seeded admin account. Changing your email and password is
            optional, but recommended before going live.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col lg:flex-row">
        <Button size="sm" asChild>
          <Link href="/account">Update account</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          <X className="mr-1 h-4 w-4" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
