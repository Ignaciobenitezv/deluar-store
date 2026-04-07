import { HomeCategoryShowcase } from "@/features/home/components/home-category-showcase";
import { HomeBenefitsStrip } from "@/features/home/components/home-benefits-strip";
import type { HomeCategoryShowcaseItem } from "@/features/home/types";

type HomeCategoriesProps = {
  categories: HomeCategoryShowcaseItem[];
};

export function HomeCategories({ categories }: HomeCategoriesProps) {
  return (
    <section>
      <HomeBenefitsStrip />
      <HomeCategoryShowcase categories={categories} />
    </section>
  );
}
