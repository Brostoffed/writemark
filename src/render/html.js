import { DEFAULTS } from "../config.js";
import { parseBlocks } from "../markdown/blocks.js";
import { extractReferenceDefinitions } from "../markdown/references.js";
import { tableAlignmentFromDelimiter, tableAlignmentStyle, unescapeTableCellText } from "../markdown/tables.js";
import { renderInlineMarkdown } from "./inline.js";
import { escapeAttribute, escapeHtml } from "../security.js";

export function isListBlock(block) {
  return ["bullet-list-item", "ordered-list-item", "task-list-item"].includes(block?.type);
}

export function listIndentWidth(block) {
  return String(block?.list?.indent ?? "").replace(/\t/g, "    ").length;
}

export function lineIndentWidth(line) {
  return (/^[ \t]*/.exec(String(line?.text ?? ""))?.[0] ?? "").replace(/\t/g, "    ").length;
}

export function stripContinuationIndent(text, width) {
  let remaining = Math.max(0, width);
  let index = 0;
  const source = String(text ?? "");
  while (index < source.length && remaining > 0) {
    if (source[index] === " ") { index += 1; remaining -= 1; continue; }
    if (source[index] === "\t") { index += 1; remaining = Math.max(0, remaining - 4); continue; }
    break;
  }
  return source.slice(index);
}

export function renderListFromBlocks(blocks, start, options) {
  const first = blocks[start];
  const baseIndent = listIndentWidth(first);
  const listType = first.list.listType;
  const sameLevel = block =>
    isListBlock(block)
    && block.list.listType === listType
    && listIndentWidth(block) === baseIndent;
  const items = [];
  let loose = false;
  let index = start;
  let stopList = false;

  while (sameLevel(blocks[index])) {
    const block = blocks[index];
    const contentIndent = baseIndent + block.list.contentStart - block.list.indent.length;
    const item = {
      block,
      paragraphs: [[block.list.content]],
      children: [],
    };
    index += 1;
    let pendingBlank = false;

    while (index < blocks.length) {
      const next = blocks[index];
      if (next.type === "blank") {
        const after = blocks[index + 1];
        if (sameLevel(after)) {
          loose = true;
          index += 1;
          break;
        }
        if (isListBlock(after) && listIndentWidth(after) > baseIndent) {
          loose = true;
          pendingBlank = true;
          index += 1;
          continue;
        }
        if (after?.type === "paragraph" && lineIndentWidth(after.line) >= contentIndent) {
          loose = true;
          pendingBlank = true;
          index += 1;
          continue;
        }
        stopList = true;
        break;
      }
      if (sameLevel(next)) break;
      if (isListBlock(next)) {
        if (listIndentWidth(next) <= baseIndent) {
          stopList = true;
          break;
        }
        const child = renderListFromBlocks(blocks, index, options);
        item.children.push(child.html);
        index = child.nextIndex;
        pendingBlank = false;
        continue;
      }
      if (next.type === "paragraph") {
        if (pendingBlank) {
          if (lineIndentWidth(next.line) < contentIndent) {
            stopList = true;
            break;
          }
          item.paragraphs.push([stripContinuationIndent(next.line.text, contentIndent)]);
          pendingBlank = false;
        } else {
          item.paragraphs.at(-1).push(stripContinuationIndent(next.line.text, contentIndent));
        }
        index += 1;
        continue;
      }
      stopList = true;
      break;
    }
    items.push(item);
    if (stopList || !sameLevel(blocks[index])) break;
  }

  const tag = listType === "ol" ? "ol" : "ul";
  const startNumber = first.list.number;
  const startAttribute = tag === "ol" && Number.isFinite(startNumber) && startNumber !== 1
    ? ` start="${startNumber}"`
    : "";
  const html = items.map(item => {
    const checkbox = item.block.list.kind === "task-list-item"
      ? `<input type="checkbox" disabled${item.block.list.checked ? " checked" : ""}> `
      : "";
    const paragraphs = item.paragraphs.map((lines, paragraphIndex) => {
      const prefix = paragraphIndex === 0 ? checkbox : "";
      const content = `${prefix}${renderInlineMarkdown(lines.join("\n"), options)}`;
      return loose || paragraphIndex > 0 ? `<p>${content}</p>` : content;
    }).join("");
    const children = item.children.length ? `\n${item.children.join("\n")}\n` : "";
    return `<li>${paragraphs}${children}</li>`;
  }).join("");
  return { html: `<${tag}${startAttribute}>${html}</${tag}>`, nextIndex: index };
}

export function renderMarkdown(markdown, opts = {}) {
  const extracted = extractReferenceDefinitions(markdown, opts.references);
  const options = { ...DEFAULTS, ...opts, references: extracted.references };
  const blocks = parseBlocks(extracted.markdown, options);
  const out = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type === "blank") continue;
    if (block.type === "heading") { out.push(`<h${block.heading.level} id="${escapeAttribute(block.heading.id)}">${renderInlineMarkdown(block.heading.content, options)}</h${block.heading.level}>`); continue; }
    if (block.type === "horizontal-rule") { out.push("<hr>"); continue; }
    if (block.type === "blockquote") {
      const quotes = [block];
      let j = i + 1;
      while (j < blocks.length && blocks[j].type === "blockquote") { quotes.push(blocks[j]); j += 1; }
      const body = quotes.map(q => q.quote.content).join("\n");
      out.push(`<blockquote>${renderMarkdown(body, options)}</blockquote>`);
      i = j - 1;
      continue;
    }
    if (isListBlock(block)) {
      const rendered = renderListFromBlocks(blocks, i, options);
      out.push(rendered.html);
      i = rendered.nextIndex - 1;
      continue;
    }
    if (block.type === "code-fence") {
      const lang = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
      out.push(`<pre><code${lang}>${escapeHtml(block.codeLines.map(l => l.text).join("\n"))}</code></pre>`); continue;
    }
    if (block.type === "table") {
      const header = block.header.cells;
      const rows = block.rows;
      const alignments = block.delimiter.cells.map(cell => tableAlignmentFromDelimiter(cell.text));
      out.push(`<div class="md-table-wrap"><table><thead><tr>${header.map((c, i) => `<th${tableAlignmentStyle(alignments[i])}>${renderInlineMarkdown(unescapeTableCellText(c.text), options)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${header.map((_, i) => `<td${tableAlignmentStyle(alignments[i])}>${renderInlineMarkdown(unescapeTableCellText(r.cells[i]?.text ?? ""), options)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue;
    }
    if (block.type === "paragraph") {
      const paragraphs = [block];
      let j = i + 1;
      while (j < blocks.length && blocks[j].type === "paragraph") { paragraphs.push(blocks[j]); j += 1; }
      out.push(`<p>${renderInlineMarkdown(paragraphs.map(p => p.line.text).join("\n"), options)}</p>`);
      i = j - 1;
      continue;
    }
    out.push(`<p>${renderInlineMarkdown(block.line.text, options)}</p>`);
  }
  return out.join("\n");
}
