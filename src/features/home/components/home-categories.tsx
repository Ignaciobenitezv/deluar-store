import Image from "next/image";
import Link from "next/link";
import { HomeBenefitsMarquee } from "@/features/home/components/home-benefits-marquee";

type HomeCategoryVisual = {
  id: string;
  title: string;
  description?: string;
  href: string;
  imageUrl: string | null;
  imageAlt: string;
};

type HomeCategoriesProps = {
  categories: HomeCategoryVisual[];
};

export function HomeCategories({ categories }: HomeCategoriesProps) {
  return (
    <section className="space-y-7">
      <HomeBenefitsMarquee />

      {categories.length > 0 ? (
        <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
          <div className="overflow-hidden rounded-[2.25rem] border border-border/70 bg-surface/72">
            <div className="grid sm:grid-cols-1 lg:grid-cols-2">
              {categories.map((category, index) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className={`group relative block overflow-hidden ${
                    index > 0 ? "border-t border-white/10 lg:border-t-0" : ""
                  } ${
                    index % 2 === 1 ? "lg:border-l lg:border-white/10" : ""
                  } ${
                    index >= 2 ? "lg:border-t lg:border-white/10" : ""
                  }`}
                >
                  <div className="relative min-h-[21rem] sm:min-h-[23rem]">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={category.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 44vw, 100vw"
                        className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(234,223,207,0.98),rgba(207,188,168,0.95))]" />
                    )}

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,252,248,0.04)_0%,rgba(29,22,17,0.08)_42%,rgba(23,17,13,0.30)_100%)] transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[linear-gradient(180deg,rgba(255,252,248,0.02)_0%,rgba(24,18,14,0.14)_42%,rgba(18,13,10,0.48)_100%)]" />

                    <div className="absolute inset-0 flex items-end p-4 sm:p-5 lg:p-6">
                      <div className="w-full">
                        <div className="max-w-lg space-y-3 rounded-[1.4rem] border border-white/14 bg-[rgba(255,250,244,0.16)] px-5 py-5 text-white backdrop-blur-[4px] transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-4px] group-hover:bg-[rgba(255,250,244,0.20)] sm:px-6 sm:py-6">
                          <p className="text-[0.68rem] uppercase tracking-[0.26em] text-white/72 transition-colors duration-700 group-hover:text-white/78">
                            Categoria
                          </p>
                          <h3 className="text-2xl font-semibold tracking-[0.03em] transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-[-1px] sm:text-[2rem] lg:text-[2.3rem] lg:leading-[1.06]">
                            {category.title}
                          </h3>
                          <p className="max-w-lg text-sm leading-7 text-white/78 transition-colors duration-700 group-hover:text-white/84 sm:text-[0.98rem]">
                            {category.description ||
                              "Piezas seleccionadas para sumar textura, orden y calidez al ambiente."}
                          </p>
                          <span className="inline-flex items-center text-sm tracking-[0.08em] text-white/88 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-white">
                            Descubrir categoria
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.8rem] border border-border/80 bg-surface/92 px-6 py-8 text-sm leading-7 text-muted">
          Todavia no hay categorias cargadas para destacar en la portada.
        </div>
      )}
    </section>
  );
}
