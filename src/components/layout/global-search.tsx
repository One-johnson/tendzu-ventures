"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSessionToken } from "@/components/providers/auth-provider";
import { NAV_ITEMS } from "@/lib/constants";
import { searchRoutes } from "@/lib/search-routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  ArrowRight,
  FileBarChart,
  LayoutDashboard,
  Package,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
} from "lucide-react";

const PAGE_ITEMS = [
  ...NAV_ITEMS,
  { href: "/notifications", label: "Notifications" },
];

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/categories": Tags,
  "/settings": Settings,
  "/inventory": Package,
  "/restocking": Truck,
  "/sales": ShoppingCart,
  "/reports": FileBarChart,
  "/notifications": Receipt,
};

type SearchResultKind = "page" | "category" | "machine" | "sale";

interface SearchResult {
  key: string;
  kind: SearchResultKind;
  href: string;
  label: string;
  meta?: string;
  action: string;
}

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const KIND_LABELS: Record<SearchResultKind, string> = {
  page: "Pages",
  category: "Categories",
  machine: "Machines",
  sale: "Sales",
};

const KIND_STYLES: Record<SearchResultKind, string> = {
  page: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  category: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  machine: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sale: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const token = useSessionToken();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query);

  const results = useQuery(
    api.search.global,
    token && debouncedQuery.trim().length >= 2
      ? { token, query: debouncedQuery.trim(), limit: 6 }
      : "skip"
  );

  const matchedPages = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (term.length < 1) return [];
    return PAGE_ITEMS.filter((page) => page.label.toLowerCase().includes(term)).slice(0, 4);
  }, [debouncedQuery]);

  const flatResults = useMemo(() => {
    const items: SearchResult[] = [];

    for (const page of matchedPages) {
      items.push({
        key: `page-${page.href}`,
        kind: "page",
        href: searchRoutes.page(page.href),
        label: page.label,
        meta: "Navigate to page",
        action: "Go to page",
      });
    }

    for (const category of results?.categories ?? []) {
      items.push({
        key: `category-${category._id}`,
        kind: "category",
        href: searchRoutes.category(category._id),
        label: category.name,
        meta: category.description ?? "Open category details",
        action: "Open category",
      });
    }

    for (const machine of results?.machines ?? []) {
      items.push({
        key: `machine-${machine._id}`,
        kind: "machine",
        href: searchRoutes.machine(machine._id),
        label: machine.name,
        meta: [machine.customId, machine.sku, machine.categoryName].filter(Boolean).join(" · "),
        action: "Open machine",
      });
    }

    for (const sale of results?.sales ?? []) {
      items.push({
        key: `sale-${sale._id}`,
        kind: "sale",
        href: searchRoutes.sale(sale._id),
        label: sale.invoiceNumber,
        meta: `${sale.machineName} · ${formatCurrency(sale.totalAmount)} · ${formatDateOnly(sale.saleDate)}`,
        action: "View sale",
      });
    }

    return items;
  }, [matchedPages, results]);

  const groupedResults = useMemo(() => {
    const groups: Array<{ kind: SearchResultKind; items: SearchResult[] }> = [];
    const order: SearchResultKind[] = ["page", "category", "machine", "sale"];

    for (const kind of order) {
      const items = flatResults.filter((item) => item.kind === kind);
      if (items.length > 0) groups.push({ kind, items });
    }

    return groups;
  }, [flatResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [flatResults.length, debouncedQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.innerWidth < 640) {
          setMobileOpen(true);
        } else {
          inputRef.current?.focus();
          setOpen(true);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(flatResults.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && flatResults[activeIndex]) {
      event.preventDefault();
      navigate(flatResults[activeIndex].href);
    } else if (event.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    }
  };

  const showResults = open && query.trim().length > 0;
  const hasResults = flatResults.length > 0;
  const isLoading = debouncedQuery.trim().length >= 2 && results === undefined;

  let runningIndex = -1;

  const searchInput = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search machines, categories, sales..."
        className="h-10 pl-9 pr-16"
        data-tour="global-search"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
        Ctrl K
      </kbd>

      {showResults && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <ScrollArea className="max-h-[min(420px,70vh)]">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</p>
            ) : hasResults ? (
              <div className="p-1">
                {groupedResults.map((group) => (
                  <div key={group.kind} className="py-1">
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {KIND_LABELS[group.kind]}
                    </p>
                    <ul>
                      {group.items.map((item) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        const PageIcon = item.kind === "page" ? PAGE_ICONS[item.href] : null;

                        return (
                          <li key={item.key}>
                            <button
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                                index === activeIndex
                                  ? "bg-accent text-accent-foreground"
                                  : "hover:bg-muted"
                              )}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => navigate(item.href)}
                            >
                              <Badge
                                variant="secondary"
                                className={cn("mt-0.5 shrink-0 text-[10px]", KIND_STYLES[item.kind])}
                              >
                                {item.kind === "page" && PageIcon ? (
                                  <PageIcon className="mr-1 h-3 w-3" />
                                ) : null}
                                {item.action}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{item.label}</span>
                                {item.meta ? (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {item.meta}
                                  </span>
                                ) : null}
                              </div>
                              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : debouncedQuery.trim().length >= 2 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No results for &ldquo;{debouncedQuery.trim()}&rdquo;
              </p>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search data
              </p>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("flex min-w-0 items-center justify-center px-1 sm:px-4", className)}>
      <div className="hidden w-full max-w-md sm:block lg:max-w-lg">{searchInput}</div>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 touch-manipulation sm:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="p-4">{searchInput}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
