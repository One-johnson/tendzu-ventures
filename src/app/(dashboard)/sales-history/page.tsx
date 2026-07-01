"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/shared/page-loader";

export default function SalesHistoryRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/sales?${qs}` : "/sales");
  }, [router, searchParams]);

  return <PageLoader />;
}
