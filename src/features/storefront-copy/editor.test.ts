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

test("framing follows its photo: changing the photo re-centres it", () => {
  let state = copyEditorReducer(fresh(), { type: "setHeroFraming", slideId: "s1", framing: { x: 0.2, y: 0.3, zoom: 2 } });
  assert.deepEqual(state.draft.heroSlides.s1, { imageFraming: { x: 0.2, y: 0.3, zoom: 2 } });

  state = copyEditorReducer(state, { type: "setHeroImage", slideId: "s1", image: { assetRef: "image-abc-10x10-jpg" } });
  assert.deepEqual(state.draft.heroSlides.s1, { image: { assetRef: "image-abc-10x10-jpg" } });

  state = copyEditorReducer(state, { type: "setSectionFraming", id: "newsletter", framing: { x: 0.1, y: 0.1, zoom: 1 } });
  assert.deepEqual(state.draft.imageFraming, { newsletter: { x: 0.1, y: 0.1, zoom: 1 } });

  state = copyEditorReducer(state, { type: "setSectionImage", id: "newsletter", assetRef: "image-def-10x10-jpg" });
  assert.deepEqual(state.draft.imageFraming, {});

  // Centred with no zoom is the default: nothing to store.
  state = copyEditorReducer(state, { type: "setSectionFraming", id: "newsletter", framing: { x: 0.5, y: 0.5, zoom: 1 } });
  assert.deepEqual(state.draft.imageFraming, {});
});

test("hero product framing is set and cleared per product", () => {
  let state = copyEditorReducer(fresh(), { type: "setHeroProducts", slideId: "s1", products: ["prod-a"] });
  state = copyEditorReducer(state, { type: "setHeroProductFraming", slideId: "s1", productId: "prod-a", framing: { x: 0.2, y: 0.2, zoom: 1.4 } });
  assert.deepEqual(state.draft.heroSlides.s1.productFraming, { "prod-a": { x: 0.2, y: 0.2, zoom: 1.4 } });

  state = copyEditorReducer(state, { type: "setHeroProductFraming", slideId: "s1", productId: "prod-a", framing: null });
  assert.equal(state.draft.heroSlides.s1.productFraming, undefined);
});
