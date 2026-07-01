"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth, useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { InputWithIcon, PasswordInput } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/page-loader";
import { FadeIn } from "@/components/motion/page-wrapper";
import { Mail, Lock, KeyRound, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";

export default function AccountPage() {
  const { user, token } = useAuth();
  const changeEmail = useMutation(api.auth.changeEmail);
  const changePassword = useMutation(api.auth.changePassword);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return <PageLoader />;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingEmail(true);
    try {
      await changeEmail({
        token,
        newEmail: newEmail.trim(),
        currentPassword: emailPassword,
      });
      toast.success("Email updated successfully");
      setNewEmail("");
      setEmailPassword("");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to update email"));
    } finally {
      setSavingEmail(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({ token, currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to update password"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeIn>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">Account Settings</h2>
          <p className="text-sm text-muted-foreground">
            Manage your login email and password for {user.email}
          </p>
        </div>
      </FadeIn>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>{user.name}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Signed in as administrator
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change email</CardTitle>
          <CardDescription>Confirm with your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email</Label>
              <InputWithIcon
                id="new-email"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                placeholder="you@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-current-password">Current password</Label>
              <PasswordInput
                id="email-current-password"
                icon={<Lock className="h-4 w-4" />}
                placeholder="Enter current password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" disabled={savingEmail || !newEmail || !emailPassword}>
              {savingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update email"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Minimum 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <PasswordInput
                id="current-password"
                icon={<Lock className="h-4 w-4" />}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                icon={<KeyRound className="h-4 w-4" />}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-password"
                icon={<KeyRound className="h-4 w-4" />}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
