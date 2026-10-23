import assert from "node:assert/strict";
import test from "node:test";
import { parseRichText } from "./rich-text";

test("rich text: headings, bullets and paragraphs", () => {
  assert.deepEqual(parseRichText("Intro\nsigue\n\n## Título\nTexto\n- uno\n- dos\nCierre"), [
    { type: "paragraph", lines: ["Intro", "sigue"] },
    { type: "heading", text: "Título" },
    { type: "paragraph", lines: ["Texto"] },
    { type: "list", items: ["uno", "dos"] },
    { type: "paragraph", lines: ["Cierre"] },
  ]);
});
