import { requireItem } from "../core/collections.ts";
import type { MarkdownOptions } from "../types.ts";
import { DEFAULTS } from "../config.ts";
import { clamp, getLineRange, normalizeLineEndings } from "../core/text.ts";
import { isHorizontalRule, makeLineInfo, parseBlockquote, parseHeading, parseListItem } from "../markdown/block-syntax.ts";
import { parseBlocks } from "../markdown/blocks.ts";
import { codeSpanMarkdown, collectInlineMarkdownRanges } from "../markdown/inline.ts";
import { extractReferenceDefinitions } from "../markdown/references.ts";
import { escapeTableCellText, isLikelyTableRow, isTableDelimiter, unescapeTableCellText } from "../markdown/tables.ts";
import { renderInlineMarkdown } from "../render/inline.ts";
import { escapeMarkdownLabel, isSafeUrl, markdownLinkDestination } from "../security.ts";

export function stripHtml(value: string) {
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");
  return template.content.textContent ?? "";
}

function escapeClipboardText(text: string, inTable: boolean) {
  const literal = text.replace(/[\\`*_{}\[\]()#+\-.!>~]/g, "\\$&");
  return inTable ? literal : literal.replace(/\|/g, "\\|");
}

export function htmlToMarkdown(html: string) {
  const template = document.createElement("template");
  const source = String(html ?? "");
  template.innerHTML = source;
  const escapeMd = (text: string | null, inTable: boolean) => escapeClipboardText((text ?? "").replace(/\u00a0/g, " "), inTable);
  const mark = (content: string, delimiter: string) => {
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
    if (!match?.[2]) return content;
    return `${match[1] || ""}${delimiter}${match[2]}${delimiter}${match[3] || ""}`;
  };
  const codeBlocks: string[] = [];
  const namespaces = new Set<string>();
  for (const text of [source, template.content.textContent ?? ""]) {
    for (const match of text.matchAll(/\uE000writemark-code-(\d+)-/g)) {
      if (match[1]) namespaces.add(match[1]);
    }
  }
  let namespace = 0;
  while (namespaces.has(String(namespace))) namespace += 1;
  const codePrefix = `\uE000writemark-code-${namespace}-`;
  const walk = (node: Node, depth = 0, inTable = false): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.nodeValue?.replace(/[\t\r\n ]+/g, " ") ?? "", inTable);
    if (depth > 256) {
      const reader = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const text: string[] = [];
      while (reader.nextNode()) {
        if (!reader.currentNode.parentElement?.closest("script,style,iframe,template,object,embed,svg,math,head")) text.push(escapeMd(reader.currentNode.nodeValue, inTable));
      }
      return text.join("");
    }
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(child => walk(child, depth + 1, inTable)).join("");
    const block = (text: string) => `\n\n${text.trim()}\n\n`;
    if (["script", "style", "iframe", "template", "object", "embed", "svg", "math", "head"].includes(tag)) return "";
    if (/mso-list\s*:\s*ignore/i.test(node.getAttribute("style") || "")) return "";
    if (tag === "br") return node.classList.contains("Apple-interchange-newline") ? "" : "  \n";
    if (/^h[1-6]$/.test(tag)) return block(`${"#".repeat(Number(tag[1]))} ${children().trim()}`);
    const weight = node instanceof HTMLElement ? node.style.fontWeight : "";
    if (tag === "strong" || tag === "b") {
      const content = weight === "normal" || weight === "400" ? children() : mark(children(), "**");
      return node instanceof HTMLElement && node.style.fontStyle === "italic" ? mark(content, "*") : content;
    }
    if (tag === "em" || tag === "i") return mark(children(), "*");
    if (tag === "del" || tag === "s") return mark(children(), "~~");
    if (tag === "hr") return block("---");
    if (tag === "code" && node.parentElement?.tagName?.toLowerCase() !== "pre") {
      return codeSpanMarkdown(node.textContent || "");
    }
    if (tag === "pre") {
      const content = normalizeLineEndings(node.textContent);
      if (inTable) return codeSpanMarkdown(content.replace(/\s*\n\s*/g, " "));
      let longestRun = 2;
      for (const match of content.matchAll(/`+/g)) longestRun = Math.max(longestRun, (match[0] ?? "").length);
      const fence = "`".repeat(longestRun + 1);
      codeBlocks.push(`${fence}\n${content}${content.endsWith("\n") ? "" : "\n"}${fence}`);
      return block(`${codePrefix}${codeBlocks.length - 1}\uE001`);
    }
    if (tag === "blockquote") return block(children().trim().split("\n").map(line => `> ${line}`).join("\n"));
    if (tag === "a") {
      const href = node.getAttribute("href") || "";
      const content = children();
      const label = content.trim() || escapeMd(href, inTable);
      const destination = markdownLinkDestination(href);
      if (!href || destination == null || !isSafeUrl(href)) return content || label;
      const leading = /^\s*/.exec(content)?.[0] || "";
      const trailing = /\s*$/.exec(content)?.[0] || "";
      return `${leading}[${label}](${destination})${trailing}`;
    }
    if (tag === "img") { const src = node.getAttribute("src") || ""; const alt = node.getAttribute("alt") || ""; const destination = markdownLinkDestination(src); return src && destination != null && isSafeUrl(src, { allowDataImage: false }) ? `![${escapeMarkdownLabel(alt)}](${destination})` : escapeMd(alt, inTable); }
    if (tag === "ul" || tag === "ol") {
      const start = Number.parseInt(node.getAttribute("start") || "1", 10);
      let index = Number.isFinite(start) ? start : 1;
      const lines: string[] = [];
      for (const item of Array.from(node.children)) {
        const itemTag = item.tagName.toLowerCase();
        if (itemTag === "ul" || itemTag === "ol") {
          lines.push(walk(item, depth + 1, inTable).trim().split("\n").map(line => `   ${line}`).join("\n"));
        } else if (itemTag === "li") {
          const marker = tag === "ol" ? `${index++}.` : "-";
          const content = Array.from(item.childNodes).map(child => {
            if (child instanceof Element && /^(UL|OL)$/.test(child.tagName)) {
              return "\n" + walk(child, depth + 1, inTable).trim() + "\n\n";
            }
            return walk(child, depth + 1, inTable);
          }).join("").trim();
          const listContent = content.startsWith(codePrefix) ? "\n" + content : content;
          const [first = "", ...rest] = listContent.split("\n");
          lines.push(`${marker} ${first}` + rest.map(line => "\n" + (line ? " ".repeat(marker.length + 1) + line : "")).join(""));
        }
      }
      return block(lines.join("\n"));
    }
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll<HTMLElement>("tr"))
        .filter(tr => tr.closest("table") === node)
        .map(tr => Array.from(tr.children)
          .filter(cell => /^(TD|TH)$/.test(cell.tagName))
          .map(cell => {
            const inline = Array.from(cell.childNodes).map(child => walk(child, depth + 1, true)).join("");
            return escapeTableCellText(inline.trim().replace(/\s*\n\s*/g, " "));
          }));
      if (!rows.length) return "";
      const cols = Math.max(...rows.map(r => r.length));
      const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] || "");
      const header = pad(requireItem(rows, 0));
      const body = rows.slice(1).map(pad);
      return block([`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map(r => `| ${r.join(" | ")} |`)].join("\n"));
    }
    if (tag === "p" && /mso-list\s*:/i.test(node.getAttribute("style") || "")) {
      const style = node.getAttribute("style") || "";
      const level = Number(/level(\d+)/i.exec(style)?.[1] || "1");
      const label = node.querySelector('[style*="mso-list:Ignore"], [style*="mso-list: Ignore"]')?.textContent?.trim() || "";
      const marker = /^[\dA-Za-z]+[.)]/.test(label) ? `${/^\d+/.exec(label)?.[0] || "1"}.` : "-";
      return `\n${"   ".repeat(Math.min(20, Math.max(0, level - 1)))}${marker} ${children().trim()}\n`;
    }
    if (["p", "div", "section", "article"].includes(tag)) return block(children());
    let content = children();
    if (weight === "bold" || Number(weight) >= 600) content = mark(content, "**");
    if (node instanceof HTMLElement && node.style.fontStyle === "italic") content = mark(content, "*");
    return content;
  };
  return Array.from(template.content.childNodes).map(child => walk(child)).join("").replace(/\n[ \t]+\n/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim()
    .replace(new RegExp(`(^[ >]*)${codePrefix}(\\d+)\uE001`, "gm"), (_match: string, prefix: string, index: string) => (codeBlocks[Number(index)] || "").split("\n").map(line => prefix + line).join("\n"));
}

export function tsvToMarkdownTable(text: string) {
  const literalCell = (cell: string) => escapeTableCellText(escapeClipboardText(cell.trim(), true));
  const rows = normalizeLineEndings(text).split("\n").filter(row => row.length > 0).map(row => row.split("\t").map(literalCell));
  if (rows.length < 2 || rows.every(row => row.length < 2)) return null;
  const cols = Math.max(...rows.map(row => row.length));
  const pad = (row: string[]) => Array.from({ length: cols }, (_, i) => row[i] || "");
  const header = pad(requireItem(rows, 0));
  const body = rows.slice(1).map(pad);
  return [`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map(row => `| ${row.join(" | ")} |`)].join("\n");
}

export function safeClipboardGet(clipboard: DataTransfer | null, type: string) {
  try { return clipboard?.getData?.(type) || ""; } catch { return ""; }
}

export function looksLikeMarkdown(text: string) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  return looksLikeBlockMarkdown(source)
    || /(^|\s)(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`\n]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m.test(source);
}

export function looksLikeBlockMarkdown(text: string) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  const lines = source.split("\n");
  if (lines.some(line => /^(\s{0,3}#{1,6}\s+|\s*([-+*])\s+|\s*\d+[.)]\s+|\s*[-+*]\s+\[(?: |x|X)\]\s+|\s*>\s?|\s*```|\s*~~~)/.test(line))) return true;
  if (lines.some(line => isHorizontalRule(line))) return true;
  if (lines.length >= 2 && isLikelyTableRow(requireItem(lines, 0)) && isTableDelimiter(requireItem(lines, 1))) return true;
  return false;
}

export function markdownFromClipboardData(clipboard: DataTransfer | null) {
  const explicit = safeClipboardGet(clipboard, "text/markdown") || safeClipboardGet(clipboard, "text/x-markdown");
  const text = normalizeLineEndings(safeClipboardGet(clipboard, "text/plain"));
  const html = safeClipboardGet(clipboard, "text/html");
  const table = text ? tsvToMarkdownTable(text) : null;
  if (explicit) return { markdown: normalizeLineEndings(explicit), kind: "markdown" };
  if (table) return { markdown: table, kind: "table" };
  if (html && (!text || !looksLikeMarkdown(text))) {
    const converted = htmlToMarkdown(html);
    if (converted) return { markdown: normalizeLineEndings(converted), kind: "html" };
  }
  if (text) return { markdown: text, kind: looksLikeMarkdown(text) ? "markdown" : "text" };
  if (html) {
    const converted = htmlToMarkdown(html);
    if (converted) return { markdown: normalizeLineEndings(converted), kind: "html" };
  }
  return { markdown: "", kind: "empty" };
}

export function expandMarkdownFormattingRange(value: string, start: number, end: number) {
  let s = clamp(start, 0, value.length);
  let e = clamp(end, 0, value.length);
  if (s > e) [s, e] = [e, s];
  if (s === e) return { start: s, end: e };
  let changed = true;
  while (changed) {
    changed = false;
    const startLine = getLineRange(value, s);
    const endLine = getLineRange(value, e);
    if (startLine.start === endLine.start) {
      const lineInfo = makeLineInfo(startLine.start, startLine.end, startLine.text);
      const list = parseListItem(lineInfo.text);
      const heading = parseHeading(lineInfo.text);
      const quote = parseBlockquote(lineInfo.text);
      const contentStart = heading?.contentStart ?? list?.contentStart ?? quote?.contentStart;
      if (contentStart != null && Number.isFinite(contentStart) && s === lineInfo.start + contentStart && e === lineInfo.end) {
        s = lineInfo.start;
        e = lineInfo.end;
        changed = true;
        continue;
      }
      const localStart = s - lineInfo.start;
      const localEnd = e - lineInfo.start;
      for (const r of collectInlineMarkdownRanges(lineInfo.text)) {
        if (localStart === r.innerFrom && localEnd === r.innerTo) {
          s = lineInfo.start + r.from;
          e = lineInfo.start + r.to;
          changed = true;
          break;
        }
      }
    }
  }
  return { start: s, end: e };
}

export function textFromMarkdown(markdown: string, opts: MarkdownOptions = {}) {
  const extracted = extractReferenceDefinitions(markdown, opts.references);
  const options = { ...DEFAULTS, ...opts, references: extracted.references };
  const inlineText = (text: string) => stripHtml(renderInlineMarkdown(text, options));
  const lines: string[] = [];
  for (const block of parseBlocks(extracted.markdown, options)) {
    if (block.type === "blank") { lines.push(""); continue; }
    if (block.type === "heading") { lines.push(inlineText(block.heading.content)); continue; }
    if (block.type === "horizontal-rule") continue;
    if (block.type === "blockquote") { lines.push(inlineText(block.quote.content)); continue; }
    if (block.type === "bullet-list-item" || block.type === "ordered-list-item" || block.type === "task-list-item") { lines.push(inlineText(block.list.content)); continue; }
    if (block.type === "code-fence") { lines.push(block.codeLines.map(l => l.text).join("\n")); continue; }
    if (block.type === "table") {
      const tableRows = [block.header, ...block.rows];
      for (const row of tableRows) lines.push(row.cells.map(cell => inlineText(unescapeTableCellText(cell.text))).join("\t"));
      continue;
    }
    lines.push(inlineText(block.line.text));
  }
  while (lines[0] === "") lines.shift();
  while (lines.at(-1) === "") lines.pop();
  return lines.join("\n");
}
