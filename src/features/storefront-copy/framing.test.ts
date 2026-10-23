import assert from "node:assert/strict";
import test from "node:test";
import { framingStyle } from "./framing";

test("framing style: the focus point is both the position and the zoom origin", () => {
  assert.deepEqual(framingStyle(undefined), {});
  assert.deepEqual(framingStyle({ x: 0.5, y: 0.5, zoom: 1 }), {});
  assert.deepEqual(framingStyle({ x: 0.25, y: 0.8, zoom: 1 }), { objectPosition: "25.0% 80.0%" });
  assert.deepEqual(framingStyle({ x: 0.25, y: 0.8, zoom: 2 }), {
    objectPosition: "25.0% 80.0%",
    transform: "scale(2)",
    transformOrigin: "25.0% 80.0%",
  });
});
