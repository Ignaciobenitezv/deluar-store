"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  { src: "/payment-methods/other.png", alt: "Otro" },
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

type MobileFooterSection = "social" | "products" | "contact" | "payments";

export function SiteFooter({ navigation }: SiteFooterProps) {
  const [openSections, setOpenSections] = useState<MobileFooterSection[]>([]);

  const toggleSection = (section: MobileFooterSection) => {
    setOpenSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  };

  const isOpen = (section: MobileFooterSection) => openSections.includes(section);

  return (
    <footer className="w-full bg-ink text-surface">
      <SiteContainer className="py-14 sm:py-16 lg:py-20">
        <div className="md:hidden">
          <div>
            <button
              type="button"
              onClick={() => toggleSection("social")}
              className="flex w-full items-center justify-between border-b border-surface/10 py-4 text-left"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-surface">
                Seguinos
              </span>
              <span className="text-lg text-surface">{isOpen("social") ? "" : "+"}</span>
            </button>
            {isOpen("social") ? (
              <div className="space-y-5 pb-5 pt-4 text-sm text-surface/70">
                <div className="flex gap-3 text-surface/85">
                  <Link
                    href="https://www.instagram.com"
                    aria-label="Instagram"
                    className="flex h-10 w-10 items-center justify-center border border-surface/14 transition hover:border-surface/30 hover:text-surface"
                  >
                    <InstagramIcon />
                  </Link>
                  <Link
                    href="https://www.facebook.com"
                    aria-label="Facebook"
                    className="flex h-10 w-10 items-center justify-center border border-surface/14 transition hover:border-surface/30 hover:text-surface"
                  >
                    <FacebookIcon />
                  </Link>
                </div>
                <p className="max-w-xs leading-7 text-surface/65">
                  Inspiracion cotidiana, lanzamientos y piezas elegidas para cada espacio.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              onClick={() => toggleSection("products")}
              className="flex w-full items-center justify-between border-b border-surface/10 py-4 text-left"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-surface">
                Nuestros productos
              </span>
              <span className="text-lg text-surface">{isOpen("products") ? "" : "+"}</span>
            </button>
            {isOpen("products") ? (
              <div className="pb-5 pt-4 text-sm text-surface/70">
                <ul className="space-y-3 text-surface/65">
                  {navigation.categories.map((item) => (
                    <li key={item.label}>
                      <Link className="transition hover:text-surface" href={item.href}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              onClick={() => toggleSection("contact")}
              className="flex w-full items-center justify-between border-b border-surface/10 py-4 text-left"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-surface">
                Contactanos
              </span>
              <span className="text-lg text-surface">{isOpen("contact") ? "" : "+"}</span>
            </button>
            {isOpen("contact") ? (
              <div className="pb-5 pt-4 text-sm text-surface/70">
                <ul className="space-y-3 leading-7 text-surface/65">
                  <li>+54 3624750741</li>
                  <li>deluar2024@hotmail.com</li>
                  <li>Resistencia - Chaco - Argentina</li>
                </ul>
              </div>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              onClick={() => toggleSection("payments")}
              className="flex w-full items-center justify-between border-b border-surface/10 py-4 text-left"
            >
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-surface">
                Medios de pago
              </span>
              <span className="text-lg text-surface">{isOpen("payments") ? "" : "+"}</span>
            </button>
            {isOpen("payments") ? (
              <div className="pb-5 pt-4 text-sm text-surface/70">
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
            ) : null}
          </div>

          <div className="space-y-5 pt-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
              Novedades
            </h2>
            <form className="space-y-3">
              <label className="sr-only" htmlFor="footer-newsletter-email-mobile">
                Correo electrónico
              </label>
              <input
                id="footer-newsletter-email-mobile"
                type="email"
                placeholder="Tu correo"
                className="h-11 w-full border border-surface/14 bg-transparent px-4 text-sm text-surface outline-none transition placeholder:text-surface/55 focus:border-surface/30"
              />
              <button
                type="submit"
                className="h-11 w-full bg-surface px-4 text-sm font-medium text-ink transition hover:bg-canvas"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>

        <div className="hidden grid-cols-1 gap-x-8 gap-y-10 md:grid md:grid-cols-2 lg:grid-cols-[0.9fr_1.05fr_0.95fr_1.15fr_0.95fr] lg:gap-x-10">
          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
              Seguinos
            </h2>
            <div className="flex gap-3 text-surface/85">
              <Link
                href="https://www.instagram.com"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center border border-surface/14 transition hover:border-surface/30 hover:text-surface"
              >
                <InstagramIcon />
              </Link>
              <Link
                href="https://www.facebook.com"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center border border-surface/14 transition hover:border-surface/30 hover:text-surface"
              >
                <FacebookIcon />
              </Link>
            </div>
            <p className="max-w-xs text-sm leading-7 text-surface/65">
              Inspiracion cotidiana, lanzamientos y piezas elegidas para cada espacio.
            </p>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
              Nuestros productos
            </h2>
            <ul className="space-y-3 text-sm text-surface/65">
              {navigation.categories.map((item) => (
                <li key={item.label}>
                  <Link className="transition hover:text-surface" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
              Contactanos
            </h2>
            <ul className="space-y-3 text-sm leading-7 text-surface/65">
              <li>+54 3624750741</li>
              <li>deluar2024@hotmail.com</li>
              <li>Resistencia - Chaco - Argentina</li>
            </ul>
          </div>

          <div className="space-y-5">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
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
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-surface">
              Novedades
            </h2>
            <form className="space-y-3">
              <label className="sr-only" htmlFor="footer-newsletter-email">
                Correo electrónico
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Tu correo"
                className="h-11 w-full border border-surface/14 bg-transparent px-4 text-sm text-surface outline-none transition placeholder:text-surface/55 focus:border-surface/30"
              />
              <button
                type="submit"
                className="h-11 w-full bg-surface px-4 text-sm font-medium text-ink transition hover:bg-canvas"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </SiteContainer>
      <SiteContainer className="border-t border-surface/10 py-5 text-xs uppercase tracking-[0.18em] text-surface/55">
        {siteConfig.name}
      </SiteContainer>
    </footer>
  );
}
