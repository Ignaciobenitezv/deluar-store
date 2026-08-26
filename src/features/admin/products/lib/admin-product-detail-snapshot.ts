import { getSanityImageUrl } from "@/integrations/sanity/image";
import type { AdminProductDetailData, AdminProductImageData } from "../types";

export const ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE = "admin_product_detail_snapshot";

type AdminProductDetailSnapshotImage = {
  key: string;
  alt: string;
  assetRef: string;
};

export type AdminProductDetailSnapshot = {
  productId: string;
  rev: string;
  updatedAt: string;
  images: AdminProductDetailSnapshotImage[];
};

function isAdminProductDetailSnapshotImage(value: unknown): value is AdminProductDetailSnapshotImage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AdminProductDetailSnapshotImage>;

  return (
    typeof candidate.key === "string" &&
    typeof candidate.alt === "string" &&
    typeof candidate.assetRef === "string"
  );
}

export function buildAdminProductDetailSnapshot(
  productId: string,
  rev: string,
  updatedAt: string,
  images: AdminProductImageData[],
): AdminProductDetailSnapshot {
  return {
    productId,
    rev,
    updatedAt,
    images: images.map((image) => ({
      key: image.key,
      alt: image.alt,
      assetRef: image.assetRef,
    })),
  };
}

export function serializeAdminProductDetailSnapshot(snapshot: AdminProductDetailSnapshot) {
  return encodeURIComponent(JSON.stringify(snapshot));
}

export function deserializeAdminProductDetailSnapshot(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Partial<AdminProductDetailSnapshot> & { images?: unknown };

    if (
      typeof candidate.productId !== "string" ||
      typeof candidate.rev !== "string" ||
      typeof candidate.updatedAt !== "string" ||
      !Array.isArray(candidate.images)
    ) {
      return null;
    }

    const images = candidate.images.filter(isAdminProductDetailSnapshotImage);

    return {
      productId: candidate.productId,
      rev: candidate.rev,
      updatedAt: candidate.updatedAt,
      images,
    } satisfies AdminProductDetailSnapshot;
  } catch {
    return null;
  }
}

function resolveSnapshotImages(images: AdminProductDetailSnapshotImage[]): AdminProductImageData[] {
  return images.flatMap((image) => {
    const imageUrl = getSanityImageUrl(
      {
        _type: "imageWithAlt",
        alt: image.alt,
        image: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: image.assetRef,
          },
        },
      },
      640,
      640,
    );

    return [
      {
        key: image.key,
        alt: image.alt,
        url: imageUrl,
        assetRef: image.assetRef,
      },
    ];
  });
}

export function applyAdminProductDetailSnapshot(
  product: AdminProductDetailData,
  snapshot: AdminProductDetailSnapshot | null,
): AdminProductDetailData {
  if (!snapshot || snapshot.productId !== product.id) {
    return product;
  }

  const productUpdatedAt = new Date(product.updatedAt).getTime();
  const snapshotUpdatedAt = new Date(snapshot.updatedAt).getTime();

  if (!Number.isFinite(snapshotUpdatedAt) || snapshotUpdatedAt <= productUpdatedAt) {
    return product;
  }

  const images = resolveSnapshotImages(snapshot.images);
  const primaryImage = images[0] ?? null;

  return {
    ...product,
    rev: snapshot.rev,
    updatedAt: snapshot.updatedAt,
    images,
    imageUrl: primaryImage?.url ?? null,
    imageAlt: primaryImage?.alt?.trim() || product.title,
  };
}
