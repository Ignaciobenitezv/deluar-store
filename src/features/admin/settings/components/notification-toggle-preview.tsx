"use client";

import { Switch } from "@/components/admin/ui/switch";

/**
 * `Switch` takes an `onCheckedChange` event-handler prop, which a Server
 * Component cannot pass across the server/client boundary (functions aren't
 * serializable in the RSC payload) — so this tiny island is its own Client
 * Component instead of PreferencesSection (a Server Component) rendering
 * `<Switch>` directly. Always unchecked, disabled, and the handler is a
 * no-op: these notification preferences don't exist functionally yet (see
 * PreferencesSection's doc comment), so nothing here should look or behave
 * like it persists a choice.
 */
export function NotificationTogglePreview({ label }: { label: string }) {
  return <Switch checked={false} onCheckedChange={() => {}} label={label} disabled />;
}
