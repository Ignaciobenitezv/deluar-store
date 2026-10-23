import Image from "next/image";
import Link from "next/link";
import type { StorefrontCopy } from "@/features/storefront-copy/fields";

// Texts and photos from Configuración → Textos (photos fall back to the files in /public).
type EditorialImages = { first: string; second: string };

function buildEditorialCategories(copy: StorefrontCopy["editorial"], images: EditorialImages) {
  return [
    {
      id: "first",
      title: copy.firstTitle,
      description: copy.firstText,
      imageSrc: images.first,
      href: "/productos",
    },
    {
      id: "second",
      title: copy.secondTitle,
      description: copy.secondText,
      imageSrc: images.second,
      href: "/productos",
    },
  ];
}

export function HomeEditorialCategoryBanners({ copy, images }: { copy: StorefrontCopy["editorial"]; images: EditorialImages }) {
  return (
    <section className="w-full py-2 sm:py-4">
      <div className="grid w-full grid-cols-1 md:grid-cols-2">
        {buildEditorialCategories(copy, images).map((category) => (
          <article key={category.id} className="flex flex-col">
            <Link href={category.href} className="group block">
              <div className="relative h-[21.25rem] w-full overflow-hidden bg-line/60 md:h-[32.5rem] lg:h-[38.75rem]">
                <Image
                  src={category.imageSrc}
                  alt={category.title}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                />
              </div>
            </Link>

            <div className="mx-auto flex w-full max-w-[25rem] flex-col items-center px-6 pb-3 pt-9 text-center sm:px-8 sm:pb-4 sm:pt-10">
              <h2 className="text-2xl font-semibold leading-tight tracking-[0.01em] text-foreground md:text-3xl">
                {category.title}
              </h2>
              <p className="mt-3 max-w-[24rem] whitespace-pre-line text-[0.92rem] leading-7 text-muted sm:text-[0.98rem]">
                {category.description}
              </p>
              <Link
                href={category.href}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/14 px-5 text-[0.72rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/24 hover:bg-surface-raised/42"
              >
                {copy.cta}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
