"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud",
  {
    logger: {
      logVerbose: () => {},
      log: () => {},
      warn: (...args) => console.warn(...args),
      error: (...args) => {
        const text = args.map(String).join(" ");
        if (text.includes("[CONVEX M(auth:login)]") || text.includes("auth:login")) {
          return;
        }
        console.error(...args);
      },
    },
  }
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
