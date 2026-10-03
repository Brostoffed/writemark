import { DEFAULTS } from "../config.js";
import { clamp, getLineRange, normalizeLineEndings } from "../core/text.js";
import { isHorizontalRule, makeLineInfo, parseBlockquote, parseHeading, parseListItem } from "../markdown/block-syntax.js";
import { parseBlocks } from "../markdown/blocks.js";
import { codeSpanMarkdown, collectInlineMarkdownRanges } from "../markdown/inline.js";
import { extractReferenceDefinitions } from "../markdown/references.js";
import { isLikelyTableRow, isTableDelimiter, unescapeTableCellText } from "../markdown/tables.js";
import { renderInlineMarkdown } from "../render/inline.js";
import { escapeMarkdownLabel, isSafeUrl, markdownLinkDestination } from "../security.js";

export function stripHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value ?? "");
  return template.content.textContent ?? "";
}

export function htmlToMarkdown(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  const escapeMd = text => String(text ?? "").replace(/\u00a0/g, " ").replace(/[\\`*_{}\[\]()#+\-.!>~|]/g, "\\$&");
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(walk).join("");
    const block = text => `\n\n${text.trim()}\n\n`;
    if (["script", "style", "iframe", "template"].includes(tag)) return "";
    if (tag === "br") return "\n";
    if (/^h[1-6]$/.test(tag)) return block(`${"#".repeat(Number(tag[1]))} ${children().trim()}`);
    if (tag === "strong" || tag === "b") return `**${children()}**`;
    if (tag === "em" || tag === "i") return `*${children()}*`;
    if (tag === "code" && node.parentElement?.tagName?.toLowerCase() !== "pre") return codeSpanMarkdown(node.textContent);
    if (tag === "pre") {
      const content = normalizeLineEndings(node.textContent);
      let longestRun = 2;
      for (const match of content.matchAll(/`+/g)) longestRun = Math.max(longestRun, match[0].length);
      const fence = "`".repeat(longestRun + 1);
      return block(`${fence}\n${content}${content.endsWith("\n") ? "" : "\n"}${fence}`);
    }
    if (tag === "blockquote") return block(children().trim().split("\n").map(line => `> ${line}`).join("\n"));
    if (tag === "a") { const href = node.getAttribute("href") || ""; const label = children().trim() || escapeMd(href); const destination = markdownLinkDestination(href); return href && destination != null && isSafeUrl(href) ? `[${label}](${destination})` : label; }
    if (tag === "img") { const src = node.getAttribute("src") || ""; const alt = node.getAttribute("alt") || ""; const destination = markdownLinkDestination(src); return src && destination != null && isSafeUrl(src, { allowDataImage: false }) ? `![${escapeMarkdownLabel(alt)}](${destination})` : escapeMd(alt); }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children).filter(el => el.tagName.toLowerCase() === "li");
      return block(items.map((li, i) => `${tag === "ol" ? `${i + 1}.` : "-"} ${Array.from(li.childNodes).map(walk).join("").trim()}`).join("\n"));
    }
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map(tr => Array.from(tr.children).map(cell => Array.from(cell.childNodes).map(walk).join("").trim()));
      if (!rows.length) return "";
      const cols = Math.max(...rows.map(r => r.length));
      const pad = r => Array.from({ length: cols }, (_, i) => r[i] || "");
      const header = pad(rows[0]);
      const body = rows.slice(1).map(pad);
      return block([`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map(r => `| ${r.join(" | ")} |`)].join("\n"));
    }
    if (["p", "div", "section", "article"].includes(tag)) return block(children());
    return children();
  };
  return Array.from(template.content.childNodes).map(walk).join("").trim();
}

export function tsvToMarkdownTable(text) {
  const rows = normalizeLineEndings(text).split("\n").filter(row => row.length > 0).map(row => row.split("\t").map(cell => cell.replace(/\|/g, "\\|").trim()));
  if (rows.length < 2 || rows.every(row => row.length < 2)) return null;
  const cols = Math.max(...rows.map(row => row.length));
  const pad = row => Array.from({ length: cols }, (_, i) => row[i] || "");
  const header = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  return [`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map(row => `| ${row.join(" | ")} |`)].join("\n");
}

export function safeClipboardGet(clipboard, type) {
  try { return clipboard?.getData?.(type) || ""; } catch { return ""; }
}

export function looksLikeMarkdown(text) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  return looksLikeBlockMarkdown(source)
    || /(^|\s)(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`\n]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m.test(source);
}

export function looksLikeBlockMarkdown(text) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  const lines = source.split("\n");
  if (lines.some(line => /^(\s{0,3}#{1,6}\s+|\s*([-+*])\s+|\s*\d+[.)]\s+|\s*[-+*]\s+\[(?: |x|X)\]\s+|\s*>\s?|\s*```|\s*~~~)/.test(line))) return true;
  if (lines.some(line => isHorizontalRule(line))) return true;
  if (lines.length >= 2 && isLikelyTableRow(lines[0]) && isTableDelimiter(lines[1])) return true;
  return false;
}

export function markdownFromClipboardData(clipboard) {
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

export function expandMarkdownFormattingRange(value, start, end) {
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
      if (Number.isFinite(contentStart) && s === lineInfo.start + contentStart && e === lineInfo.end) {
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

export function textFromMarkdown(markdown, opts = {}) {
  const extracted = extractReferenceDefinitions(markdown, opts.references);
  const options = { ...DEFAULTS, ...opts, references: extracted.references };
  const inlineText = text => stripHtml(renderInlineMarkdown(text, options));
  const lines = [];
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
