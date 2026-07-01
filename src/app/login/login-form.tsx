"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { InputWithIcon, PasswordInput } from "@/components/ui/input-with-icon";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { motion } from "framer-motion";
import { getFriendlyErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push(redirect);
    } catch (error) {
      const message = getFriendlyErrorMessage(
        error,
        "We couldn't sign you in. Check your email and password, then try again."
      );
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-background">
      <div className="absolute right-4 top-4 z-10 safe-top">
        <ThemeToggle />
      </div>

      <div className="relative hidden flex-1 items-center justify-center bg-[var(--sidebar)] p-8 text-white lg:flex lg:p-12">
        <div className="flex max-w-lg flex-col items-center text-center">
          <BrandLogo width={300} height={120} priority className="h-auto w-auto max-w-[min(100%,320px)]" />
          <div className="mt-10">
            <h2 className="text-3xl font-bold leading-tight">
              Manage Your Heavy Equipment
              <br />
              Inventory & Sales
            </h2>
            <p className="mt-4 text-slate-400">
              A complete solution for tracking machine inventory, recording sales,
              managing restocking, and generating business reports for your Ghanaian
              heavy equipment business.
            </p>
          </div>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Tendzu Ventures. All rights reserved.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="w-full border-border bg-card shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-2 flex justify-center lg:hidden">
                <BrandLogo width={180} height={72} priority />
              </div>
              <CardTitle className="text-2xl">Administrator Login</CardTitle>
              <CardDescription>
                Sign in to access the management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError ? (
                  <div
                    role="alert"
                    className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{formError}</p>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <InputWithIcon
                    id="email"
                    type="email"
                    icon={<Mail className="h-4 w-4" />}
                    placeholder="admin@tendzuventures.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    icon={<Lock className="h-4 w-4" />}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
