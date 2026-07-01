import { env } from "@/lib/env";

export function buildSiteUrl(path: string) {
  return new URL(path, env.siteUrl).toString();
}
