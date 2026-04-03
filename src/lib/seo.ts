import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

type BuildMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
};

function normalizePath(path = "/") {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildAbsoluteUrl(path = "/") {
  return new URL(normalizePath(path), siteConfig.url).toString();
}

export function buildMetadata({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const canonical = buildAbsoluteUrl(path);
  const resolvedDescription = description || siteConfig.description;
  const images = image ? [{ url: image }] : undefined;

  return {
    title,
    description: resolvedDescription,
    alternates: {
      canonical,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description: resolvedDescription,
      siteName: siteConfig.name,
      locale: "es_AR",
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
      description: resolvedDescription,
      images: image ? [image] : undefined,
    },
  };
}
