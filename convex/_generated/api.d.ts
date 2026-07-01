/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as dashboard from "../dashboard.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customId from "../lib/customId.js";
import type * as lib_invoice from "../lib/invoice.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_stock from "../lib/stock.js";
import type * as machines from "../machines.js";
import type * as notifications from "../notifications.js";
import type * as reports from "../reports.js";
import type * as restocking from "../restocking.js";
import type * as sales from "../sales.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  dashboard: typeof dashboard;
  "lib/auth": typeof lib_auth;
  "lib/customId": typeof lib_customId;
  "lib/invoice": typeof lib_invoice;
  "lib/notifications": typeof lib_notifications;
  "lib/stock": typeof lib_stock;
  machines: typeof machines;
  notifications: typeof notifications;
  reports: typeof reports;
  restocking: typeof restocking;
  sales: typeof sales;
  search: typeof search;
  seed: typeof seed;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
