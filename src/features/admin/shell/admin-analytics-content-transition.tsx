"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

/** The red sliding indicator is the protagonist; this only keeps the content
 * swap from feeling like a hard cut when the route changes underneath it. */
export function AdminAnalyticsContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0.98, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="min-h-0 flex-1"
    >
      {children}
    </motion.div>
  );
}
