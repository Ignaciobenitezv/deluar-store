import assert from "node:assert/strict";
import test from "node:test";
import { calculateTransferPrice } from "./commercial-pricing";

test("calculateTransferPrice: 10000 -> 8000", () => {
  assert.equal(calculateTransferPrice(10000), 8000);
});

test("calculateTransferPrice: 50000 -> 40000", () => {
  assert.equal(calculateTransferPrice(50000), 40000);
});

test("calculateTransferPrice: 100000 -> 80000", () => {
  assert.equal(calculateTransferPrice(100000), 80000);
});

test("calculateTransferPrice: 125000 -> 100000", () => {
  assert.equal(calculateTransferPrice(125000), 100000);
});

test("calculateTransferPrice: rounds a non-integer 80% up (100001 * 0.8 = 80000.8)", () => {
  assert.equal(calculateTransferPrice(100001), 80001);
});

test("calculateTransferPrice: rounds a non-integer 80% down (100002 * 0.8 = 80001.6)", () => {
  assert.equal(calculateTransferPrice(100002), 80002);
});

test("calculateTransferPrice: always returns a whole peso (integer) result", () => {
  for (const basePrice of [1, 3, 7, 9999, 123457]) {
    assert.equal(Number.isInteger(calculateTransferPrice(basePrice)), true);
  }
});
