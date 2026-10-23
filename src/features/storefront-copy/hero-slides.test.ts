import assert from "node:assert/strict";
import test from "node:test";
import type { HomeHeroProduct, HomeHeroSlide } from "@/features/home/types";
import { applyHeroProductFraming, composeHeroSlides, fillHeroProducts } from "./hero-slides";

const studio = (id: string, title: string): HomeHeroSlide => ({
  id,
  eyebrow: "",
  title,
  text: "",
  imageUrl: `studio-${id}`,
  mobileImageUrl: null,
  imageAlt: title,
  ctaLabel: "Ver",
  ctaHref: "/productos",
  surface: "sand",
});

const urls = (ref: string) => ({ imageUrl: `new-${ref}`, mobileImageUrl: null });
const STUDIO = [studio("a", "Uno"), studio("b", "Dos")];

test("without a managed list, Studio's slides show in Studio's order", () => {
  const slides = composeHeroSlides(STUDIO, { heroSlides: { b: { title: "Dos corregido" } }, heroSlideOrder: null }, urls);
  assert.deepEqual(slides.map((slide) => [slide.id, slide.title]), [["a", "Uno"], ["b", "Dos corregido"]]);
});

test("a managed list decides which slides show and in what order, created ones included", () => {
  const slides = composeHeroSlides(
    STUDIO,
    {
      heroSlides: { "slide-new": { custom: true, title: "Nueva", surface: "brown" }, "slide-untitled": { custom: true } },
      heroSlideOrder: ["slide-new", "b", "slide-untitled", "gone"],
    },
    urls,
  );

  assert.deepEqual(slides.map((slide) => slide.id), ["slide-new", "b"]);
  assert.equal(slides[0].surface, "brown");
  assert.equal(slides[0].imageUrl, null);
  assert.equal(slides[0].ctaHref, "/productos");
  assert.equal(slides[0].imageAlt, "Nueva");
});

test("the hero is never empty: a list of only missing slides falls back to Studio", () => {
  const slides = composeHeroSlides(STUDIO, { heroSlides: {}, heroSlideOrder: ["gone"] }, urls);
  assert.deepEqual(slides.map((slide) => slide.id), ["a", "b"]);
});

const product = (id: string): HomeHeroProduct => ({ id, title: id, href: `/${id}`, imageUrl: id, imageAlt: id, basePrice: 1 });

test("slides without products get two the others don't show", () => {
  const slides = fillHeroProducts(
    [{ ...STUDIO[0], products: [product("p1"), product("p2")] }, { ...STUDIO[1] }],
    ["p1", "p2", "p3", "p4"].map(product),
  );

  assert.deepEqual(slides[1].products?.map((item) => item.id), ["p3", "p4"]);
});

test("product framing lands on the slide's matching products only", () => {
  const slides = applyHeroProductFraming(
    [{ ...STUDIO[0], products: [product("p1"), product("p2")] }],
    { a: { productFraming: { p2: { x: 0.1, y: 0.2, zoom: 2 } } } },
  );

  assert.equal(slides[0].products?.[0].imageFraming, undefined);
  assert.deepEqual(slides[0].products?.[1].imageFraming, { x: 0.1, y: 0.2, zoom: 2 });
});
