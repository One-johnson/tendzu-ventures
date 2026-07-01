/** Deep-link URLs used by global search and in-app navigation. */
export const searchRoutes = {
  page: (href: string) => href,
  machine: (id: string) => `/inventory?machine=${id}`,
  category: (id: string) => `/categories?category=${id}`,
  categoryMachines: (id: string) => `/inventory?category=${id}`,
  sale: (id: string) => `/sales?sale=${id}`,
} as const;

export function stripUrlParams(
  pathname: string,
  searchParams: URLSearchParams,
  keys: string[]
): string {
  const next = new URLSearchParams(searchParams.toString());
  keys.forEach((key) => next.delete(key));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
