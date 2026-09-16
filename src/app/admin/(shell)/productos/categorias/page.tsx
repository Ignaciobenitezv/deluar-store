import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { requireAdminSession } from "@/features/admin/auth";
import { AdminProductsShell } from "@/features/admin/products/components/admin-products-shell";
import { AdminCategoryList } from "@/features/admin/categories/components/admin-category-list";
import { getAdminCategoryTree } from "@/features/admin/categories/server/admin-category-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categorías | Administración de DOTCOM",
};

export default async function AdminCategoriesPage() {
  await requireAdminSession();
  noStore();

  const tree = await getAdminCategoryTree();

  return (
    <AdminProductsShell>
      <div className="grid gap-1">
        <h1 className="text-[1.25rem] font-semibold tracking-[-0.015em] text-text-primary sm:text-[1.5rem]">
          Categorías
        </h1>
        <p className="text-[12.5px] text-text-secondary">
          Categorías y subcategorías que usan los productos del catálogo.
        </p>
      </div>

      <AdminCategoryList initialTree={tree} />
    </AdminProductsShell>
  );
}
