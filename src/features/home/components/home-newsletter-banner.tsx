import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import type { ImageFraming, StorefrontCopy } from "@/features/storefront-copy/fields";
import { framingStyle } from "@/features/storefront-copy/framing";

export function HomeNewsletterBanner({
  copy,
  imageSrc,
  framing,
}: {
  copy: StorefrontCopy["newsletter"];
  imageSrc: string;
  /** Hand-set framing of the background photo (Configuración → Textos). */
  framing?: ImageFraming;
}) {
  return (
    <section className="relative -mb-14 w-full overflow-hidden bg-ink sm:-mb-16">
      {/* An image, not a CSS background, so the framing (focus and zoom) applies like everywhere else. */}
      <Image src={imageSrc} alt="" fill sizes="100vw" className="object-cover" style={framingStyle(framing)} aria-hidden="true" />
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <SiteContainer className="relative flex min-h-[22rem] items-center py-16 sm:min-h-[25rem] sm:py-20">
        <div className="w-full md:flex md:justify-end">
          <div className="max-w-xl space-y-5 text-white">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">{copy.eyebrow}</p>
              <h2 className="text-3xl font-medium tracking-[0.01em] sm:text-4xl">
                {copy.title}
              </h2>
              <p className="max-w-lg whitespace-pre-line text-sm leading-7 text-white/78 sm:text-base">
                {copy.text}
              </p>
            </div>

            <form className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="home-newsletter-email">
                Correo electrónico
              </label>
              <input
                id="home-newsletter-email"
                type="email"
                placeholder={copy.placeholder}
                className="h-12 min-w-0 flex-1 border border-white/35 bg-black/18 px-4 text-sm text-white outline-none transition placeholder:text-white/62 focus:border-white/60"
              />
              <button
                type="submit"
                className="h-12 shrink-0 bg-surface px-6 text-sm font-medium text-ink transition hover:bg-canvas"
              >
                {copy.button}
              </button>
            </form>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
