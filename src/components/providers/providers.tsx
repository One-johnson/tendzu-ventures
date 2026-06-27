"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton className="sm:!top-right" />
        </AuthProvider>
      </ConvexProvider>
    </ThemeProvider>
  );
}
