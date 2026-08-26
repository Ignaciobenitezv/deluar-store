"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type PortableTextMarkDef = {
  _key: string;
  _type: "link";
  href: string;
};

type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

type PortableTextBlock = {
  _type: "block";
  _key: string;
  style: "normal";
  children: PortableTextSpan[];
  markDefs: PortableTextMarkDef[];
  listItem?: "bullet" | "number";
  level?: 1;
};

type AdminProductRichTextEditorProps = {
  name: string;
  label: string;
  helpText?: string;
  initialBlocks: unknown[];
  error?: string | null;
};

function createKey(prefix = "pt") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInlineHtml(children: PortableTextSpan[], markDefs: PortableTextMarkDef[]) {
  const markDefByKey = new Map(markDefs.map((markDef) => [markDef._key, markDef] as const));

  return children
    .map((child) => {
      let html = escapeHtml(child.text).replaceAll("\n", "<br />");

      for (const mark of [...child.marks].reverse()) {
        if (mark === "strong") {
          html = `<strong>${html}</strong>`;
          continue;
        }

        if (mark === "em") {
          html = `<em>${html}</em>`;
          continue;
        }

        const linkMark = markDefByKey.get(mark);
        if (linkMark) {
          html = `<a href="${escapeHtml(linkMark.href)}" target="_blank" rel="noreferrer">${html}</a>`;
        }
      }

      return html;
    })
    .join("");
}

function blocksToHtml(blocks: PortableTextBlock[]) {
  if (!blocks.length) {
    return "<p><br /></p>";
  }

  const htmlParts: string[] = [];
  let listBuffer: Array<{ type: "bullet" | "number"; html: string }> = [];

  const flushList = () => {
    if (!listBuffer.length) {
      return;
    }

    const listType = listBuffer[0]?.type === "number" ? "ol" : "ul";
    htmlParts.push(`<${listType}>${listBuffer.map((item) => item.html).join("")}</${listType}>`);
    listBuffer = [];
  };

  for (const block of blocks) {
    const inlineHtml = renderInlineHtml(block.children, block.markDefs);
    const blockHtml = block.listItem ? `<li>${inlineHtml || "<br />"}</li>` : `<p>${inlineHtml || "<br />"}</p>`;

    if (block.listItem) {
      listBuffer.push({
        type: block.listItem,
        html: blockHtml,
      });
      continue;
    }

    flushList();
    htmlParts.push(blockHtml);
  }

  flushList();
  return htmlParts.join("");
}

function collectInlineSpans(node: Node, activeMarks: string[] = [], markDefs: PortableTextMarkDef[] = [], spans: PortableTextSpan[] = []) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (text) {
      spans.push({
        _type: "span",
        _key: createKey("span"),
        text,
        marks: [...activeMarks],
      });
    }

    return { spans, markDefs };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return { spans, markDefs };
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "br") {
    spans.push({
      _type: "span",
      _key: createKey("span"),
      text: "\n",
      marks: [...activeMarks],
    });
    return { spans, markDefs };
  }

  if (tagName === "strong" || tagName === "b") {
    for (const child of Array.from(element.childNodes)) {
      collectInlineSpans(child, [...activeMarks, "strong"], markDefs, spans);
    }

    return { spans, markDefs };
  }

  if (tagName === "em" || tagName === "i") {
    for (const child of Array.from(element.childNodes)) {
      collectInlineSpans(child, [...activeMarks, "em"], markDefs, spans);
    }

    return { spans, markDefs };
  }

  if (tagName === "a") {
    const href = element.getAttribute("href")?.trim() ?? "";
    const markKey = createKey("link");

    if (href) {
      markDefs.push({
        _key: markKey,
        _type: "link",
        href,
      });

      for (const child of Array.from(element.childNodes)) {
        collectInlineSpans(child, [...activeMarks, markKey], markDefs, spans);
      }
    }

    return { spans, markDefs };
  }

  for (const child of Array.from(element.childNodes)) {
    collectInlineSpans(child, activeMarks, markDefs, spans);
  }

  return { spans, markDefs };
}

function nodeToPortableTextBlocks(node: Element, listItem?: "bullet" | "number") {
  const { spans, markDefs } = Array.from(node.childNodes).reduce(
    (accumulator, child) => collectInlineSpans(child, [], accumulator.markDefs, accumulator.spans),
    { spans: [] as PortableTextSpan[], markDefs: [] as PortableTextMarkDef[] },
  );

  const filteredSpans = spans.filter((span) => span.text.length > 0);

  if (!filteredSpans.length) {
    return null;
  }

  return {
    _type: "block" as const,
    _key: createKey("block"),
    style: "normal" as const,
    children: filteredSpans,
    markDefs,
    ...(listItem ? { listItem, level: 1 as const } : {}),
  };
}

function htmlToPortableTextBlocks(html: string): PortableTextBlock[] {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = document.getElementById("root");

  if (!root) {
    return [];
  }

  const blocks: PortableTextBlock[] = [];

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (tagName === "ul" || tagName === "ol") {
        const listItemType = tagName === "ol" ? "number" : "bullet";

        for (const listChild of Array.from(element.children)) {
          if (listChild.tagName.toLowerCase() !== "li") {
            continue;
          }

          const block = nodeToPortableTextBlocks(listChild, listItemType);
          if (block) {
            blocks.push(block);
          }
        }

        continue;
      }

      if (tagName === "p" || tagName === "div") {
        const block = nodeToPortableTextBlocks(element);
        if (block) {
          blocks.push(block);
        }
        continue;
      }
    }

    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() ?? "";
      if (text) {
        blocks.push({
          _type: "block",
          _key: createKey("block"),
          style: "normal",
          children: [
            {
              _type: "span",
              _key: createKey("span"),
              text,
              marks: [],
            },
          ],
          markDefs: [],
        });
      }
    }
  }

  return blocks;
}

export function AdminProductRichTextEditor({
  name,
  label,
  helpText,
  initialBlocks,
  error,
}: AdminProductRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = useState(() => blocksToHtml(initialBlocks as PortableTextBlock[]));
  const [serializedValue, setSerializedValue] = useState(() => JSON.stringify(initialBlocks ?? []));

  useEffect(() => {
    const nextHtml = blocksToHtml(initialBlocks as PortableTextBlock[]);
    if (editorRef.current) {
      editorRef.current.innerHTML = nextHtml;
    }

    const frame = window.requestAnimationFrame(() => {
      setHtml((currentHtml) => (currentHtml === nextHtml ? currentHtml : nextHtml));
      setSerializedValue(JSON.stringify(initialBlocks ?? []));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialBlocks]);

  const syncEditorState = () => {
    const nextHtml = editorRef.current?.innerHTML ?? "";
    setHtml(nextHtml);
    setSerializedValue(JSON.stringify(htmlToPortableTextBlocks(nextHtml)));
  };

  const applyCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    window.requestAnimationFrame(syncEditorState);
  };

  const insertLink = () => {
    const href = window.prompt("Pegá la URL del enlace");

    if (!href?.trim()) {
      return;
    }

    applyCommand("createLink", href.trim());
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-sm font-medium text-slate-700">{label}</span>
          {helpText ? <p className="mt-1 text-xs leading-5 text-slate-500">{helpText}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Negrita
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Cursiva
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertUnorderedList")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Lista
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("insertOrderedList")} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Lista numerada
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertLink} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Enlace
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditorState}
          className={cn(
            "min-h-[240px] px-4 py-4 text-sm leading-7 text-slate-900 outline-none",
            "prose prose-slate max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
          )}
        />

        {!html.trim() ? (
          <div className="pointer-events-none absolute inset-0 px-4 py-4 text-sm text-slate-400">
            Escribí la descripción acá. Podés usar párrafos, negrita, cursiva, listas y enlaces.
          </div>
        ) : null}
      </div>

      <input type="hidden" name={name} value={serializedValue} />
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
