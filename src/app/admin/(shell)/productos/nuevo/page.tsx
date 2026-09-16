import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminProductDetailForm } from "@/features/admin/products/components/admin-product-detail-form";
import { AdminProductRevisionProvider } from "@/features/admin/products/context/admin-product-revision-context";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Crear producto | Administración de DOTCOM",
};

export default async function AdminProductCreatePage() {
  await requireAdminSession();
  noStore();

  const categoryTree = await sanityFreshFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {});

  return (
    // No document exists yet, so there is no rev/updatedAt to seed this
    // with — the same provider still has to be mounted here (not only on
    // the [productId] route), because the first successful create flips
    // this screen into edit mode in place, and Galería/Variantes/the
    // revision-sync effect all read this context unconditionally.
    <AdminProductRevisionProvider initialRev="" initialUpdatedAt="">
      <AdminProductsShell>
        <div className="grid gap-1">
          <h1 className="text-[1.125rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.375rem]">
            Crear producto
          </h1>
          <p className="text-[12.5px] leading-5 text-text-secondary">
            Completá el producto en el orden que prefieras. Podés cargar información, imágenes, variantes, precios y revisar la vista previa antes de crearlo.
          </p>
        </div>

        <AdminProductDetailForm product={null} categoryTree={categoryTree} mode="create" />
      </AdminProductsShell>
    </AdminProductRevisionProvider>
  );
}
