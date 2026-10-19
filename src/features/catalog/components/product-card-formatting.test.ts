import assert from "node:assert/strict";
import test from "node:test";
import { resolveTransferOffer } from "./product-card-formatting";

test("stored 20% transfer price -> 20", () => {
  assert.deepEqual(resolveTransferOffer({ basePrice: 14900, transferPrice: 11920 }), {
    transferPrice: 11920,
    discountPercent: 20,
  });
});

test("other discount is reported as is", () => {
  assert.equal(resolveTransferOffer({ basePrice: 10000, transferPrice: 8500 })?.discountPercent, 15);
});

test("no transfer price, no offer", () => {
  assert.equal(resolveTransferOffer({ basePrice: 10000 }), null);
  assert.equal(resolveTransferOffer({ basePrice: 10000, transferPrice: null }), null);
});

test("transfer price not below base, no offer", () => {
  assert.equal(resolveTransferOffer({ basePrice: 10000, transferPrice: 10000 }), null);
  assert.equal(resolveTransferOffer({ basePrice: 10000, transferPrice: 12000 }), null);
});

test("invalid base price, no offer", () => {
  assert.equal(resolveTransferOffer({ basePrice: 0, transferPrice: 100 }), null);
});
