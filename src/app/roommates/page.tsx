"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RoommatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to blocks page with roommates tab active
    router.replace("/blocks?tab=roommates");
  }, [router]);

  return null;
}
