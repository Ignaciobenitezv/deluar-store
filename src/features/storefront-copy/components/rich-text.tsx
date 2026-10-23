import type { ReactNode } from "react";

// The small page format of the "richtext" copy fields, rendered as React
// elements (never as HTML, so a text can't inject markup):
//   a blank line separates paragraphs     "## " starts a heading
//   "- " starts a bullet                  **text** is bold
// E-mail addresses become mailto links.

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

export function parseRichText(source: string): Block[] {
  const blocks: Block[] = [];

  for (const line of source.split("\n")) {
    const last = blocks.at(-1);

    if (line.trim() === "") {
      blocks.push({ type: "paragraph", lines: [] });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      if (last?.type === "list") {
        last.items.push(line.slice(2).trim());
      } else {
        blocks.push({ type: "list", items: [line.slice(2).trim()] });
      }
    } else if (last?.type === "paragraph") {
      last.lines.push(line);
    } else {
      blocks.push({ type: "paragraph", lines: [line] });
    }
  }

  return blocks.filter((block) => block.type !== "paragraph" || block.lines.length > 0);
}

const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function withLinks(text: string, keyPrefix: string): ReactNode[] {
  return text.split(EMAIL_PATTERN).map((part, index) =>
    index % 2 === 1 ? (
      <a key={`${keyPrefix}-${index}`} href={`mailto:${part}`} className="underline transition-colors hover:text-foreground">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export function renderInline(text: string): ReactNode[] {
  // Odd parts sit between ** pairs; an unpaired ** stays as typed.
  const parts = text.split("**");
  const pairedCount = parts.length % 2 === 1 ? parts.length : parts.length - 1;

  return parts.flatMap((part, index) => {
    if (index >= pairedCount) {
      return [`**${part}`];
    }

    return index % 2 === 1
      ? [
          <strong key={index} className="text-foreground">
            {withLinks(part, String(index))}
          </strong>,
        ]
      : withLinks(part, String(index));
  });
}

export function RichText({ source }: { source: string }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted">
      {parseRichText(source).map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index} className="pt-4 text-lg font-semibold text-foreground first:pt-0">
              {renderInline(block.text)}
            </h2>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted/60" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
