"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/page-loader";
import { FadeIn } from "@/components/motion/page-wrapper";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const token = useSessionToken();
  const defaultThreshold = useQuery(
    api.settings.getDefaultLowStockThreshold,
    token ? { token } : "skip"
  ) as number | undefined;
  const setSetting = useMutation(api.settings.set);

  const [threshold, setThreshold] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultThreshold !== undefined) {
      setThreshold(String(defaultThreshold));
    }
  }, [defaultThreshold]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const value = Number(threshold);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Enter a valid threshold");
      return;
    }

    setSaving(true);
    try {
      await setSetting({
        token,
        key: "default_low_stock_threshold",
        value: String(value),
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  if (defaultThreshold === undefined) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FadeIn>
        <div>
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">App Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure defaults used when adding new machines and stock alerts
          </p>
        </div>
      </FadeIn>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Inventory defaults
          </CardTitle>
          <CardDescription>
            Applied as the default low stock threshold for new machines unless overridden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-threshold">Default low stock threshold</Label>
              <Input
                id="default-threshold"
                type="number"
                min="0"
                className="max-w-xs"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Machines at or below this quantity are marked as low stock.
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
