"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  ShoppingCart,
  FileBarChart,
  Tags,
  ChevronUp,
  LogOut,
  Settings,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/brand-logo";
import { UserAvatar } from "@/components/layout/user-avatar";
import type { SessionUser } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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

export function AppSidebar({
  user,
  onLogout,
}: {
  user: SessionUser | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const setupItems = NAV_ITEMS.filter(
    (item) => "section" in item && item.section === "setup"
  );
  const mainItems = NAV_ITEMS.filter(
    (item) => !("section" in item) || item.section !== "setup"
  );

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center px-3 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3"
        >
          <BrandLogo
            width={260}
            height={104}
            priority
            className="h-[4.5rem] w-auto max-w-[260px] group-data-[collapsible=icon]:hidden"
          />
          <BrandLogo
            width={100}
            height={40}
            priority
            className="hidden h-10 w-auto group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent data-tour="main-nav">
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems
                .filter((item) => item.href === "/dashboard")
                .map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  const active = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                            : undefined
                        }
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Setup</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => {
                const Icon = iconMap[item.icon as keyof typeof iconMap];
                const active = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                          : undefined
                      }
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems
                .filter((item) => item.href !== "/dashboard")
                .map((item) => {
                  const Icon = iconMap[item.icon as keyof typeof iconMap];
                  const active = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                            : undefined
                        }
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user?.name ?? "Account"}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-tour="user-profile"
                >
                  <UserAvatar
                    user={user}
                    className="bg-sidebar-primary text-sidebar-primary-foreground"
                  />
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-sidebar-foreground">
                      {user?.name ?? "Administrator"}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                      Administrator
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[min(16rem,calc(100vw-2rem))]"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem disabled className="text-xs sm:text-sm">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <Settings className="mr-2 h-4 w-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-red-600 focus:text-red-600 dark:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
