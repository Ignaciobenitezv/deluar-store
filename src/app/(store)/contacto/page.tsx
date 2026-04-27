import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SiteContainer } from "@/components/layout/site-container";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Contacto",
  description: "Contactate con DELUAR Deco Home. Teléfono, email y formulario de consulta.",
  path: "/contacto",
});

export default function ContactoPage() {
  return (
    <SiteContainer className="py-10 sm:py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Contacto</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Contacto
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted">
            Dejanos tu consulta y a la brevedad nos estaremos comunicando! DELUAR Deco Home
          </p>

          <ul className="space-y-4 text-sm text-muted">
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
              </svg>
              <span>+54 3624750741</span>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <a href="mailto:deluar2024@hotmail.com" className="hover:text-foreground transition-colors">
                deluar2024@hotmail.com
              </a>
            </li>
            <li className="flex items-center gap-3">
              <svg className="h-4 w-4 shrink-0 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>Resistencia - Chaco - Argentina</span>
            </li>
          </ul>
        </div>

        <div>
          <form className="space-y-4">
            <div>
              <label htmlFor="nombre" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                Nombre
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="telefono" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                Teléfono <span className="font-normal normal-case tracking-normal text-muted">(Opcional)</span>
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="mensaje" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground">
                Mensaje <span className="font-normal normal-case tracking-normal text-muted">(Opcional)</span>
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows={5}
                className="w-full resize-none rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </SiteContainer>
  );
}
