import { SiteContainer } from "@/components/layout/site-container";

export function HomeNewsletterBanner() {
  return (
    <section
      className="relative -mb-14 w-full overflow-hidden bg-neutral-900 sm:-mb-16"
      style={{
        backgroundImage: "url('/mdomi.jpg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <SiteContainer className="relative flex min-h-[22rem] items-center py-16 sm:min-h-[25rem] sm:py-20">
        <div className="w-full md:flex md:justify-end">
          <div className="max-w-xl space-y-5 text-white">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Newsletter</p>
              <h2 className="text-3xl font-medium tracking-[0.01em] sm:text-4xl">
                Recibi todas las ofertas
              </h2>
              <p className="max-w-lg text-sm leading-7 text-white/78 sm:text-base">
                Novedades, lanzamientos y oportunidades seleccionadas para tu casa en
                una sola suscripcion.
              </p>
            </div>

            <form className="flex w-full max-w-lg flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="home-newsletter-email">
                Email
              </label>
              <input
                id="home-newsletter-email"
                type="email"
                placeholder="Tu email"
                className="h-12 min-w-0 flex-1 border border-white/35 bg-black/18 px-4 text-sm text-white outline-none transition placeholder:text-white/62 focus:border-white/60"
              />
              <button
                type="submit"
                className="h-12 shrink-0 bg-white px-6 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
