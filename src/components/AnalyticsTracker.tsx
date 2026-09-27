"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Do not track admin views
    if (pathname.startsWith("/admin")) return;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      let country = "India";

      if (tz.includes("Calcutta") || tz.includes("Kolkata") || tz.includes("Asia/Colombo")) {
        country = "India";
      } else if (tz.includes("Europe/London")) {
        country = "United Kingdom";
      } else if (tz.includes("America/") || tz.includes("US/")) {
        country = "United States";
      } else if (tz.includes("Europe/")) {
        country = "European Union";
      } else if (tz.includes("Australia/")) {
        country = "Australia";
      } else if (tz.includes("Asia/Dubai")) {
        country = "UAE";
      }

      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          country,
        }),
      }).catch(() => {});
    } catch {
      // Ignore background tracking errors silently
    }
  }, [pathname]);

  return null;
}
