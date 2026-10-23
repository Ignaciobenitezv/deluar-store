import type { ReactNode } from "react";
import { formatProductPrice } from "@/features/catalog/components/product-card-formatting";
import { archivo } from "@/features/home/fonts";
import type { ProductSummary } from "@/features/storefront-copy/editor";
import type { HomeHeroSurface } from "@/features/home/types";
import { RichText } from "@/features/storefront-copy/components/rich-text";
import { sectionImageSrc } from "@/features/storefront-copy/section-images";
import { framingStyle } from "@/features/storefront-copy/framing";
import type { HeroSlideTexts, ImageFraming, StorefrontCopy, StorefrontCopySectionId } from "@/features/storefront-copy/fields";
import type { ThemeTokens } from "@/features/theme/types";
import { cn } from "@/lib/utils";
import { previewStyle } from "./storefront-theme-preview";

// Miniatures of where each text lands on the store, painted with the store's
// palette (scoped to the frame, like the Apariencia preview) and the same
// token utilities. Not the real components, which need cart, catalogue and
// animation state: a faithful sketch of layout, hierarchy and colours.
// Inert: aria-hidden, no links or handlers.

export function PreviewFrame({ tokens, children, className }: { tokens: ThemeTokens; children: ReactNode; className?: string }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Vista previa</p>
      <div
        aria-hidden="true"
        style={previewStyle(tokens)}
        className={cn(
          "pointer-events-none select-none overflow-hidden rounded-xl border border-line bg-canvas text-ink",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Button({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center justify-center px-3 py-1.5 text-[10px] font-medium", className)}>{children}</span>;
}

const BENEFIT_ICON = <span className="mx-auto block h-3.5 w-3.5 rounded-full border-[1.5px] border-current opacity-70" />;

/** A product's photo, or an empty tile when there is none. */
function ProductPhoto({ product, className }: { product: ProductSummary | undefined; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden bg-line/60", className)}>
      {product?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Sanity CDN thumbnail, preview only
        <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

/** The products each list will show, for the previews that render them. */
export type PreviewProducts = { featured: ProductSummary[]; offers: ProductSummary[] };

function sectionPreview(section: StorefrontCopySectionId, copy: StorefrontCopy, products: PreviewProducts): ReactNode {
  switch (section) {
    case "announcement":
      return (
        <div className="bg-brand px-3 py-1.5 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-brand-foreground">
          {copy.announcement.text}
        </div>
      );

    case "navigation":
      return (
        <div className="bg-surface-raised">
          <div className="flex items-center justify-center border-b border-line/60 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static logo, preview only */}
            <img src="/deluarlogo.png" alt="" className="h-6 w-auto" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-3 py-2 text-[10.5px] text-ink">
            {Object.values(copy.navigation).map((label, index) => (
              <span key={index} className={index === 0 ? "border-b border-ink pb-0.5" : "pb-0.5"}>
                {label}
              </span>
            ))}
          </div>
        </div>
      );

    case "contact":
    case "footer":
      return (
        <div className="grid grid-cols-2 gap-4 bg-ink p-4 text-surface sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em]">{copy.footer.socialTitle}</p>
            <div className="flex gap-1.5">
              <span className="h-5 w-5 border border-surface/20" />
              <span className="h-5 w-5 border border-surface/20" />
            </div>
            <p className="text-[9.5px] leading-4 text-surface/65">{copy.footer.tagline}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em]">{copy.footer.contactTitle}</p>
            <ul className={cn("space-y-1 text-[9.5px] leading-4", section === "contact" ? "text-surface" : "text-surface/65")}>
              <li>{copy.contact.phone}</li>
              <li className="break-all">{copy.contact.email}</li>
              <li>{copy.contact.address}</li>
            </ul>
          </div>
          <div className="col-span-2 space-y-2 sm:col-span-1">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em]">{copy.footer.newsletterTitle}</p>
            <span className="block border border-surface/15 px-2 py-1.5 text-[9.5px] text-surface/55">
              {copy.footer.newsletterPlaceholder}
            </span>
            <span className="block bg-surface py-1.5 text-center text-[9.5px] font-medium text-ink">{copy.footer.newsletterButton}</span>
          </div>
          {section === "footer" ? (
            <p className="col-span-full border-t border-surface/10 pt-2 text-[9px] uppercase tracking-[0.18em] text-surface/55">
              {copy.footer.productsTitle} · {copy.footer.paymentsTitle}
            </p>
          ) : null}
        </div>
      );

    case "whatsapp":
      return (
        <div className="flex items-end justify-between gap-3 bg-canvas p-4">
          <p className="max-w-[16rem] rounded-xl bg-surface-raised p-2.5 text-[10px] leading-4 text-ink-muted">
            Mensaje al abrir el chat: <span className="text-ink">«{copy.whatsapp.message}»</span>
            <span className="mt-1 block text-[9px]">Al número {copy.whatsapp.number}</span>
          </p>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3 py-2 text-[10.5px] font-medium text-surface shadow-[0_8px_18px_color-mix(in_srgb,var(--ink)_25%,transparent)]">
            <span className="h-3 w-3 rounded-full border-[1.5px] border-current" />
            {copy.whatsapp.label}
          </span>
        </div>
      );

    case "categories":
      return (
        <div className="space-y-2.5 bg-surface-raised p-4">
          <p className="text-[15px] font-bold tracking-tight text-foreground">{copy.categories.title}</p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <span key={item} className="aspect-square rounded-lg bg-line/60" />
            ))}
          </div>
        </div>
      );

    case "newArrivals": {
      const words = copy.newArrivals.titleLead.split(" ");
      const last = words.pop();

      return (
        <div className="bg-canvas">
          <div className="flex items-end gap-3 p-4">
            <div className="flex shrink-0 gap-1">
              {[0, 1, 2].map((slot) => (
                <ProductPhoto key={slot} product={products.featured[slot]} className="h-20 w-11" />
              ))}
            </div>
            <div className="min-w-0">
              <p className={cn(archivo.className, "text-[2.1rem] font-extrabold leading-[0.82] tracking-[-0.03em] text-promo [font-stretch:75%]")}>
                {words.length > 0 ? `${words.join(" ")} ` : null}
                {last}
              </p>
              <p className={cn(archivo.className, "mt-1 text-[0.95rem] font-medium leading-none text-foreground [font-stretch:87.5%]")}>
                {copy.newArrivals.titleTail}
              </p>
              <p className="mt-2 text-[10px] text-muted">
                {products.featured.length} {products.featured.length === 1 ? "pieza recién llegada" : "piezas recién llegadas"} ·{" "}
                <span className="font-medium text-foreground">{copy.newArrivals.viewAll} →</span>
              </p>
            </div>
          </div>
          {/* The featured grid right below uses the same products, each with its promo band. */}
          <div className="grid grid-cols-4 gap-1.5 bg-surface-raised p-2.5">
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="min-w-0">
                <ProductPhoto product={products.featured[slot]} className="aspect-[4/5] w-full" />
                <p className="mt-1 truncate text-[8.5px] text-ink-muted">{products.featured[slot]?.title ?? " "}</p>
                <span className="mt-1 block bg-promo py-1 text-center text-[8px] font-extrabold uppercase text-promo-foreground">
                  Comprar
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "benefits": {
      const benefits = [
        { title: copy.benefits.shippingTitle, text: copy.benefits.shippingText, highlight: false },
        { title: copy.benefits.paymentTitle, text: copy.benefits.paymentText, highlight: true },
        { title: copy.benefits.installmentsTitle, text: copy.benefits.installmentsText, highlight: false },
      ];

      return (
        <div className="space-y-px">
          <div className="grid grid-cols-3 gap-px">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={cn(
                  "px-2 py-3 text-center",
                  benefit.highlight ? "bg-promo text-promo-foreground" : "bg-brand-alt text-brand-alt-foreground",
                )}
              >
                <p className={cn(archivo.className, "text-[1rem] font-extrabold leading-none [font-stretch:87.5%]")}>{benefit.title}</p>
                <p className="mt-1 text-[9.5px] leading-3 opacity-90">{benefit.text}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 bg-surface-raised px-2 py-4 text-center">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-foreground">
                {BENEFIT_ICON}
                <p className="mt-1.5 text-[11px] font-semibold">{benefit.title}</p>
                <p className="mt-0.5 text-[9.5px] leading-3 text-muted">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "editorial":
      return (
        <div className="grid grid-cols-2">
          {[
            { image: sectionImageSrc(copy.images, "editorialFirst", 900), framing: copy.imageFraming.editorialFirst, title: copy.editorial.firstTitle, text: copy.editorial.firstText },
            { image: sectionImageSrc(copy.images, "editorialSecond", 900), framing: copy.imageFraming.editorialSecond, title: copy.editorial.secondTitle, text: copy.editorial.secondText },
          ].map((banner, index) => (
            <div key={index} className="bg-canvas">
              <span className="block h-24 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- banner photo, preview only */}
                <img src={banner.image} alt="" className="h-full w-full object-cover" style={framingStyle(banner.framing)} />
              </span>
              <div className="px-3 pb-3 pt-3 text-center">
                <p className="text-[13px] font-semibold leading-tight text-foreground">{banner.title}</p>
                <p className="mt-1 whitespace-pre-line text-[9.5px] leading-4 text-muted">{banner.text}</p>
                <Button className="mt-2 rounded-full border border-foreground/15 uppercase tracking-[0.18em] text-foreground">
                  {copy.editorial.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      );

    case "offers":
      return (
        <div className="space-y-3 bg-surface-raised p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.24em] text-muted">{copy.offers.eyebrow}</p>
              <p className="mt-1 text-[15px] font-semibold leading-tight tracking-[0.02em] text-foreground">{copy.offers.title}</p>
            </div>
            <p className="shrink-0 text-[9.5px] uppercase tracking-[0.22em] text-foreground/80">{copy.offers.viewAll}</p>
          </div>
          <div className="grid grid-cols-[5rem_1fr] gap-3 rounded-lg bg-surface p-2.5">
            <ProductPhoto product={products.offers[0]} className="h-20 rounded-md" />
            <div className="min-w-0 space-y-1.5">
              <span className="inline-flex rounded-full border border-accent/50 bg-accent-soft/80 px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.16em] text-brand">
                {copy.offers.badge}
              </span>
              <p className="truncate text-[12px] font-semibold text-ink">{products.offers[0]?.title ?? "Sin productos en oferta"}</p>
              {products.offers[0] ? (
                <p className="text-[11px] font-semibold tabular-nums text-ink">{formatProductPrice(products.offers[0].basePrice)}</p>
              ) : null}
              <Button className="rounded-full border border-accent/80 bg-accent-soft uppercase tracking-[0.16em] text-brand">
                {copy.offers.productCta}
              </Button>
            </div>
          </div>
          {products.offers.length > 1 ? (
            <div className="flex gap-1">
              {products.offers.slice(1, 8).map((product) => (
                <ProductPhoto key={product.id} product={product} className="h-9 w-9 rounded" />
              ))}
            </div>
          ) : null}
        </div>
      );

    case "newsletter":
      return (
        <div className="relative overflow-hidden bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element -- static background, preview only */}
          <img src={sectionImageSrc(copy.images, "newsletter", 1200)} alt="" className="absolute inset-0 h-full w-full object-cover" style={framingStyle(copy.imageFraming.newsletter)} />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative space-y-1.5 p-5 text-white">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/70">{copy.newsletter.eyebrow}</p>
            <p className="text-[17px] font-medium leading-tight">{copy.newsletter.title}</p>
            <p className="max-w-sm whitespace-pre-line text-[10px] leading-4 text-white/80">{copy.newsletter.text}</p>
            <div className="flex gap-1.5 pt-1.5">
              <span className="flex-1 border border-white/35 bg-black/20 px-2 py-1.5 text-[10px] text-white/60">
                {copy.newsletter.placeholder}
              </span>
              <span className="bg-surface px-3 py-1.5 text-[10px] font-medium text-ink">{copy.newsletter.button}</span>
            </div>
          </div>
        </div>
      );

    case "pageContact":
      return (
        <div className="grid grid-cols-2 gap-4 bg-canvas p-4">
          <div>
            <p className="text-[9.5px] text-muted">
              {copy.navigation.home} / <span className="text-foreground">{copy.pageContact.title}</span>
            </p>
            <p className="mt-2 text-[16px] font-semibold text-foreground">{copy.pageContact.title}</p>
            <p className="mt-1.5 whitespace-pre-line text-[10px] leading-4 text-muted">{copy.pageContact.intro}</p>
            <ul className="mt-2.5 space-y-1 text-[10px] text-muted">
              <li>{copy.contact.phone}</li>
              <li className="break-all">{copy.contact.email}</li>
              <li>{copy.contact.address}</li>
            </ul>
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((item) => (
              <span key={item} className="block h-6 rounded border border-line bg-accent/30" />
            ))}
            <span className="block h-12 rounded border border-line bg-accent/30" />
          </div>
        </div>
      );

    case "pageHowToBuy":
      return (
        <div className="max-h-80 overflow-hidden bg-canvas p-4 [mask-image:linear-gradient(180deg,#000_85%,transparent)]">
          <p className="text-[16px] font-semibold text-foreground">{copy.pageHowToBuy.title}</p>
          <p className="mt-3 text-[11px] font-semibold text-foreground">{copy.pageHowToBuy.stepsTitle}</p>
          <ol className="mt-2 space-y-1.5">
            {copy.pageHowToBuy.steps
              .split("\n")
              .filter(Boolean)
              .map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-[10px] leading-4 text-muted">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-[8.5px] font-semibold text-foreground">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
          </ol>
          <p className="mt-3 text-[11px] font-semibold text-foreground">{copy.pageHowToBuy.extraTitle}</p>
          <div className="mt-2 origin-top-left scale-[0.8] [width:125%]">
            <RichText source={copy.pageHowToBuy.extra} />
          </div>
        </div>
      );

    case "pageReturns":
      return (
        <div className="max-h-96 overflow-hidden bg-canvas p-4 [mask-image:linear-gradient(180deg,#000_85%,transparent)]">
          <p className="mb-3 text-[16px] font-semibold text-foreground">{copy.pageReturns.title}</p>
          <div className="origin-top-left scale-[0.8] [width:125%]">
            <RichText source={copy.pageReturns.body} />
          </div>
        </div>
      );
  }
}

export function SectionPreview({
  section,
  copy,
  products,
  tokens,
}: {
  section: StorefrontCopySectionId;
  copy: StorefrontCopy;
  products: PreviewProducts;
  tokens: ThemeTokens;
}) {
  return <PreviewFrame tokens={tokens}>{sectionPreview(section, copy, products)}</PreviewFrame>;
}

// Same pairings as the hero's colour surfaces (home-hero-slider.tsx).
const HERO_SURFACES: Record<HomeHeroSurface, { panel: string; title: string; body: string; cta: string }> = {
  promo: { panel: "bg-promo", title: "text-promo-foreground", body: "text-promo-foreground/90", cta: "bg-promo-foreground text-ink" },
  sand: { panel: "bg-canvas-alt", title: "text-promo", body: "text-foreground/85", cta: "bg-cta text-cta-foreground" },
  brown: { panel: "bg-brand", title: "text-brand-foreground", body: "text-brand-foreground/85", cta: "bg-brand-foreground text-ink" },
};

/** One hero slide as it will look: its photo (or its colour surface), texts and buttons. */
export function HeroSlidePreview({
  texts,
  imageUrl,
  surface,
  products,
  framing,
  tokens,
}: {
  texts: HeroSlideTexts;
  imageUrl: string | null;
  surface: HomeHeroSurface;
  /** The two products on the right, as picked (or as they show now). */
  products: ProductSummary[];
  /** Hand-set framing of the photo. */
  framing?: ImageFraming;
  tokens: ThemeTokens;
}) {
  const colors = imageUrl
    ? { panel: "bg-ink", title: "text-white", body: "text-white/90", cta: "bg-white text-ink" }
    : HERO_SURFACES[surface];
  const showTag = texts.eyebrow.trim() !== "" && texts.eyebrow.trim().toLowerCase() !== "deluar";

  return (
    <PreviewFrame tokens={tokens}>
      <div className="grid grid-cols-[1.38fr_1fr] gap-0.5 bg-background">
        <div className={cn("relative isolate flex min-h-52 flex-col justify-between p-4", colors.panel)}>
          {imageUrl ? (
            <>
              <span className="absolute inset-0 -z-10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- Sanity CDN thumbnail, preview only */}
                <img src={imageUrl} alt="" className="h-full w-full object-cover" style={framingStyle(framing)} />
              </span>
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_0_0/0.35)_0%,rgb(0_0_0/0.25)_45%,rgb(0_0_0/0.65)_100%)]" />
            </>
          ) : null}
          <p className={cn(archivo.className, "text-[1.9rem] font-extrabold leading-[0.86] tracking-[-0.03em] [font-stretch:75%]", colors.title)}>
            {texts.title}
          </p>
          <div className="mt-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {showTag ? (
                <span className="rounded-full bg-promo px-2 py-1 text-[8.5px] font-bold uppercase leading-none tracking-[0.06em] text-promo-foreground">
                  {texts.eyebrow}
                </span>
              ) : null}
              {texts.text ? <span className={cn("text-[10.5px] leading-snug", colors.body)}>{texts.text}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button className={cn("rounded-md", colors.cta)}>{texts.ctaLabel || "Ver productos"}</Button>
              {texts.secondaryCtaLabel && texts.secondaryCtaHref ? (
                <span className={cn("text-[10px] font-medium", colors.title)}>{texts.secondaryCtaLabel} →</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid grid-rows-2 gap-0.5">
          {[0, 1].map((slot) => (
            <div key={slot} className="relative min-h-0 bg-canvas-alt">
              <ProductPhoto product={products[slot]} className="absolute inset-0 h-full w-full bg-canvas-alt" />
              {products[slot] ? (
                <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-surface px-1.5 py-1 shadow-sm">
                  <span className="block truncate text-[8.5px] text-foreground">{products[slot].title}</span>
                  <span className="block text-[9.5px] font-extrabold tabular-nums text-ink">
                    {formatProductPrice(products[slot].basePrice)}
                  </span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}

/** The rotating selection: one large product at a time, the rest queued. */
export function SpotlightPreview({ products, tokens }: { products: ProductSummary[]; tokens: ThemeTokens }) {
  const [current, ...rest] = products;

  return (
    <PreviewFrame tokens={tokens}>
      <div className="grid grid-cols-[1fr_1.2fr] items-center gap-4 bg-canvas p-4">
        <ProductPhoto product={current} className="aspect-square w-full rounded-lg" />
        <div className="min-w-0 space-y-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted">
            1 de {Math.max(products.length, 1)}
          </p>
          <p className="text-[15px] font-semibold leading-tight text-foreground">{current?.title ?? "Sin productos"}</p>
          {current ? <p className="text-[13px] font-extrabold tabular-nums text-ink">{formatProductPrice(current.basePrice)}</p> : null}
          {rest.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {rest.map((product) => (
                <ProductPhoto key={product.id} product={product} className="h-8 w-8 rounded opacity-70" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </PreviewFrame>
  );
}
