import type { ReactNode } from "react";
import { AdminAnalyticsTabs } from "@/features/admin/shell/admin-analytics-tabs";
import { AdminAnalyticsContentTransition } from "@/features/admin/shell/admin-analytics-content-transition";

export default function AdminAnalyticsSectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminAnalyticsTabs />
      <AdminAnalyticsContentTransition>{children}</AdminAnalyticsContentTransition>
    </div>
  );
}
