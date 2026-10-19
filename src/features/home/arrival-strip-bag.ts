// Shuffle bag for the home arrival strip: hands out groups of product indices
// so every product appears once per round before any repeats, in a fresh
// random order each round. Pure (random is injected) so it is testable and
// never runs during render.

export type ArrivalStripBag = {
  /** Indices still to be shown in the current round, in draw order. */
  queue: number[];
  /** Last index handed out, to avoid opening a new round with it. */
  last: number | null;
};

export function getArrivalGroupSize(total: number, maxGroupSize: number) {
  return Math.max(0, Math.min(total, maxGroupSize));
}

/** Deterministic first group (grid order) so server and client agree. */
export function createArrivalStripStart(total: number, maxGroupSize: number) {
  const size = getArrivalGroupSize(total, maxGroupSize);
  const group = Array.from({ length: size }, (_, index) => index);
  const bag: ArrivalStripBag = {
    queue: Array.from({ length: total - size }, (_, index) => size + index),
    last: size > 0 ? size - 1 : null,
  };

  return { group, bag };
}

function shuffle(values: number[], random: () => number) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function drawArrivalGroup(
  bag: ArrivalStripBag,
  total: number,
  maxGroupSize: number,
  random: () => number = Math.random,
): { group: number[]; bag: ArrivalStripBag } {
  const size = getArrivalGroupSize(total, maxGroupSize);
  // Drop indices that no longer exist if the product list shrank.
  let queue = bag.queue.filter((index) => index < total);
  let last = bag.last;
  const group: number[] = [];

  while (group.length < size) {
    if (queue.length === 0) {
      // New round. Push anything already in this group, and the product that
      // closed the previous round, to the back so the group never holds a
      // duplicate and the round does not open with what was just seen.
      const avoid = new Set(group);
      if (last !== null) {
        avoid.add(last);
      }

      const round = shuffle(
        Array.from({ length: total }, (_, index) => index),
        random,
      );
      queue = [
        ...round.filter((index) => !avoid.has(index)),
        ...round.filter((index) => avoid.has(index)),
      ];
    }

    const next = queue.shift()!;
    group.push(next);
    last = next;
  }

  return { group, bag: { queue, last } };
}
