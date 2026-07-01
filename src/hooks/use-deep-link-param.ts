"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { stripUrlParams } from "@/lib/search-routes";

export function useDeepLinkParam(paramName: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const targetId = searchParams.get(paramName);

  const consumeParam = useCallback(() => {
    if (!searchParams.has(paramName)) return;
    router.replace(stripUrlParams(pathname, searchParams, [paramName]), { scroll: false });
  }, [paramName, pathname, router, searchParams]);

  return { targetId, consumeParam };
}
