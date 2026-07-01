export const SESSION_COOKIE = "tendzu_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export const APP_NAME = "Tendzu Ventures";
export const APP_LOGO_PATH = "/tendzu-logo.png";
export const APP_DESCRIPTION =
  "Heavy Equipment Inventory & Sales Management System";

export const STOCK_STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  {
    href: "/categories",
    label: "Categories",
    icon: "Tags",
    section: "setup" as const,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "Settings",
    section: "setup" as const,
  },
  { href: "/inventory", label: "Inventory", icon: "Package" },
  { href: "/restocking", label: "Restocking", icon: "Truck" },
  { href: "/sales", label: "Sales", icon: "ShoppingCart" },
  { href: "/reports", label: "Reports", icon: "FileBarChart" },
] as const;
