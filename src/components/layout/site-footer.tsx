import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SiteContainer } from "@/components/layout/site-container";
import type { StorefrontNavigation } from "@/types/navigation";

const paymentMethods = [
  { src: "/payment-methods/amex.png", alt: "Amex" },
  { src: "/payment-methods/argencard.png", alt: "Argencard" },
  { src: "/payment-methods/cabal.png", alt: "Cabal" },
  { src: "/payment-methods/cabaldebito.png", alt: "Cabal debito" },
  { src: "/payment-methods/cencosud.png", alt: "Cencosud" },
  { src: "/payment-methods/maestro.png", alt: "Maestro" },
  { src: "/payment-methods/mastercard.png", alt: "Mastercard" },
  { src: "/payment-methods/mastercarddebito.png", alt: "Mastercard debito" },
  { src: "/payment-methods/naranja.png", alt: "Naranja" },
  { src: "/payment-methods/nativa.png", alt: "Nativa" },
  { src: "/payment-methods/other.png", alt: "Other" },
  { src: "/payment-methods/visa.png", alt: "Visa" },
  { src: "/payment-methods/visadebito.png", alt: "Visa debito" },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.25" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" strokeWidth="1.5" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M13.33 21v-8.03h2.7l.4-3.13h-3.1V7.86c0-.9.25-1.52 1.54-1.52H16.7V3.55c-.32-.04-1.43-.14-2.72-.14-2.69 0-4.53 1.65-4.53 4.68v1.75H6.4v3.13h3.05V21h3.88Z" />
    </svg>
  );
}

type SiteFooterProps = {
  navigation: StorefrontNavigation;
};

export function SiteFooter({ navigation }: SiteFooterProps) {
  return (
    <footer className="w-full bg-neutral-900 text-white">
      <SiteContainer className="py-14 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-[0.9fr_1.05fr_0.95fr_1.15fr_0.95fr] lg:gap-x-10">
          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Seguinos
            </h2>
            <div className="flex gap-3 text-neutral-300">
              <Link
                href="https://www.instagram.com"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center border border-white/14 transition hover:border-white/30 hover:text-white"
              >
                <InstagramIcon />
              </Link>
              <Link
                href="https://www.facebook.com"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center border border-white/14 transition hover:border-white/30 hover:text-white"
              >
                <FacebookIcon />
              </Link>
            </div>
            <p className="max-w-xs text-sm leading-7 text-neutral-400">
              Inspiracion cotidiana, lanzamientos y piezas elegidas para cada espacio.
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Nuestros productos
            </h2>
            <ul className="space-y-3 text-sm text-neutral-400">
              {navigation.categories.map((item) => (
                <li key={item.label}>
                  <Link className="transition hover:text-white" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Contactanos
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-neutral-400">
              <li>+54 3624750741</li>
              <li>deluar2024@hotmail.com</li>
              <li>Resistencia - Chaco - Argentina</li>
            </ul>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Medios de pago
            </h2>
            <ul className="inline-grid grid-cols-[repeat(4,60px)] gap-x-2 gap-y-2">
              {paymentMethods.map((method) => (
                <li
                  key={method.src}
                  className="flex h-[42px] w-[60px] items-center justify-center rounded-md bg-white p-2"
                >
                  <Image
                    src={method.src}
                    alt={method.alt}
                    width={40}
                    height={24}
                    className="h-[20px] w-auto object-contain"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Newsletter
            </h2>
            <form className="space-y-3">
              <label className="sr-only" htmlFor="footer-newsletter-email">
                Email
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Tu email"
                className="h-11 w-full border border-white/14 bg-transparent px-4 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-white/30"
              />
              <button
                type="submit"
                className="h-11 w-full bg-white px-4 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </SiteContainer>
      <SiteContainer className="border-t border-white/10 py-5 text-xs uppercase tracking-[0.18em] text-neutral-500">
        {siteConfig.name}
      </SiteContainer>
    </footer>
  );
}
