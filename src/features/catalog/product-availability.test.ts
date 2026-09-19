import assert from "node:assert/strict";
import test from "node:test";
import { isProductStockAvailable } from "./product-availability";

test("simple product, stock 1 -> available", () => {
  assert.equal(isProductStockAvailable({ stock: 1 }), true);
});

test("simple product, stock 0 -> not available", () => {
  assert.equal(isProductStockAvailable({ stock: 0 }), false);
});

test("variants [0, 0, 2] -> available", () => {
  assert.equal(
    isProductStockAvailable({
      stock: 0,
      variants: [{ stock: 0 }, { stock: 0 }, { stock: 2 }],
    }),
    true,
  );
});

test("variants [0, 0, 0] -> not available", () => {
  assert.equal(
    isProductStockAvailable({
      stock: 0,
      variants: [{ stock: 0 }, { stock: 0 }, { stock: 0 }],
    }),
    false,
  );
});

test("variant with stock but isActive:false does not count on its own", () => {
  assert.equal(
    isProductStockAvailable({
      variants: [{ stock: 2, isActive: false }],
    }),
    false,
  );
});

test("inactive variant with stock, but another active variant with stock -> available", () => {
  assert.equal(
    isProductStockAvailable({
      variants: [
        { stock: 5, isActive: false },
        { stock: 3, isActive: true },
      ],
    }),
    true,
  );
});

test("legacy colorVariants, one with stock > 0 -> available", () => {
  assert.equal(
    isProductStockAvailable({
      stock: 0,
      colorVariants: [{ stock: 0 }, { stock: 3 }],
    }),
    true,
  );
});

test("legacy colorVariants, all at 0 -> not available", () => {
  assert.equal(
    isProductStockAvailable({
      stock: 0,
      colorVariants: [{ stock: 0 }, { stock: 0 }],
    }),
    false,
  );
});

// These two document the exact scenario that broke productAvailabilityClause
// in GROQ (count() on a field that doesn't exist returns null there, not 0)
// — isProductStockAvailable never had that bug since `?? []` already treats
// "missing" the same as "empty", but we pin it down explicitly so it can't
// regress silently.
test("variants field explicitly undefined (not present at all) -> falls through to base stock", () => {
  assert.equal(isProductStockAvailable({ stock: 5, variants: undefined }), true);
});

test("colorVariants field explicitly undefined (not present at all) -> falls through to base stock", () => {
  assert.equal(isProductStockAvailable({ stock: 5, colorVariants: undefined }), true);
});

test("neither variants nor colorVariants keys present at all -> simple product rule applies", () => {
  const product: { stock: number } = { stock: 0 };
  assert.equal(isProductStockAvailable(product), false);
});

test("variants all 0 but base stock > 0 -> not available (base stock ignored once variants exist)", () => {
  assert.equal(
    isProductStockAvailable({
      stock: 10,
      variants: [{ stock: 0 }, { stock: 0 }],
    }),
    false,
  );
});

// isProductStockAvailable is only the stock half of public visibility — the
// caller always combines it with isActive. This documents that combination
// explicitly, the same way every real query does it.
test("isActive:false + stock > 0 -> still not publicly visible when combined with isActive", () => {
  const product = { isActive: false as boolean | undefined, stock: 5 };
  const publiclyVisible = product.isActive !== false && isProductStockAvailable(product);
  assert.equal(publiclyVisible, false);
});
