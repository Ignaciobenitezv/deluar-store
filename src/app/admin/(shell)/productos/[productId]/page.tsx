import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminProductDetailForm } from "@/features/admin/products/components/admin-product-detail-form";
import { getAdminProductDetailPageData } from "@/features/admin/products/server/admin-product-detail-service";
import { AdminProductRevisionProvider } from "@/features/admin/products/context/admin-product-revision-context";
import {
  ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
  applyAdminProductDetailSnapshot,
  deserializeAdminProductDetailSnapshot,
} from "@/features/admin/products/lib/admin-product-detail-snapshot";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type AdminProductDetailPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export async function generateMetadata({ params }: AdminProductDetailPageProps): Promise<Metadata> {
  const { productId } = await params;

  return {
    title: `Editar producto | ${productId}`,
  };
}

export default async function AdminProductDetailPage({ params }: AdminProductDetailPageProps) {
  await requireAdminSession();

  const { productId } = await params;
  const pageData = await getAdminProductDetailPageData(productId);

  if (!pageData) {
    notFound();
  }

  const cookieStore = await cookies();
  const snapshot = deserializeAdminProductDetailSnapshot(cookieStore.get(ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE)?.value);
  const { product, categoryTree } = {
    product: applyAdminProductDetailSnapshot(pageData.product, snapshot),
    categoryTree: pageData.categoryTree,
  };

  logger.debug("admin.products.images.page_loaded", {
    productId,
    id: product.id,
    rev: product.rev,
    updatedAt: product.updatedAt,
    imagesCount: product.images.length,
    sanityRev: pageData.product.rev,
    sanityUpdatedAt: pageData.product.updatedAt,
    sanityImagesCount: pageData.product.images.length,
    snapshotRev: snapshot?.rev ?? null,
    snapshotUpdatedAt: snapshot?.updatedAt ?? null,
    snapshotApplied: product.rev === snapshot?.rev,
  });

  logger.debug("admin.products.detail.page_loaded", {
    productId,
    rev: product.rev,
    updatedAt: product.updatedAt,
    stock: product.stock,
    isActive: product.visible,
    isFeatured: product.isFeatured,
    isOnOffer: product.isOnOffer,
    showInNewIn: product.showInNewIn,
    newInOrder: product.newInOrder,
  });

  if (snapshot && snapshot.productId === productId) {
    logger.debug("admin.products.detail.snapshot_applied", {
      productId,
      snapshotRev: snapshot.rev,
      snapshotUpdatedAt: snapshot.updatedAt,
      snapshotImages: snapshot.images.length,
      productRev: pageData.product.rev,
      productUpdatedAt: pageData.product.updatedAt,
      productImages: pageData.product.images.length,
      applied: product.rev === snapshot.rev,
    });
  } else {
    logger.debug("admin.products.detail.snapshot_not_applied", {
      productId,
      productRev: pageData.product.rev,
      productUpdatedAt: pageData.product.updatedAt,
      productImages: pageData.product.images.length,
      snapshotPresent: Boolean(snapshot),
    });
  }

  return (
    <AdminProductRevisionProvider initialRev={product.rev} initialUpdatedAt={product.updatedAt}>
      <AdminProductsShell updatedAt={product.updatedAt}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <h1 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.375rem]">
              Editar producto
            </h1>
            <p className="text-[12.5px] leading-5 text-text-secondary">
              Administrá los datos principales del producto sin entrar a Sanity Studio.
            </p>
          </div>

          {product.visible && product.hiddenByStock ? (
            <span className="inline-flex w-fit items-center rounded-md border border-warning/25 bg-warning-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
              Oculto por falta de stock
            </span>
          ) : null}
        </div>

        <AdminProductDetailForm product={product} categoryTree={categoryTree} mode="edit" />
      </AdminProductsShell>
    </AdminProductRevisionProvider>
  );
}


