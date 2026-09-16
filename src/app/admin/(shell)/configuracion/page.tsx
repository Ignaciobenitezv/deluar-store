import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminSettingsShell } from "@/features/admin/settings/components/admin-settings-shell";
import { resolveSettingsTab } from "@/features/admin/settings/components/admin-settings-tabs";
import { ArcaSection } from "@/features/admin/settings/components/arca-section";
import { GeneralSection } from "@/features/admin/settings/components/general-section";
import { IntegrationsSection } from "@/features/admin/settings/components/integrations-section";
import { PreferencesSection } from "@/features/admin/settings/components/preferences-section";
import { getAdminBusinessProfile, getAdminIntegrations } from "@/features/admin/settings/server/settings-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configuración | Administración",
};

type AdminConfiguracionPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function AdminConfiguracionPage({ searchParams }: AdminConfiguracionPageProps) {
  await requireAdminSession();

  const resolvedSearchParams = await searchParams;
  const activeTab = resolveSettingsTab(resolvedSearchParams?.tab);

  let content: ReactNode;
  switch (activeTab) {
    case "preferencias":
      content = <PreferencesSection />;
      break;
    case "arca":
      content = <ArcaSection />;
      break;
    case "integraciones":
      content = <IntegrationsSection integrations={getAdminIntegrations()} />;
      break;
    case "general":
    default:
      content = <GeneralSection business={await getAdminBusinessProfile()} />;
  }

  return <AdminSettingsShell active={activeTab}>{content}</AdminSettingsShell>;
}
