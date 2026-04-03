import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SiteContainer } from "@/components/layout/site-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.74),rgba(244,237,228,0.95))]">
      <SiteContainer className="grid gap-10 py-12 sm:py-14 lg:grid-cols-[1.3fr_0.8fr_0.8fr]">
        <div className="max-w-md space-y-4">
          <div>
            <p className="text-[1.1rem] font-semibold tracking-[0.2em]">{siteConfig.name}</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Piezas para hogar y decoracion con una presentacion clara, sobria y
              preparada para crecer sobre una base tecnica ordenada.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted">Explorar</h2>
          <ul className="space-y-3 text-sm">
            <li><Link href="/living">Living</Link></li>
            <li><Link href="/decoracion">Decoracion</Link></li>
            <li><Link href="/textiles">Textiles</Link></li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted">Informacion</h2>
          <ul className="space-y-3 text-sm">
            <li><Link href="/nosotros">Nosotros</Link></li>
            <li><Link href="/contacto">Contacto</Link></li>
            <li><Link href="/envios">Envios</Link></li>
          </ul>
        </div>
      </SiteContainer>
      <SiteContainer className="border-t border-border/80 py-5 text-xs uppercase tracking-[0.18em] text-muted">
        DELUAR storefront scaffold
      </SiteContainer>
    </footer>
  );
}
