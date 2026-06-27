"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  History,
  FileBarChart,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import type { NotificationRecord } from "@/types";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const iconMap = {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  History,
  FileBarChart,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const unreadCount = useQuery(
    api.notifications.unreadCount,
    token ? { token } : "skip"
  ) as number | undefined;
  const notifications = useQuery(
    api.notifications.list,
    token ? { token, limit: 5, unreadOnly: false } : "skip"
  ) as NotificationRecord[] | undefined;
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const currentPage =
    NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Dashboard";

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4 sm:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-bold text-white">
          TV
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{APP_NAME}</p>
          <p className="text-xs text-slate-400">Inventory & Sales</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation",
                active
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-800"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3 sm:p-4">
        <div className="rounded-lg bg-slate-800/50 p-3">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs capitalize text-slate-400">{user?.role}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-[var(--sidebar)] lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col bg-[var(--sidebar)] shadow-2xl lg:hidden"
            >
              <button
                className="absolute right-3 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 touch-manipulation"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:h-16 sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted lg:hidden touch-manipulation"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {currentPage}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">{APP_NAME}</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 touch-manipulation">
                  <Bell className="h-5 w-5" />
                  {(unreadCount ?? 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount! > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(320px,calc(100vw-2rem))]">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-semibold">Notifications</span>
                  {(unreadCount ?? 0) > 0 && token && (
                    <button
                      className="text-xs text-primary hover:underline touch-manipulation"
                      onClick={() => markAllAsRead({ token })}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />
                {!notifications?.length ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem key={n._id} className="flex flex-col items-start gap-1 p-3">
                      <span className="font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                      <span className="text-xs text-muted-foreground/70">{formatDate(n.createdAt)}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-1.5 px-2 touch-manipulation sm:gap-2 sm:px-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {user?.name?.charAt(0) ?? "A"}
                  </div>
                  <span className="hidden max-w-[100px] truncate sm:inline md:max-w-[140px]">
                    {user?.name}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 opacity-50 sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs sm:text-sm">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-3 py-4 pb-20 sm:px-4 sm:py-6 lg:px-8 lg:pb-8">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden">
          <div className="grid grid-cols-6 gap-0">
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
      </div>
    </div>
  );
}
