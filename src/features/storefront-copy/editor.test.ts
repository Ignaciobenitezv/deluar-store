import assert from "node:assert/strict";
import test from "node:test";
import { copyEditorReducer, copySnapshotFromDocuments, hasLocalCopyChanges, initialCopyEditorState } from "./editor";

const fresh = () => initialCopyEditorState(copySnapshotFromDocuments(null, null));

test("picking products is a local change; an empty pick goes back to automatic", () => {
  let state = copyEditorReducer(fresh(), { type: "setProductList", list: "offers", products: ["prod-a"] });
  assert.deepEqual(state.draft.productLists, { offers: ["prod-a"] });
  assert.equal(hasLocalCopyChanges(state), true);

  state = copyEditorReducer(state, { type: "setProductList", list: "offers", products: [] });
  assert.deepEqual(state.draft.productLists, {});
  assert.equal(hasLocalCopyChanges(state), false);
});

test("hero products sit with the slide's other corrections", () => {
  let state = copyEditorReducer(fresh(), { type: "setHeroProducts", slideId: "s1", products: ["prod-a", "prod-b"] });
  state = copyEditorReducer(state, { type: "setHeroImage", slideId: "s1", image: "removed" });
  assert.deepEqual(state.draft.heroSlides.s1, { products: ["prod-a", "prod-b"], image: "removed" });

  state = copyEditorReducer(state, { type: "setHeroProducts", slideId: "s1", products: null });
  state = copyEditorReducer(state, { type: "setHeroImage", slideId: "s1", image: null });
  assert.deepEqual(state.draft.heroSlides, {});
});

test("managing hero slides: add, move, hide, show, and back to Studio", () => {
  const studioIds = ["a", "b"];
  let state = copyEditorReducer(fresh(), { type: "addHeroSlide", id: "slide-n", studioIds });
  assert.deepEqual(state.draft.heroSlideOrder, ["a", "b", "slide-n"]);
  assert.deepEqual(state.draft.heroSlides["slide-n"], { custom: true, surface: "promo" });

  state = copyEditorReducer(state, { type: "moveHeroSlide", slideId: "slide-n", offset: -1, studioIds });
  assert.deepEqual(state.draft.heroSlideOrder, ["a", "slide-n", "b"]);

  state = copyEditorReducer(state, { type: "removeHeroSlide", slideId: "a", studioIds });
  state = copyEditorReducer(state, { type: "removeHeroSlide", slideId: "slide-n", studioIds });
  assert.deepEqual(state.draft.heroSlideOrder, ["b"]);
  assert.equal("slide-n" in state.draft.heroSlides, false);

  // The last slide stays.
  state = copyEditorReducer(state, { type: "removeHeroSlide", slideId: "b", studioIds });
  assert.deepEqual(state.draft.heroSlideOrder, ["b"]);

  state = copyEditorReducer(state, { type: "showHeroSlide", slideId: "a", studioIds });
  assert.deepEqual(state.draft.heroSlideOrder, ["b", "a"]);

  state = copyEditorReducer(state, { type: "resetHeroSlides" });
  assert.equal(state.draft.heroSlideOrder, null);
});

test("at most five slides", () => {
  let state = fresh();

  for (const id of ["n1", "n2", "n3", "n4", "n5", "n6"]) {
    state = copyEditorReducer(state, { type: "addHeroSlide", id, studioIds: [] });
  }

  assert.deepEqual(state.draft.heroSlideOrder, ["n1", "n2", "n3", "n4", "n5"]);
});

test("a block photo is set and restored", () => {
  let state = copyEditorReducer(fresh(), { type: "setSectionImage", id: "newsletter", assetRef: "image-abc-10x10-jpg" });
  assert.deepEqual(state.draft.images, { newsletter: "image-abc-10x10-jpg" });

  state = copyEditorReducer(state, { type: "setSectionImage", id: "newsletter", assetRef: null });
  assert.deepEqual(state.draft.images, {});
  assert.equal(hasLocalCopyChanges(state), false);
});
