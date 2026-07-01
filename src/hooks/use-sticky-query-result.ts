import { useEffect, useState } from "react";

export function useStickyQueryResult<T>(value: T | undefined) {
  const [cached, setCached] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (value !== undefined) {
      setCached(value);
    }
  }, [value]);

  const data = value ?? cached;
  const isRefreshing = value === undefined && cached !== undefined;
  const isInitialLoading = value === undefined && cached === undefined;

  return { data, isRefreshing, isInitialLoading };
}
