import assert from "node:assert/strict";
import test from "node:test";
import { buildInitialShipmentParcel } from "./shipment-readiness";

test("one product x one unit preserves exact snapshot dimensions", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: 120,
      heightCm: 20,
      widthCm: 10,
      depthCm: 5,
      quantity: 1,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: 120,
    weightGrams: 120,
    heightCm: 20,
    widthCm: 10,
    depthCm: 5,
  });
});

test("one product x three units builds a single compact parcel", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: 100,
      heightCm: 20,
      widthCm: 10,
      depthCm: 5,
      quantity: 3,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: 300,
    weightGrams: 300,
    heightCm: 15,
    widthCm: 10,
    depthCm: 20,
  });
});

test("three different products are packed into one deterministic parcel", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: 100,
      heightCm: 20,
      widthCm: 10,
      depthCm: 5,
      quantity: 1,
    },
    {
      weightGrams: 200,
      heightCm: 12,
      widthCm: 8,
      depthCm: 4,
      quantity: 1,
    },
    {
      weightGrams: 50,
      heightCm: 6,
      widthCm: 6,
      depthCm: 3,
      quantity: 2,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: 400,
    weightGrams: 400,
    heightCm: 8,
    widthCm: 10,
    depthCm: 20,
  });
});

test("mixed quantities are packed into one deterministic parcel", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: 100,
      heightCm: 12,
      widthCm: 8,
      depthCm: 4,
      quantity: 2,
    },
    {
      weightGrams: 50,
      heightCm: 6,
      widthCm: 6,
      depthCm: 2,
      quantity: 3,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: 350,
    weightGrams: 350,
    heightCm: 11,
    widthCm: 8,
    depthCm: 12,
  });
});

test("missing weight does not get invented", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: null,
      heightCm: 10,
      widthCm: 8,
      depthCm: 4,
      quantity: 1,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: null,
    weightGrams: null,
    heightCm: 10,
    widthCm: 8,
    depthCm: 4,
  });
});

test("missing dimensions do not get invented", () => {
  const parcel = buildInitialShipmentParcel([
    {
      weightGrams: 100,
      heightCm: null,
      widthCm: 8,
      depthCm: 4,
      quantity: 1,
    },
  ]);

  assert.deepEqual(parcel, {
    calculatedWeightGrams: 100,
    weightGrams: 100,
    heightCm: null,
    widthCm: null,
    depthCm: null,
  });
});

test("different orders are packed independently", () => {
  const orderAParcel = buildInitialShipmentParcel([
    {
      weightGrams: 20,
      heightCm: 10,
      widthCm: 10,
      depthCm: 1,
      quantity: 1,
    },
  ]);

  const orderBParcel = buildInitialShipmentParcel([
    {
      weightGrams: 500,
      heightCm: 30,
      widthCm: 20,
      depthCm: 10,
      quantity: 1,
    },
  ]);

  assert.deepEqual(orderAParcel, {
    calculatedWeightGrams: 20,
    weightGrams: 20,
    heightCm: 10,
    widthCm: 10,
    depthCm: 1,
  });

  assert.deepEqual(orderBParcel, {
    calculatedWeightGrams: 500,
    weightGrams: 500,
    heightCm: 30,
    widthCm: 20,
    depthCm: 10,
  });
});
