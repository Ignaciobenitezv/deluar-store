import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageWithAlt } from "@/types/cms";
import { sanityConfig } from "@/integrations/sanity/config";

const builder = createImageUrlBuilder({
  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,
});

export function getSanityImageUrl(
  source?: SanityImageWithAlt,
  width = 900,
  height = 1120,
) {
  if (!source?.image?.asset?._ref || !sanityConfig.projectId || !sanityConfig.dataset) {
    return null;
  }

  return builder.image(source.image).width(width).height(height).fit("crop").auto("format").url();
}
