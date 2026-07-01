"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FileBarChart,
  HelpCircle,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/layout/user-avatar";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsSheet } from "@/components/notifications/notifications-sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppTour } from "@/components/tour/app-tour";
import { startAppTour } from "@/lib/tour-steps";
import { CredentialPromptBanner } from "@/components/auth/credential-prompt-banner";
import { ConfirmLogoutDialog } from "@/components/auth/confirm-logout-dialog";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const iconMap = {
  LayoutDashboard,
  Tags,
  Settings,
  Package,
  Truck,
  ShoppingCart,
  FileBarChart,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const unreadCount = useQuery(
    api.notifications.unreadCount,
    token ? { token } : "skip"
  ) as number | undefined;

  const currentPage = pathname.startsWith("/notifications")
    ? "Notifications"
    : pathname.startsWith("/account")
      ? "Account"
      : (NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard");

  return (
    <SidebarProvider defaultOpen>
      <AppTour />
      <AppSidebar user={user} onLogout={() => setLogoutOpen(true)} />

      <SidebarInset className="min-h-svh">
        <header className="safe-top sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:h-16 sm:gap-4 sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <SidebarTrigger />
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {currentPage}
              </h1>
              <p className="hidden text-xs text-muted-foreground md:block">{APP_NAME}</p>
            </div>
          </div>

          <GlobalSearch />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 touch-manipulation"
              onClick={startAppTour}
              aria-label="Start guided tour"
              data-tour="help-tour"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 touch-manipulation"
              onClick={() => setNotificationsOpen(true)}
              data-tour="notifications"
            >
              <Bell className="h-5 w-5" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount! > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            <div data-tour="theme-toggle">
              <ThemeToggle />
            </div>

            <UserAvatar user={user} aria-label={user?.name ?? "User profile"} />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-3 py-4 pb-20 sm:px-4 sm:py-6 lg:px-8 lg:pb-8">
          <CredentialPromptBanner />
          {children}
        </main>

        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden"
          data-tour="main-nav"
        >
          <div className="grid grid-cols-4 gap-0 sm:grid-cols-7">
            {NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              const active = pathname.startsWith(item.href);
              const shortLabel = item.label.split(" ")[0];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors touch-manipulation",
                    active
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "scale-110")} />
                  <span className="truncate">{shortLabel}</span>
                  {active && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute bottom-1 h-0.5 w-8 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </SidebarInset>

      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />

      <ConfirmLogoutDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={async () => {
          await logout();
          router.push("/login");
        }}
      />
    </SidebarProvider>
  );
}
