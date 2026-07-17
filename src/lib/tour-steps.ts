export const TOUR_STORAGE_KEY = "tendzu_tour_completed";
export const TOUR_START_EVENT = "tendzu-start-tour";

export type TourPlacement = "center" | "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  route: string;
  target?: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    title: "Welcome to Tendzu Ventures",
    description:
      "This guided tour walks you through inventory, sales, restocking, reports, and alerts. Use Back, Skip, or Next to move through each section.",
    placement: "center",
  },
  {
    id: "navigation",
    route: "/dashboard",
    target: '[data-tour="main-nav"]',
    title: "Main Navigation",
    description:
      "Switch between Dashboard, Categories, Inventory, Restocking, Sales, and Reports. On mobile, use the bottom bar; on desktop, use the sidebar.",
    placement: "top",
  },
  {
    id: "dashboard",
    route: "/dashboard",
    target: '[data-tour="dashboard-stats"]',
    title: "Dashboard Overview",
    description:
      "Monitor machine counts, stock health, revenue trends, and recent activity at a glance.",
    placement: "bottom",
  },
  {
    id: "categories",
    route: "/categories",
    target: '[data-tour="categories-header"]',
    title: "Categories Setup",
    description:
      "Start by creating categories to organize your equipment. Add machines to inventory only after categories are in place.",
    placement: "bottom",
  },
  {
    id: "inventory",
    route: "/inventory",
    target: '[data-tour="inventory-header"]',
    title: "Machine Inventory",
    description:
      "Browse your equipment catalog, filter by category or stock status, and search by name, part number, brand, or model.",
    placement: "bottom",
  },
  {
    id: "add-machine",
    route: "/inventory",
    target: '[data-tour="add-machine"]',
    title: "Add & Edit Machines",
    description:
      "Add machines from the slide-over sheet. You can optionally enter a part number for each machine.",
    placement: "left",
  },
  {
    id: "restocking",
    route: "/restocking",
    target: '[data-tour="restocking-form"]',
    title: "Restocking",
    description:
      "Record stock additions, track previous and new quantities, and keep inventory levels accurate after deliveries.",
    placement: "bottom",
  },
  {
    id: "sales",
    route: "/sales",
    target: '[data-tour="sales-form"]',
    title: "Sales Management",
    description:
      "Record sales, view revenue and profit stats, browse charts, and review transaction history in one place.",
    placement: "bottom",
  },
  {
    id: "sales-history",
    route: "/sales",
    target: '[data-tour="sales-history-table"]',
    title: "Sales History",
    description:
      "Review past transactions, filter by date range, and open any invoice for full sale details including profit.",
    placement: "top",
  },
  {
    id: "reports",
    route: "/reports",
    target: '[data-tour="reports-summary"]',
    title: "Business Reports",
    description:
      "View inventory, stock alerts, sales summaries, and best-selling machines. Revenue cards show daily, weekly, and monthly performance.",
    placement: "bottom",
  },
  {
    id: "export",
    route: "/reports",
    target: '[data-tour="reports-export"]',
    title: "Export Reports",
    description:
      "Download PDF or Excel exports from each report tab. On mobile, open the Export sheet for quick access to download options.",
    placement: "top",
  },
  {
    id: "notifications",
    route: "/dashboard",
    target: '[data-tour="notifications"]',
    title: "Notifications",
    description:
      "Stay informed about sales, restocks, low stock, and out-of-stock alerts. Open the bell icon for a quick panel or visit the full notifications page.",
    placement: "bottom",
  },
  {
    id: "global-search",
    route: "/dashboard",
    target: '[data-tour="global-search"]',
    title: "Global Search",
    description:
      "Search machines, categories, sales, and pages from anywhere. Press Ctrl+K (or tap the search icon on mobile) to jump quickly to what you need.",
    placement: "bottom",
  },
  {
    id: "theme",
    route: "/dashboard",
    target: '[data-tour="theme-toggle"]',
    title: "Theme & Profile",
    description:
      "Toggle light or dark mode. Account settings and logout are in the sidebar profile menu at the bottom.",
    placement: "bottom",
  },
  {
    id: "complete",
    route: "/dashboard",
    title: "You're All Set",
    description:
      "You can restart this tour anytime from the help button in the header. Start by adding categories, then machines, or record your first sale.",
    placement: "center",
  },
];

export function startAppTour() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOUR_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
}

export function completeAppTour() {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

export function hasCompletedTour() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}
