import assert from "node:assert/strict";
import test from "node:test";
import {
  createArrivalStripStart,
  drawArrivalGroup,
} from "./arrival-strip-bag";

const GROUP = 4;

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function runCycles(total: number, cycles: number, seed: number) {
  const random = seededRandom(seed);
  const start = createArrivalStripStart(total, GROUP);
  const groups = [start.group];
  let bag = start.bag;

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const drawn = drawArrivalGroup(bag, total, GROUP, random);
    groups.push(drawn.group);
    bag = drawn.bag;
  }

  return groups;
}

test("first group is the grid order and is deterministic", () => {
  assert.deepEqual(createArrivalStripStart(8, GROUP).group, [0, 1, 2, 3]);
  assert.deepEqual(createArrivalStripStart(3, GROUP).group, [0, 1, 2]);
  assert.deepEqual(createArrivalStripStart(0, GROUP).group, []);
});

for (const total of [1, 3, 4, 5, 8]) {
  test(`${total} products: groups of min(total, 4), no duplicates, full rounds before repeats`, () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const groups = runCycles(total, 40, seed);
      const size = Math.min(total, GROUP);

      for (const group of groups) {
        assert.equal(group.length, size);
        assert.equal(new Set(group).size, size, "duplicate inside a group");
        assert.ok(group.every((index) => index >= 0 && index < total));
      }

      // Read as one stream, every consecutive block of `total` draws is a
      // full round: each product exactly once.
      const stream = groups.flat();
      for (let start = 0; start + total <= stream.length; start += total) {
        const round = stream.slice(start, start + total);
        assert.equal(new Set(round).size, total, `repeat before round finished (seed ${seed})`);
      }

      // A new round never opens with the product that closed the last one.
      if (total > 1) {
        for (let start = total; start < stream.length; start += total) {
          assert.notEqual(stream[start], stream[start - 1], `round boundary repeat (seed ${seed})`);
        }
      }
    }
  });
}

test("rounds after the first are shuffled", () => {
  const stream = runCycles(8, 20, 7).flat();
  const rounds = new Set<string>();
  for (let start = 8; start + 8 <= stream.length; start += 8) {
    rounds.add(stream.slice(start, start + 8).join(","));
  }
  assert.ok(rounds.size > 1);
});

test("shrinking product list drops stale indices", () => {
  const start = createArrivalStripStart(8, GROUP);
  const drawn = drawArrivalGroup(start.bag, 3, GROUP, seededRandom(3));
  assert.equal(drawn.group.length, 3);
  assert.ok(drawn.group.every((index) => index < 3));
  assert.equal(new Set(drawn.group).size, 3);
});
