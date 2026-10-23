import { getSanityAssetUrl } from "@/integrations/sanity/image";
import { SECTION_IMAGES, type SectionImageId, type SectionImages } from "./fields";

/**
 * The photo a block shows: the replacement uploaded in the admin (from the
 * Sanity CDN, at most `width` wide, uncropped) or the original file.
 */
export function sectionImageSrc(images: SectionImages, id: SectionImageId, width = 1600) {
  const assetRef = images[id];
  return (assetRef && getSanityAssetUrl(assetRef, width)) || SECTION_IMAGES[id].default;
}
