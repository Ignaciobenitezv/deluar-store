import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_STOREFRONT_COPY } from "./fields";
import {
  applyHeroOverrides,
  copyToFields,
  resolveStorefrontCopy,
  sanitizeStorefrontCopyFields,
  whatsappHref,
} from "./storefront-copy-document";

test("no document: every default", () => {
  assert.deepEqual(resolveStorefrontCopy(null), DEFAULT_STOREFRONT_COPY);
  assert.deepEqual(resolveStorefrontCopy({}), DEFAULT_STOREFRONT_COPY);
});

test("stored texts override their own field only", () => {
  const copy = resolveStorefrontCopy({ benefits: { paymentTitle: "30% OFF" }, newsletter: { button: "Suscribirme" } });

  assert.equal(copy.benefits.paymentTitle, "30% OFF");
  assert.equal(copy.benefits.shippingTitle, DEFAULT_STOREFRONT_COPY.benefits.shippingTitle);
  assert.equal(copy.newsletter.button, "Suscribirme");
  assert.deepEqual(copy.footer, DEFAULT_STOREFRONT_COPY.footer);
});

test("reads are lenient: an unreadable field falls back alone", () => {
  const copy = resolveStorefrontCopy({
    benefits: { paymentTitle: 42, shippingTitle: "Envío gratis" },
    footer: { instagramUrl: "javascript:alert(1)" },
    contact: { email: "x".repeat(500) },
    offers: "not an object",
  });

  assert.equal(copy.benefits.paymentTitle, DEFAULT_STOREFRONT_COPY.benefits.paymentTitle);
  assert.equal(copy.benefits.shippingTitle, "Envío gratis");
  assert.equal(copy.footer.instagramUrl, DEFAULT_STOREFRONT_COPY.footer.instagramUrl);
  assert.equal(copy.contact.email, DEFAULT_STOREFRONT_COPY.contact.email);
  assert.deepEqual(copy.offers, DEFAULT_STOREFRONT_COPY.offers);
});

test("writes are strict and report every problem", () => {
  const result = sanitizeStorefrontCopyFields({
    footer: { instagramUrl: "javascript:alert(1)" },
    contact: { phone: "llamame" },
    benefits: { paymentTitle: "x".repeat(200) },
  });

  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.issues.length, 3);
});

test("writes keep only what differs from the defaults, normalised", () => {
  const result = sanitizeStorefrontCopyFields({
    announcement: { text: "  Envíos   gratis \n desde $50.000  " },
    benefits: { shippingTitle: DEFAULT_STOREFRONT_COPY.benefits.shippingTitle, paymentTitle: "" },
    newsletter: { text: "Línea uno\n\n\n\nLínea dos" },
    unknownSection: { anything: "ignored" },
  });

  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.fields.announcement, { text: "Envíos gratis desde $50.000" });
  assert.deepEqual(result.ok && result.fields.benefits, {});
  assert.deepEqual(result.ok && result.fields.newsletter, { text: "Línea uno\n\nLínea dos" });
  assert.equal(result.ok && "unknownSection" in result.fields, false);
});

test("copyToFields stores only changed texts and treats blank as the default", () => {
  const copy = structuredClone(DEFAULT_STOREFRONT_COPY);
  copy.offers.title = "Nuevas ofertas ";
  copy.offers.badge = "   ";

  const fields = copyToFields(copy);

  assert.deepEqual(fields.offers, { title: "Nuevas ofertas" });
  assert.deepEqual(fields.footer, {});
});

test("WhatsApp link keeps only the digits and encodes the message", () => {
  assert.equal(
    whatsappHref({ label: "Ayuda", number: "+54 9 362 444-8683", message: "Hola, ¿tienen stock?" }),
    "https://wa.me/5493624448683?text=Hola%2C%20%C2%BFtienen%20stock%3F",
  );
});

test("hero corrections: kept per slide, only valid texts and keys", () => {
  const result = sanitizeStorefrontCopyFields({
    heroSlides: [
      { _key: "slide-b", title: "Nueva temporada", ctaHref: "/productos/cocina" },
      { _key: "slide-a", text: "  " },
    ],
  });

  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.fields.heroSlides, [
    { _key: "slide-b", _type: "heroSlideCopy", title: "Nueva temporada", ctaHref: "/productos/cocina" },
  ]);

  const invalid = sanitizeStorefrontCopyFields({
    heroSlides: [{ _key: "a b", title: "x" }, { _key: "ok", ctaHref: "//evil.example" }],
  });

  assert.equal(invalid.ok, false);
  assert.equal(!invalid.ok && invalid.issues.length, 2);
});

const imageUrlsFor = (ref: string) => ({ imageUrl: `desktop:${ref}`, mobileImageUrl: `mobile:${ref}` });

test("hero corrections apply over the slide texts on read", () => {
  const copy = resolveStorefrontCopy({ heroSlides: [{ _key: "s1", title: "Corregido", ctaHref: "javascript:x" }] });
  const slides = applyHeroOverrides(
    [
      { id: "s1", title: "Original", ctaHref: "/productos" },
      { id: "s2", title: "Otra", ctaHref: "/" },
    ],
    copy.heroSlides,
    imageUrlsFor,
  );

  assert.deepEqual(slides, [
    { id: "s1", title: "Corregido", ctaHref: "/productos" },
    { id: "s2", title: "Otra", ctaHref: "/" },
  ]);
});

test("lists drop blank lines; rich text keeps paragraph breaks", () => {
  const result = sanitizeStorefrontCopyFields({
    pageHowToBuy: { steps: "Paso uno\n\n\nPaso dos\r\n" },
    pageReturns: { body: "## Título\nTexto\n\n\n\n- Punto" },
  });

  assert.ok(result.ok);
  assert.equal(result.ok && result.fields.pageHowToBuy.steps, "Paso uno\nPaso dos");
  assert.equal(result.ok && result.fields.pageReturns.body, "## Título\nTexto\n\n- Punto");
});

const ASSET = "image-abc123-1800x1200-jpg";

test("hero photo: a replacement, a removal, or an invalid reference", () => {
  const result = sanitizeStorefrontCopyFields({
    heroSlides: [
      { _key: "s1", image: { _type: "image", asset: { _type: "reference", _ref: ASSET } } },
      { _key: "s2", imageRemoved: true, image: { asset: { _ref: ASSET } } },
    ],
  });

  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.fields.heroSlides, [
    { _key: "s1", _type: "heroSlideCopy", image: { _type: "image", asset: { _type: "reference", _ref: ASSET } } },
    { _key: "s2", _type: "heroSlideCopy", imageRemoved: true },
  ]);

  const invalid = sanitizeStorefrontCopyFields({ heroSlides: [{ _key: "s1", image: { asset: { _ref: "not-an-asset" } } }] });
  assert.equal(invalid.ok, false);
});

test("hero photo choices round-trip and apply on the store", () => {
  const copy = structuredClone(DEFAULT_STOREFRONT_COPY);
  copy.heroSlides = { s1: { image: { assetRef: ASSET } }, s2: { image: "removed", title: "Sin foto" } };

  const reread = resolveStorefrontCopy(copyToFields(copy));
  assert.deepEqual(reread.heroSlides, copy.heroSlides);

  const slides = applyHeroOverrides(
    [
      { id: "s1", title: "A", imageUrl: "studio-a", mobileImageUrl: "studio-a-m" },
      { id: "s2", title: "B", imageUrl: "studio-b", mobileImageUrl: null },
      { id: "s3", title: "C", imageUrl: "studio-c", mobileImageUrl: null },
    ],
    reread.heroSlides,
    imageUrlsFor,
  );

  assert.deepEqual(slides, [
    { id: "s1", title: "A", imageUrl: `desktop:${ASSET}`, mobileImageUrl: `mobile:${ASSET}` },
    { id: "s2", title: "Sin foto", imageUrl: null, mobileImageUrl: null },
    { id: "s3", title: "C", imageUrl: "studio-c", mobileImageUrl: null },
  ]);
});

test("product lists: stored as weak references in order, empty lists stay automatic", () => {
  const result = sanitizeStorefrontCopyFields({
    productLists: { featured: ["prod-b", "prod-a", "prod-b"], offers: [] },
    heroSlides: [{ _key: "s1", products: ["prod-c"] }],
  });

  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.fields.productLists, {
    featured: [
      { _key: "p0", _type: "reference", _ref: "prod-b", _weak: true },
      { _key: "p1", _type: "reference", _ref: "prod-a", _weak: true },
    ],
  });
  assert.deepEqual(result.ok && result.fields.heroSlides[0].products, [
    { _key: "p0", _type: "reference", _ref: "prod-c", _weak: true },
  ]);
});

test("product lists: limits and ids are enforced on write, tolerated on read", () => {
  const tooMany = { productLists: { spotlight: Array.from({ length: 9 }, (_, index) => `prod-${index}`) } };
  const invalid = { heroSlides: [{ _key: "s1", products: ["drafts.prod-a", "prod-b", "prod-c"] }] };

  assert.equal(sanitizeStorefrontCopyFields(tooMany).ok, false);
  assert.equal(sanitizeStorefrontCopyFields(invalid).ok, false);

  const read = resolveStorefrontCopy({
    productLists: { spotlight: tooMany.productLists.spotlight.map((id) => ({ _ref: id })) },
    heroSlides: [{ _key: "s1", products: [{ _ref: "drafts.prod-a" }, { _ref: "prod-b" }] }],
  });

  assert.equal(read.productLists.spotlight?.length, 8);
  assert.deepEqual(read.heroSlides.s1.products, ["prod-b"]);
});

test("product picks round-trip through the stored shape", () => {
  const copy = structuredClone(DEFAULT_STOREFRONT_COPY);
  copy.productLists = { offers: ["prod-x", "prod-y"] };
  copy.heroSlides = { s1: { products: ["prod-z", "prod-x"], title: "Hola" } };

  const reread = resolveStorefrontCopy(copyToFields(copy));

  assert.deepEqual(reread.productLists, copy.productLists);
  assert.deepEqual(reread.heroSlides, copy.heroSlides);
});

test("hero slide order: 1 to 5 unique slides, created ones need a title", () => {
  const ok = sanitizeStorefrontCopyFields({
    heroSlideOrder: ["slide-x", "a"],
    heroSlides: [
      { _key: "slide-x", custom: true, title: "Nueva", surface: "brown" },
      { _key: "slide-orphan", custom: true, title: "Fuera de la lista" },
    ],
  });

  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.fields.heroSlideOrder, ["slide-x", "a"]);
  // A created slide no longer listed is dropped.
  assert.deepEqual(ok.ok && ok.fields.heroSlides.map((slide) => slide._key), ["slide-x"]);

  assert.equal(sanitizeStorefrontCopyFields({ heroSlideOrder: [] }).ok, false);
  assert.equal(sanitizeStorefrontCopyFields({ heroSlideOrder: ["a", "a"] }).ok, false);
  assert.equal(sanitizeStorefrontCopyFields({ heroSlideOrder: ["a", "b", "c", "d", "e", "f"] }).ok, false);
  assert.equal(
    sanitizeStorefrontCopyFields({ heroSlideOrder: ["slide-x"], heroSlides: [{ _key: "slide-x", custom: true }] }).ok,
    false,
  );
  assert.equal(sanitizeStorefrontCopyFields({ heroSlides: [{ _key: "a", surface: "neon" }] }).ok, false);
});

test("hero slide order round-trips; absent means Studio decides", () => {
  const copy = structuredClone(DEFAULT_STOREFRONT_COPY);
  assert.equal(resolveStorefrontCopy(copyToFields(copy)).heroSlideOrder, null);

  copy.heroSlideOrder = ["slide-x", "a"];
  copy.heroSlides = { "slide-x": { custom: true, title: "Nueva", surface: "sand" } };
  const reread = resolveStorefrontCopy(copyToFields(copy));

  assert.deepEqual(reread.heroSlideOrder, ["slide-x", "a"]);
  assert.deepEqual(reread.heroSlides, copy.heroSlides);
});

test("background photos: stored as image references, original file when absent", () => {
  const result = sanitizeStorefrontCopyFields({ images: { newsletter: ASSET, editorialFirst: null } });

  assert.ok(result.ok);
  assert.deepEqual(result.ok && result.fields.images, {
    newsletter: { _type: "image", asset: { _type: "reference", _ref: ASSET } },
  });
  assert.equal(sanitizeStorefrontCopyFields({ images: { newsletter: "https://example.com/x.jpg" } }).ok, false);

  const copy = structuredClone(DEFAULT_STOREFRONT_COPY);
  copy.images = { editorialSecond: ASSET };
  assert.deepEqual(resolveStorefrontCopy(copyToFields(copy)).images, { editorialSecond: ASSET });
  assert.deepEqual(resolveStorefrontCopy(null).images, {});
});
