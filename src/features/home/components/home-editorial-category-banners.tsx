import Image from "next/image";
import Link from "next/link";

const editorialCategories = [
  {
    title: "Mesa & Comedor",
    description: "Diseño y estilo para vestir tu mesa con personalidad.",
    imageSrc: "/mcome.jpg",
    imageAlt: "Mesa y comedor Deluar",
    href: "/productos",
  },
  {
    title: "Decoración & Hogar",
    description: "Detalles que transforman tus espacios todos los días.",
    imageSrc: "/mdomi.jpg",
    imageAlt: "Decoracion y hogar Deluar",
    href: "/productos",
  },
] as const;

export function HomeEditorialCategoryBanners() {
  return (
    <section className="w-full py-2 sm:py-4">
      <div className="grid w-full grid-cols-1 md:grid-cols-2">
        {editorialCategories.map((category) => (
          <article key={category.title} className="flex flex-col">
            <Link href={category.href} className="group block">
              <div className="relative h-[21.25rem] w-full overflow-hidden bg-[#efe7dc] md:h-[32.5rem] lg:h-[38.75rem]">
                <Image
                  src={category.imageSrc}
                  alt={category.imageAlt}
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
              <p className="mt-3 max-w-[24rem] text-[0.92rem] leading-7 text-muted sm:text-[0.98rem]">
                {category.description}
              </p>
              <Link
                href={category.href}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-foreground/14 px-5 text-[0.72rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/24 hover:bg-white/42"
              >
                Conocer mas
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
