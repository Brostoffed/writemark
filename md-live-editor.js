/*
 * <md-live-editor> v1.2.2 live inline Markdown editor.
 * Dependency-free. No network calls. Markdown source is canonical.
 */

const TAG_NAME = "md-live-editor";

const DEFAULTS = Object.freeze({
  mode: "live",
  preview: "none",
  markdownFlavor: "gfm",
  tabBehavior: "accessibility-first",
  indentString: "  ",
  placeholder: "Write markdown...",
  renderDebounceMs: 100,
  smallDocChars: 20_000,
  largeDocChars: 100_000,
  linkTarget: "_self",
  allowRawHtml: false,
  sanitize: true,
  emptyRequiredTrim: true,
});

const REFLECTED_ATTRIBUTES = [
  "name",
  "value",
  "label",
  "placeholder",
  "mode",
  "preview",
  "markdown-flavor",
  "tab-behavior",
  "indent-string",
  "required",
  "disabled",
  "readonly",
  "spellcheck",
  "maxlength",
  "minlength",
  "aria-label",
  "aria-labelledby",
  "dir",
];

const LANGUAGES = [
  "python", "javascript", "typescript", "tsx", "jsx", "html", "css", "json", "bash", "shell", "sh",
  "sql", "yaml", "toml", "xml", "markdown", "text", "go", "rust", "java", "c", "cpp", "csharp",
  "php", "ruby", "swift", "kotlin", "r", "scala", "dockerfile", "nginx", "graphql", "regex"
];

const ALIASES = new Map([
  ["py", "python"],
  ["js", "javascript"],
  ["ts", "typescript"],
  ["yml", "yaml"],
  ["md", "markdown"],
  ["rb", "ruby"],
  ["rs", "rust"],
  ["cs", "csharp"],
  ["kt", "kotlin"],
]);

function now() { return Date.now(); }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function normalizeLineEndings(value) { return String(value ?? "").replace(/\r\n?/g, "\n"); }
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, "&#96;"); }
function stripHtml(value) { return String(value ?? "").replace(/<[^>]*>/g, ""); }
function isProbablyUrl(text) { return /^(https?:\/\/|mailto:|tel:|\/|#|\.\/|\.\.\/)[^\s]+$/i.test(String(text ?? "").trim()); }
function isSafeUrl(url, { allowDataImage = false } = {}) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (compact.startsWith("javascript:") || compact.startsWith("vbscript:") || compact.startsWith("file:")) return false;
  if (compact.startsWith("data:")) return allowDataImage && /^data:image\/(png|gif|jpe?g|webp);/i.test(compact);
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return /^(https?:|mailto:|tel:)/i.test(raw);
  return true;
}
function safeHref(url, opts = {}) { const raw = String(url ?? "").trim(); return isSafeUrl(raw, opts) ? raw : "#"; }

function htmlToMarkdown(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  const escapeMd = text => String(text ?? "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n");
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.nodeValue);
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(walk).join("");
    const block = text => `\n\n${text.trim()}\n\n`;
    if (tag === "br") return "\n";
    if (/^h[1-6]$/.test(tag)) return block(`${"#".repeat(Number(tag[1]))} ${children().trim()}`);
    if (tag === "strong" || tag === "b") return `**${children()}**`;
    if (tag === "em" || tag === "i") return `*${children()}*`;
    if (tag === "code" && node.parentElement?.tagName?.toLowerCase() !== "pre") return `\`${children()}\``;
    if (tag === "pre") return block(`\`\`\`\n${node.textContent.replace(/\n+$/g, "")}\n\`\`\``);
    if (tag === "blockquote") return block(children().trim().split("\n").map(line => `> ${line}`).join("\n"));
    if (tag === "a") { const href = node.getAttribute("href") || ""; const label = children().trim() || href; return href && isSafeUrl(href) ? `[${label}](${href})` : label; }
    if (tag === "img") { const src = node.getAttribute("src") || ""; const alt = node.getAttribute("alt") || ""; return src && isSafeUrl(src, { allowDataImage: false }) ? `![${alt}](${src})` : alt; }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children).filter(el => el.tagName.toLowerCase() === "li");
      return block(items.map((li, i) => `${tag === "ol" ? `${i + 1}.` : "-"} ${Array.from(li.childNodes).map(walk).join("").trim()}`).join("\n"));
    }
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map(tr => Array.from(tr.children).map(cell => Array.from(cell.childNodes).map(walk).join("").replace(/\|/g, "\\|").trim()));
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
  return Array.from(template.content.childNodes).map(walk).join("").replace(/\n{3,}/g, "\n\n").trim();
}
function tsvToMarkdownTable(text) {
  const rows = normalizeLineEndings(text).split("\n").filter(row => row.length > 0).map(row => row.split("\t").map(cell => cell.replace(/\|/g, "\\|").trim()));
  if (rows.length < 2 || rows.every(row => row.length < 2)) return null;
  const cols = Math.max(...rows.map(row => row.length));
  const pad = row => Array.from({ length: cols }, (_, i) => row[i] || "");
  const header = pad(rows[0]);
  const body = rows.slice(1).map(pad);
  return [`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map(row => `| ${row.join(" | ")} |`)].join("\n");
}

function safeClipboardGet(clipboard, type) {
  try { return clipboard?.getData?.(type) || ""; } catch { return ""; }
}
function looksLikeMarkdown(text) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  return looksLikeBlockMarkdown(source)
    || /(^|\s)(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`\n]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m.test(source);
}
function looksLikeBlockMarkdown(text) {
  const source = normalizeLineEndings(text).trim();
  if (!source) return false;
  const lines = source.split("\n");
  if (lines.some(line => /^(\s{0,3}#{1,6}\s+|\s*([-+*])\s+|\s*\d+[.)]\s+|\s*[-+*]\s+\[(?: |x|X)\]\s+|\s*>\s?|\s*```|\s*~~~)/.test(line))) return true;
  if (lines.some(line => isHorizontalRule(line))) return true;
  if (lines.length >= 2 && isLikelyTableRow(lines[0]) && isTableDelimiter(lines[1])) return true;
  return false;
}
function markdownFromClipboardData(clipboard) {
  const explicit = safeClipboardGet(clipboard, "text/markdown") || safeClipboardGet(clipboard, "text/x-markdown");
  const text = normalizeLineEndings(safeClipboardGet(clipboard, "text/plain"));
  const html = safeClipboardGet(clipboard, "text/html");
  const table = text ? tsvToMarkdownTable(text) : null;
  if (table) return { markdown: table, kind: "table" };
  if (explicit) return { markdown: normalizeLineEndings(explicit), kind: "markdown" };
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
function collectInlineMarkdownRanges(source) {
  const ranges = [];
  const addMatches = (regex, openLength, closeLength, labelGroup = 1) => {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source))) {
      const label = match[labelGroup] ?? "";
      const from = match.index;
      const to = match.index + match[0].length;
      const innerFrom = match.index + openLength;
      const innerTo = to - closeLength;
      if (innerTo >= innerFrom && label.length >= 0) ranges.push({ from, to, innerFrom, innerTo });
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  };
  addMatches(/`([^`\n]+?)`/g, 1, 1);
  addMatches(/\*\*([^*]+)\*\*/g, 2, 2);
  addMatches(/__([^_]+)__/g, 2, 2);
  addMatches(/~~([^~]+)~~/g, 2, 2);
  addMatches(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, 1, 1, 2);
  let match;
  const linkRegex = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  while ((match = linkRegex.exec(source))) {
    const bang = match[1] || "";
    const label = match[2] || "";
    const from = match.index;
    const labelStart = from + bang.length + 1;
    const labelEnd = labelStart + label.length;
    ranges.push({ from, to: from + match[0].length, innerFrom: labelStart, innerTo: labelEnd });
    if (match.index === linkRegex.lastIndex) linkRegex.lastIndex += 1;
  }
  return ranges.sort((a, b) => (a.to - a.from) - (b.to - b.from));
}
function expandMarkdownFormattingRange(value, start, end) {
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
function normalizeIndentAttribute(value) {
  if (value === "tab" || value === "\\t") return "\t";
  if (value === "4" || value === "4-spaces") return "    ";
  if (value === "2" || value === "2-spaces") return "  ";
  if (value === "\t" || value === "  " || value === "    ") return value;
  return DEFAULTS.indentString;
}
function displayShortcut(shortcut) {
  if (!shortcut) return "";
  const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
  return shortcut.replace(/Mod/g, isMac ? "⌘" : "Ctrl").replace(/Alt/g, isMac ? "⌥" : "Alt").replace(/Shift/g, isMac ? "⇧" : "Shift");
}
function uid(prefix = "mdle") { return `${prefix}-${Math.random().toString(36).slice(2)}`; }

function getLines(value) {
  const source = normalizeLineEndings(value);
  const lines = [];
  let start = 0;
  for (let i = 0; i <= source.length; i += 1) {
    if (i === source.length || source[i] === "\n") {
      lines.push({ index: lines.length, start, end: i, text: source.slice(start, i), newlineEnd: i < source.length ? i + 1 : i });
      start = i + 1;
    }
  }
  if (source.length === 0) lines.length = 0;
  return lines;
}

function getLineRange(value, offset) {
  const source = normalizeLineEndings(value);
  const safe = clamp(offset, 0, source.length);
  const before = source.lastIndexOf("\n", Math.max(0, safe - 1));
  const start = before === -1 ? 0 : before + 1;
  const after = source.indexOf("\n", safe);
  const end = after === -1 ? source.length : after;
  return { start, end, text: source.slice(start, end) };
}

function getSelectedLineRanges(value, selectionStart, selectionEnd) {
  const startLine = getLineRange(value, selectionStart);
  const endProbe = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
  const endLine = getLineRange(value, endProbe);
  const out = [];
  let cursor = startLine.start;
  while (cursor <= endLine.start) {
    const line = getLineRange(value, cursor);
    out.push(makeLineInfo(line.start, line.end, line.text));
    if (line.end >= value.length) break;
    cursor = line.end + 1;
  }
  return out;
}

function makeLineInfo(start, end, text) {
  const indent = (/^(\s*)/.exec(text) || ["", ""])[1];
  const list = parseListItem(text);
  const contentStart = list ? start + list.contentStart : start + indent.length;
  return { start, end, text, indent, marker: list?.markerText ?? null, contentStart };
}

function parseListItem(line) {
  const task = /^(\s*)([-+*])\s+\[( |x|X)\]\s+(.*)$/.exec(line);
  if (task) {
    const markerText = `${task[2]} [${task[3]}] `;
    return { kind: "task-list-item", listType: "ul", indent: task[1], marker: task[2], markerText, checked: task[3].toLowerCase() === "x", content: task[4], contentStart: task[1].length + markerText.length, fullMarkerStart: task[1].length, fullMarkerEnd: task[1].length + markerText.length };
  }
  const ordered = /^(\s*)(\d+)([.)])\s+(.*)$/.exec(line);
  if (ordered) {
    const markerText = `${ordered[2]}${ordered[3]} `;
    return { kind: "ordered-list-item", listType: "ol", indent: ordered[1], marker: ordered[2], number: Number(ordered[2]), delimiter: ordered[3], markerText, content: ordered[4], contentStart: ordered[1].length + markerText.length, fullMarkerStart: ordered[1].length, fullMarkerEnd: ordered[1].length + markerText.length };
  }
  const bullet = /^(\s*)([-+*])\s+(.*)$/.exec(line);
  if (bullet) {
    const markerText = `${bullet[2]} `;
    return { kind: "bullet-list-item", listType: "ul", indent: bullet[1], marker: bullet[2], markerText, content: bullet[3], contentStart: bullet[1].length + markerText.length, fullMarkerStart: bullet[1].length, fullMarkerEnd: bullet[1].length + markerText.length };
  }
  return null;
}

function parseHeading(line) {
  const m = /^(\s{0,3})(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
  if (!m) return null;
  return { indent: m[1], level: m[2].length, markerText: `${m[2]} `, content: m[3], contentStart: m[1].length + m[2].length + 1 };
}
function parseBlockquote(line) {
  const m = /^(\s*>\s?)(.*)$/.exec(line);
  if (!m) return null;
  return { markerText: m[1], content: m[2], contentStart: m[1].length };
}
function isHorizontalRule(line) { const t = line.trim(); return /^([-*_])(?:\s*\1){2,}\s*$/.test(t); }
function isFenceLine(line) { return /^\s*```/.test(line); }
function getFenceInfo(line) { const m = /^\s*```\s*([^`]*)$/.exec(line); return m ? { language: m[1].trim() } : null; }
function isFenceOpenerLine(line) { return /^\s*```[\w+-]*\s*$/.test(line); }
function isInsideInlineCode(lineBeforeCursor) { return ((lineBeforeCursor.match(/(?<!\\)`/g) || []).length % 2) === 1; }

function splitTableRow(line) {
  let row = String(line ?? "").trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  const cells = [];
  let current = "";
  let escaped = false;
  for (const char of row) {
    if (escaped) { current += char; escaped = false; continue; }
    if (char === "\\") { current += char; escaped = true; continue; }
    if (char === "|") { cells.push(current.trim()); current = ""; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}
function isTableDelimiter(line) {
  const t = String(line ?? "").trim();
  if (!t.includes("|")) return false;
  const cells = splitTableRow(t);
  return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell.trim()));
}
function isLikelyTableRow(line) {
  const t = String(line ?? "").trim();
  return t.includes("|") && splitTableRow(t).length >= 2;
}
function parseTableLineRanges(line, absoluteStart) {
  const raw = String(line ?? "");
  const cells = [];
  let start = 0;
  let end = raw.length;
  if (raw[start] === "|") start += 1;
  if (raw[end - 1] === "|") end -= 1;
  let cellStart = start;
  let escaped = false;
  for (let i = start; i <= end; i += 1) {
    const atEnd = i === end;
    const ch = raw[i];
    if (!atEnd && escaped) { escaped = false; continue; }
    if (!atEnd && ch === "\\") { escaped = true; continue; }
    if (atEnd || ch === "|") {
      const rawCellStart = cellStart;
      const rawCellEnd = i;
      let from = cellStart;
      let to = i;
      while (from < to && raw[from] === " ") from += 1;
      while (to > from && raw[to - 1] === " ") to -= 1;
      if (from === to && rawCellEnd > rawCellStart && raw[rawCellStart] === " ") {
        from = Math.min(rawCellStart + 1, rawCellEnd);
        to = from;
      }
      cells.push({ text: raw.slice(from, to), from: absoluteStart + from, to: absoluteStart + to });
      cellStart = i + 1;
    }
  }
  return cells;
}

function classifyLine(value, offset, lineInfo) {
  if (isInsideFence(value, offset)) return { kind: "fenced-code" };
  const list = parseListItem(lineInfo.text); if (list) return { kind: list.kind, list };
  const heading = parseHeading(lineInfo.text); if (heading) return { kind: "heading", heading };
  const quote = parseBlockquote(lineInfo.text); if (quote) return { kind: "blockquote", blockquote: quote };
  if (isHorizontalRule(lineInfo.text)) return { kind: "horizontal-rule" };
  if (isLikelyTableRow(lineInfo.text)) return { kind: "table" };
  return { kind: "paragraph" };
}
function isInsideFence(value, offset) {
  const source = normalizeLineEndings(value);
  const lines = getLines(source);
  let inFence = false;
  for (const line of lines) {
    if (line.start >= offset) break;
    if (isFenceLine(line.text)) {
      if (offset <= line.end) break;
      inFence = !inFence;
    }
  }
  return inFence;
}
function hasClosingFenceAfter(value, lineEnd) {
  const rest = normalizeLineEndings(value).slice(lineEnd + 1);
  return /^.*?^\s*```\s*$/ms.test(rest);
}

function applyTextChanges(value, changes) {
  const sorted = [...changes].sort((a, b) => b.from - a.from);
  let out = value;
  for (const c of sorted) {
    const from = clamp(c.from, 0, out.length);
    const to = clamp(c.to, from, out.length);
    out = out.slice(0, from) + normalizeLineEndings(c.insert ?? "") + out.slice(to);
  }
  return out;
}
function sameSelection(a, b) { return a && b && a.start === b.start && a.end === b.end && (a.direction || "none") === (b.direction || "none"); }
function makeSnapshot(value, selectionStart, selectionEnd, direction = "none") { return { value, selection: { start: selectionStart, end: selectionEnd, direction } }; }
function tx(ctx, actionId, changes, selectionAfter, undoGroup = actionId) {
  return { changes, selectionBefore: { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection ?? "none" }, selectionAfter, source: "api", actionId, undoGroup, timestamp: now() };
}
function ok(transaction, announcement) { return { ok: true, transaction, announcement }; }
function okNoop(announcement, preventDefault = false) { return { ok: true, announcement, preventDefault }; }
function fail(reason, message) { return { ok: false, reason, message }; }
function insertionTransaction(ctx, actionId, insert, selectionOffset = insert.length, undoGroup = actionId) {
  const from = ctx.selectionStart; const to = ctx.selectionEnd; const cursor = from + selectionOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert }], { start: cursor, end: cursor, direction: "none" }, undoGroup));
}
function removePrefixFromLine(ctx, actionId, prefixEndOffset, announcement) {
  const from = ctx.currentLine.start; const to = ctx.currentLine.start + prefixEndOffset;
  return ok(tx(ctx, actionId, [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, actionId), announcement);
}

function parseFixtureMarkedValue(marked) {
  let value = ""; let selectionStart = -1; let selectionEnd = -1;
  for (let i = 0; i < marked.length; i += 1) {
    const char = marked[i];
    if (char === "|") { selectionStart = value.length; selectionEnd = value.length; continue; }
    if (char === "[" && marked[i + 1] === "]") { value += char; continue; }
    if (char === "[" && /^(?: |x|X)\]/.test(marked.slice(i + 1, i + 3))) { value += char; continue; }
    if (char === "]" && /\[(?: |x|X)$/.test(value.slice(-2))) { value += char; continue; }
    if (char === "[" && selectionStart === -1) { selectionStart = value.length; continue; }
    if (char === "]" && selectionStart !== -1 && selectionEnd === -1) { selectionEnd = value.length; continue; }
    value += char;
  }
  if (selectionStart === -1) selectionStart = value.length;
  if (selectionEnd === -1) selectionEnd = selectionStart;
  return { value, selectionStart, selectionEnd };
}
function serializeMarkedValue(value, start, end) {
  if (start === end) return value.slice(0, start) + "|" + value.slice(start);
  return value.slice(0, start) + "[" + value.slice(start, end) + "]" + value.slice(end);
}

function parseBlocks(markdown) {
  const source = normalizeLineEndings(markdown);
  const lines = getLines(source);
  const blocks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (i + 1 < lines.length && isLikelyTableRow(line.text) && isTableDelimiter(lines[i + 1].text)) {
      const header = { ...lines[i], cells: parseTableLineRanges(lines[i].text, lines[i].start) };
      const delimiter = { ...lines[i + 1], cells: parseTableLineRanges(lines[i + 1].text, lines[i + 1].start) };
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].text.trim() && isLikelyTableRow(lines[j].text)) {
        rows.push({ ...lines[j], cells: parseTableLineRanges(lines[j].text, lines[j].start) });
        j += 1;
      }
      blocks.push({ type: "table", from: line.start, to: (rows.at(-1) ?? delimiter).end, newlineEnd: (rows.at(-1) ?? delimiter).newlineEnd, header, delimiter, rows });
      i = j - 1;
      continue;
    }
    if (isFenceLine(line.text) && (line.newlineEnd > line.end || i + 1 < lines.length)) {
      const info = getFenceInfo(line.text) || { language: "" };
      const codeLines = [];
      let j = i + 1;
      while (j < lines.length && !isFenceLine(lines[j].text)) { codeLines.push(lines[j]); j += 1; }
      const closing = j < lines.length ? lines[j] : null;
      blocks.push({ type: "code-fence", from: line.start, to: (closing ?? codeLines.at(-1) ?? line).end, newlineEnd: (closing ?? codeLines.at(-1) ?? line).newlineEnd, opening: line, closing, codeLines, language: info.language });
      i = closing ? j : j - 1;
      continue;
    }
    const heading = parseHeading(line.text);
    if (heading) { blocks.push({ type: "heading", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, heading }); continue; }
    const list = parseListItem(line.text);
    if (list) { blocks.push({ type: list.kind, from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, list }); continue; }
    const quote = parseBlockquote(line.text);
    if (quote) { blocks.push({ type: "blockquote", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, quote }); continue; }
    if (isHorizontalRule(line.text)) { blocks.push({ type: "horizontal-rule", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line }); continue; }
    blocks.push({ type: line.text.trim() ? "paragraph" : "blank", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line });
  }
  if (blocks.length === 0) blocks.push({ type: "blank", from: 0, to: 0, newlineEnd: 0, line: { start: 0, end: 0, newlineEnd: 0, text: "" } });
  return blocks;
}

function decorateInline(raw) {
  const text = String(raw ?? "");
  let i = 0;
  let html = "";
  const token = t => `<span class="md-token">${escapeHtml(t)}</span>`;
  while (i < text.length) {
    if (text.startsWith("`", i)) {
      const end = text.indexOf("`", i + 1);
      if (end > i) { html += token("`") + `<code>${escapeHtml(text.slice(i + 1, end))}</code>` + token("`"); i = end + 1; continue; }
    }
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) { html += token("**") + `<strong>${decorateInline(text.slice(i + 2, end))}</strong>` + token("**"); i = end + 2; continue; }
    }
    if (text.startsWith("~~", i)) {
      const end = text.indexOf("~~", i + 2);
      if (end > i + 2) { html += token("~~") + `<del>${decorateInline(text.slice(i + 2, end))}</del>` + token("~~"); i = end + 2; continue; }
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1) { html += token("*") + `<em>${decorateInline(text.slice(i + 1, end))}</em>` + token("*"); i = end + 1; continue; }
    }
    const link = /^(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/.exec(text.slice(i));
    if (link) {
      const [full, bang, label, url] = link;
      const safe = safeHref(url);
      const labelHtml = decorateInline(label);
      if (bang) html += token("![") + labelHtml + token("](") + `<span class="md-url">${escapeHtml(url)}</span>` + token(")");
      else html += token("[") + `<a href="${escapeAttribute(safe)}" tabindex="-1">${labelHtml}</a>` + token("](") + `<span class="md-url">${escapeHtml(url)}</span>` + token(")");
      i += full.length;
      continue;
    }
    html += escapeHtml(text[i]);
    i += 1;
  }
  return html || "<br>";
}

function renderInlineMarkdown(source, opts = {}) {
  // Preview renderer: sanitize by construction. Unlike decorateInline, markdown delimiters are not retained.
  let text = String(source ?? "");
  const tokens = [];
  const reserve = html => { const token = `\uE000${tokens.length}\uE001`; tokens.push([token, html]); return token; };
  text = text.replace(/`([^`\n]+?)`/g, (_, code) => reserve(`<code>${escapeHtml(code)}</code>`));
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (all, alt, url, title) => {
    const safe = safeHref(url, { allowDataImage: false }); if (safe === "#" && String(url).trim() !== "#") return escapeHtml(all);
    return reserve(`<img src="${escapeAttribute(safe)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ""}>`);
  });
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (all, label, url, title) => {
    const safe = safeHref(url); if (safe === "#" && String(url).trim() !== "#") return escapeHtml(label);
    const target = opts.linkTarget === "_blank" ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
    return reserve(`<a href="${escapeAttribute(safe)}"${target}${title ? ` title="${escapeAttribute(title)}"` : ""}>${renderInlineMarkdown(label, opts)}</a>`);
  });
  text = escapeHtml(text);
  text = text.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?\])}])/g, (m, p, url) => `${p}<a href="${escapeAttribute(safeHref(url))}">${escapeHtml(url)}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  for (const [token, html] of tokens) text = text.replaceAll(escapeHtml(token), html).replaceAll(token, html);
  return text;
}

function renderMarkdown(markdown, opts = {}) {
  const options = { ...DEFAULTS, ...opts };
  const blocks = parseBlocks(markdown);
  const out = [];
  for (const block of blocks) {
    if (block.type === "blank") continue;
    if (block.type === "heading") { out.push(`<h${block.heading.level}>${renderInlineMarkdown(block.heading.content, options)}</h${block.heading.level}>`); continue; }
    if (block.type === "horizontal-rule") { out.push("<hr>"); continue; }
    if (block.type === "blockquote") { out.push(`<blockquote>${renderInlineMarkdown(block.quote.content, options)}</blockquote>`); continue; }
    if (block.type === "bullet-list-item" || block.type === "ordered-list-item" || block.type === "task-list-item") {
      const list = block.list;
      const checkbox = list.kind === "task-list-item" ? `<input type="checkbox" disabled${list.checked ? " checked" : ""}> ` : "";
      out.push(`<ul><li>${checkbox}${renderInlineMarkdown(list.content, options)}</li></ul>`); continue;
    }
    if (block.type === "code-fence") {
      const lang = block.language ? ` class="language-${escapeAttribute(block.language)}"` : "";
      out.push(`<pre><code${lang}>${escapeHtml(block.codeLines.map(l => l.text).join("\n"))}</code></pre>`); continue;
    }
    if (block.type === "table") {
      const header = block.header.cells;
      const rows = block.rows;
      out.push(`<div class="md-table-wrap"><table><thead><tr>${header.map(c => `<th>${renderInlineMarkdown(c.text, options)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${header.map((_, i) => `<td>${renderInlineMarkdown(r.cells[i]?.text ?? "", options)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`); continue;
    }
    out.push(`<p>${renderInlineMarkdown(block.line.text, options)}</p>`);
  }
  return out.join("\n");
}
function textFromMarkdown(markdown) { return stripHtml(renderMarkdown(markdown)).replace(/\n{3,}/g, "\n\n").trim(); }

class MdLiveEditorElement extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return REFLECTED_ATTRIBUTES; }

  constructor() {
    super();
    this._internals = this.attachInternals?.() ?? null;
    this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
    this._value = "";
    this._defaultValue = "";
    this._selection = { start: 0, end: 0, direction: "none" };
    this._dirty = false;
    this._hasConnected = false;
    this._isComposing = false;
    this._beforeInputSnapshot = null;
    this._undoStack = [];
    this._redoStack = [];
    this._maxUndo = 300;
    this._selectAllLevel = 0;
    this._structuredSelection = null;
    this._ignoreSelectionChangeCount = 0;
    this._pointerSelection = null;
    this._suppressLiveClick = false;
    this._actions = new Map();
    this._providers = new Map();
    this._completion = { open: false, providerId: null, match: null, items: [], activeIndex: 0, requestId: 0, abort: null };
    this._ids = { label: uid("mdle-label"), source: uid("mdle-source"), live: uid("mdle-live"), completion: uid("mdle-completion"), status: uid("mdle-status"), validation: uid("mdle-validation") };
    this._installBuiltInActions();
    this._installBuiltInProviders();
  }

  connectedCallback() {
    if (!this._hasConnected) {
      this._upgradeProperties();
      this._renderShell();
      this._bindEvents();
      this._hasConnected = true;
      const initial = this.getAttribute("value") ?? this._value ?? "";
      this._defaultValue = normalizeLineEndings(initial);
      this._setValueInternal(this._defaultValue, { source: "init", silent: true, recordUndo: false, preserveSelection: false });
      this._syncAttributesToControls();
      this._renderAll({ restoreSelection: false });
      this._updateFormValue();
      this._updateValidity();
    } else {
      this._syncAttributesToControls();
      this._renderAll({ restoreSelection: true });
      this._updateFormValue();
      this._updateValidity();
    }
  }
  disconnectedCallback() { this._completion.abort?.abort(); }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") { if (!this._hasConnected) { this._value = normalizeLineEndings(newValue ?? ""); this._defaultValue = this._value; } return; }
    if (!this._hasConnected) return;
    this._syncAttributesToControls();
    if (name === "mode" || name === "preview") this._renderAll({ restoreSelection: true });
    if (["required", "disabled", "readonly", "maxlength", "minlength"].includes(name)) { this._updateFormValue(); this._updateValidity(); }
  }

  get value() { return this._value; }
  set value(next) { this._setValueInternal(next, { source: "api", silent: false, recordUndo: false }); }
  get defaultValue() { return this._defaultValue; }
  set defaultValue(next) { this._defaultValue = normalizeLineEndings(next ?? ""); this.setAttribute("value", this._defaultValue); }
  get name() { return this.getAttribute("name") ?? ""; }
  set name(v) { v == null ? this.removeAttribute("name") : this.setAttribute("name", String(v)); }
  get label() { return this.getAttribute("label") ?? ""; }
  set label(v) { v == null ? this.removeAttribute("label") : this.setAttribute("label", String(v)); }
  get placeholder() { return this.getAttribute("placeholder") ?? DEFAULTS.placeholder; }
  set placeholder(v) { v == null ? this.removeAttribute("placeholder") : this.setAttribute("placeholder", String(v)); }
  get mode() { const v = this.getAttribute("mode") ?? DEFAULTS.mode; return ["live", "source", "split", "preview"].includes(v) ? v : DEFAULTS.mode; }
  set mode(v) { v == null ? this.removeAttribute("mode") : this.setAttribute("mode", String(v)); }
  get preview() { const v = this.getAttribute("preview") ?? DEFAULTS.preview; return ["none", "below", "side", "inline-split"].includes(v) ? v : DEFAULTS.preview; }
  set preview(v) { v == null ? this.removeAttribute("preview") : this.setAttribute("preview", String(v)); }
  get markdownFlavor() { const v = this.getAttribute("markdown-flavor") ?? DEFAULTS.markdownFlavor; return ["gfm", "commonmark"].includes(v) ? v : DEFAULTS.markdownFlavor; }
  set markdownFlavor(v) { v == null ? this.removeAttribute("markdown-flavor") : this.setAttribute("markdown-flavor", String(v)); }
  get tabBehavior() { const v = this.getAttribute("tab-behavior") ?? DEFAULTS.tabBehavior; return ["accessibility-first", "editor-first"].includes(v) ? v : DEFAULTS.tabBehavior; }
  set tabBehavior(v) { v == null ? this.removeAttribute("tab-behavior") : this.setAttribute("tab-behavior", String(v)); }
  get indentString() { return normalizeIndentAttribute(this.getAttribute("indent-string") ?? DEFAULTS.indentString); }
  set indentString(v) { this.setAttribute("indent-string", v === "\t" ? "tab" : String(v)); }
  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(v) { this.toggleAttribute("disabled", Boolean(v)); }
  get readonly() { return this.hasAttribute("readonly"); }
  set readonly(v) { this.toggleAttribute("readonly", Boolean(v)); }
  get required() { return this.hasAttribute("required"); }
  set required(v) { this.toggleAttribute("required", Boolean(v)); }
  get dirty() { return this._dirty; }
  get selectionStart() { return this._getCurrentSelection().start; }
  set selectionStart(v) { this.setSelectionRange(v, this.selectionEnd); }
  get selectionEnd() { return this._getCurrentSelection().end; }
  set selectionEnd(v) { this.setSelectionRange(this.selectionStart, v); }
  get validationMessage() { return this._internals?.validationMessage || this._validationMessage || ""; }
  get validity() { return this._internals?.validity ?? this._fallbackValidity(); }
  get willValidate() { return this._internals?.willValidate ?? !this.disabled; }

  focus(options) { this._focusEditable(options); }
  blur() { this._sourceTextarea?.blur(); this._liveEditor?.blur(); }
  select() { this.setSelectionRange(0, this._value.length); }
  setSelectionRange(start, end, direction = "none") {
    const s = clamp(Number(start) || 0, 0, this._value.length);
    const e = clamp(Number(end) || 0, 0, this._value.length);
    this._selection = { start: s, end: e, direction };
    this._structuredSelection = (!this._isSourceActive() && s !== e) ? { start: s, end: e, direction, label: "selection" } : null;
    if (this._sourceTextarea && this._isSourceActive()) this._sourceTextarea.setSelectionRange(s, e, direction);
    if (this._liveEditor && !this._isSourceActive()) { this._ignoreSelectionChangeCount = 2; this._restoreLiveSelection(this._selection); }
    this._emitSelectionChange();
    this._maybeUpdateCompletions();
  }
  exec(actionId, args) { const result = this._runAction(actionId, args, { source: "api", apply: true }); return Boolean(result?.ok); }
  registerAction(action) {
    if (!action || typeof action.id !== "string" || typeof action.run !== "function") throw new TypeError("registerAction(action) requires an action with string id and run(ctx,args).");
    this._actions.set(action.id, { group: "Custom", visibleInSlash: false, aliases: [], keywords: [], ...action });
  }
  unregisterAction(actionId) { this._actions.delete(actionId); }
  registerCompletionProvider(provider) {
    if (!provider || typeof provider.id !== "string" || typeof provider.match !== "function" || typeof provider.getItems !== "function" || typeof provider.apply !== "function") throw new TypeError("Completion provider requires id, match, getItems, apply.");
    this._providers.set(provider.id, { priority: 0, triggers: [], ...provider });
  }
  unregisterCompletionProvider(providerId) { this._providers.delete(providerId); if (this._completion.providerId === providerId) this._closeCompletion(); }
  getHTML() { return renderMarkdown(this._value, this._rendererOptions()); }
  getText() { return textFromMarkdown(this._value); }
  getMarkdown() { return this._value; }
  setMarkdown(markdown) { this.value = markdown; }
  getPlainText() { return this.getText(); }
  getSelectionMarkdown() { const sel = this._getCurrentSelection(); return this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end)); }
  insertMarkdown(markdown) { return this.exec("editor.insertText", { text: markdown }); }
  canExec(actionId, args) { const action = this._actions.get(actionId); if (!action) return false; const ctx = this._getContext(); if (ctx.mode === "disabled" && !action.viewSafe) return false; if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return false; return !action.when || action.when(ctx, args); }
  getCurrentBlock() { const sel = this._getCurrentSelection(); return this._findBlockAtOffset(sel.start) || null; }
  getSelectedBlocks() { const sel = this._getCurrentSelection(); const start = Math.min(sel.start, sel.end); const end = Math.max(sel.start, sel.end); return parseBlocks(this._value).filter(block => block.to >= start && block.from <= end); }
  getActiveMarks() { return this._getActiveStateIds(this._getContext()); }
  find(query, options = {}) { return this._findText(query, options); }
  replace(query, replacement, options = {}) { return this._replaceText(query, replacement, { ...options, all: false }); }
  replaceAll(query, replacement, options = {}) { return this._replaceText(query, replacement, { ...options, all: true }); }
  commit() { const old = this._dirty; this._defaultValue = this._value; this._dirty = false; this._dispatch("md-change", { value: this._value }); if (old) this._dispatch("md-dirty-change", { dirty: false }); }
  reset() { this._setValueInternal(this._defaultValue, { source: "api", recordUndo: true }); this.setSelectionRange(0, 0); this._dirty = false; this._dispatch("md-dirty-change", { dirty: false }); }
  checkValidity() { this._updateValidity(); return this._internals ? this._internals.checkValidity() : this._fallbackValidity().valid; }
  reportValidity() { this._updateValidity(); return this._internals ? this._internals.reportValidity() : this.checkValidity(); }
  setCustomValidity(message) { this._customValidityMessage = String(message ?? ""); this._updateValidity(); }
  runFixture(fixture) {
    const p = parseFixtureMarkedValue(fixture.before); this.value = p.value; this.setSelectionRange(p.selectionStart, p.selectionEnd);
    const passedExec = this.exec(fixture.action, fixture.args); const sel = this._selection; const actual = serializeMarkedValue(this.value, sel.start, sel.end);
    return { name: fixture.name, passedExec, expected: fixture.after, actual, passed: actual === fixture.after };
  }

  _upgradeProperties() {
    for (const prop of ["value", "defaultValue", "name", "label", "placeholder", "mode", "preview", "markdownFlavor", "tabBehavior", "indentString", "disabled", "readonly", "required"]) {
      if (Object.prototype.hasOwnProperty.call(this, prop)) { const value = this[prop]; delete this[prop]; this[prop] = value; }
    }
  }

  _renderShell() {
    this._shadow.innerHTML = `
      <style>
        :host {
          --md-editor-font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          --md-editor-mono-font: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          --md-editor-font-size: 15px;
          --md-editor-line-height: 1.55;
          --md-editor-bg: Canvas;
          --md-editor-fg: CanvasText;
          --md-editor-muted: color-mix(in srgb, CanvasText 55%, Canvas 45%);
          --md-editor-token: color-mix(in srgb, CanvasText 42%, Canvas 58%);
          --md-editor-border: color-mix(in srgb, CanvasText 22%, Canvas 78%);
          --md-editor-border-focus: Highlight;
          --md-editor-radius: 10px;
          --md-editor-padding: 14px;
          --md-editor-min-height: 220px;
          --md-editor-max-height: none;
          --md-editor-focus-ring: 0 0 0 3px color-mix(in srgb, Highlight 32%, transparent);
          --md-editor-active-line-ring: none;
          --md-editor-active-line-bg: transparent;
          --md-editor-active-cell-ring: var(--md-editor-active-line-ring);
          --md-editor-active-cell-bg: var(--md-editor-active-line-bg);
          --md-editor-popup-bg: Canvas;
          --md-editor-popup-fg: CanvasText;
          --md-editor-popup-border: color-mix(in srgb, CanvasText 24%, Canvas 76%);
          --md-editor-popup-shadow: 0 12px 30px rgb(0 0 0 / 0.16);
          --md-editor-preview-bg: color-mix(in srgb, Canvas 96%, CanvasText 4%);
          --md-editor-preview-fg: CanvasText;
          --md-editor-code-bg: color-mix(in srgb, CanvasText 8%, Canvas 92%);
          --md-editor-code-header-bg: color-mix(in srgb, CanvasText 5%, Canvas 95%);
          --md-editor-code-accent: color-mix(in srgb, CanvasText 45%, Canvas 55%);
          --md-editor-danger: #b00020;
          --md-editor-transition-duration: 140ms;
          --md-editor-transition-ease: cubic-bezier(.2,.8,.2,1);
          display: block;
          font-family: var(--md-editor-font);
          color: var(--md-editor-fg);
        }
        :host([hidden]) { display: none; }
        .container { display: grid; gap: 8px; font-size: var(--md-editor-font-size); }
        .label:empty { display: none; }
        .label { font-weight: 650; color: var(--md-editor-fg); }
        .workspace { display: grid; gap: 10px; }
        :host([mode="split"]) .workspace, :host([preview="side"]) .workspace { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: stretch; }
        .editor-shell { position: relative; min-width: 0; }
        .live-editor, textarea, .preview {
          box-sizing: border-box; inline-size: 100%; min-block-size: var(--md-editor-min-height); max-block-size: var(--md-editor-max-height);
          border: 1px solid var(--md-editor-border); border-radius: var(--md-editor-radius); padding: var(--md-editor-padding);
          background: var(--md-editor-bg); color: var(--md-editor-fg); line-height: var(--md-editor-line-height); overflow: auto;
          transition: border-color var(--md-editor-transition-duration) var(--md-editor-transition-ease), box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease), background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease);
        }
        .live-editor:focus, textarea:focus { outline: none; border-color: var(--md-editor-border-focus); box-shadow: var(--md-editor-focus-ring); }
        .live-editor[aria-disabled="true"], textarea:disabled { opacity: 0.62; cursor: not-allowed; }
        textarea { display: none; resize: vertical; font-family: var(--md-editor-mono-font); font-size: var(--md-editor-font-size); tab-size: 2; }
        :host([mode="source"]) .live-editor { display: none; }
        :host([mode="source"]) textarea { display: block; }
        :host([mode="split"]) textarea { display: block; }
        :host([mode="preview"]) .live-editor { display: none; }
        :host([mode="preview"]) textarea { display: none; }
        .preview { display: none; background: var(--md-editor-preview-bg); color: var(--md-editor-preview-fg); }
        :host([mode="preview"]) .preview, :host([mode="split"]) .preview, :host([preview="below"]) .preview, :host([preview="side"]) .preview, :host([preview="inline-split"]) .preview { display: block; }
        :host([preview="none"]):not([mode="split"]):not([mode="preview"]) .preview { display: none; }
        .live-placeholder { color: var(--md-editor-muted); pointer-events: none; }
        .md-line { position: relative; min-block-size: 1.35em; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 6px; padding: 1px 2px; outline: none; transition: background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease), box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease); }
        .md-line:focus, .md-task-source:focus, .md-code-line:focus { box-shadow: var(--md-editor-active-line-ring); background: var(--md-editor-active-line-bg); }
        .md-cell:focus { box-shadow: var(--md-editor-active-cell-ring); background: var(--md-editor-active-cell-bg); }
        .md-line + .md-line, .md-code-block + .md-line, .md-table-block + .md-line { margin-block-start: 0.14rem; }
        .md-token { color: var(--md-editor-token); font-weight: 500; }
        .md-url { color: var(--md-editor-muted); text-decoration: underline; }
        .md-heading { font-family: var(--md-editor-font); font-weight: 760; line-height: 1.18; margin-block: 0.22em; }
        .md-h1 { font-size: 2.0em; }
        .md-h2 { font-size: 1.6em; }
        .md-h3 { font-size: 1.35em; }
        .md-h4 { font-size: 1.18em; }
        .md-h5 { font-size: 1.05em; }
        .md-h6 { font-size: 1em; }
        .md-list { padding-inline-start: calc(var(--md-list-depth, 0) * 1.4em + 2px); }
        .md-task-line { display: flex; align-items: baseline; gap: 0.35em; }
        .md-task-line input { transform: translateY(0.12em); }
        .md-task-source { flex: 1; min-width: 0; white-space: pre-wrap; outline: none; border-radius: 6px; }
        .md-quote { border-inline-start: 4px solid var(--md-editor-border); padding-inline-start: 0.75em; color: color-mix(in srgb, CanvasText 80%, Canvas 20%); }
        .md-hr-line { display: block; min-block-size: 1.35em; padding-block: 0.55em; color: var(--md-editor-token); cursor: text; }
        .md-hr-line::after { content: ""; display: block; border-block-start: 1px solid var(--md-editor-border); }
        .md-hr-line .md-token { display: none; }
        .md-code-block { margin-block: 0.55em; border: 1px solid var(--md-editor-border); border-radius: var(--md-editor-radius); background: var(--md-editor-code-bg); overflow: hidden; transition: border-color var(--md-editor-transition-duration) var(--md-editor-transition-ease), background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease), box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease); }
        .md-code-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-block-size: 30px; padding: 5px 10px; border-block-end: 1px solid color-mix(in srgb, var(--md-editor-border) 82%, transparent); background: var(--md-editor-code-header-bg); color: var(--md-editor-code-accent); font-family: var(--md-editor-mono-font); font-size: 0.82em; user-select: none; }
        .md-code-label { text-transform: lowercase; letter-spacing: 0.015em; }
        .md-code-language { color: var(--md-editor-muted); }
        .md-code-lines { padding: 10px 12px; font-family: var(--md-editor-mono-font); white-space: pre; overflow-x: auto; }
        .md-code-line { min-height: 1.35em; outline: none; white-space: pre; border-radius: 5px; }
        .md-code-line:empty::before { content: "\\200b"; }
        .md-code-fence { display: none; }
        .md-table-block { overflow: auto; margin-block: 0.5em; }
        .md-table { border-collapse: collapse; inline-size: 100%; table-layout: fixed; }
        .md-table th, .md-table td { border: 1px solid var(--md-editor-border); padding: 6px 8px; vertical-align: top; }
        .md-table th { background: color-mix(in srgb, CanvasText 7%, Canvas 93%); font-weight: 700; }
        .md-cell { min-height: 1.35em; outline: none; white-space: pre-wrap; overflow-wrap: anywhere; }
        .preview :first-child { margin-block-start: 0; } .preview :last-child { margin-block-end: 0; }
        .preview pre { overflow: auto; padding: 10px; border-radius: 6px; background: var(--md-editor-code-bg); }
        .preview code { font-family: var(--md-editor-mono-font); font-size: 0.95em; }
        .preview :not(pre) > code { padding: 0.1em 0.3em; border-radius: 4px; background: var(--md-editor-code-bg); }
        .preview blockquote { border-inline-start: 4px solid var(--md-editor-border); margin-inline-start: 0; padding-inline-start: 1em; color: var(--md-editor-muted); }
        .preview img { max-inline-size: 100%; block-size: auto; }
        .preview .md-table-wrap { overflow: auto; } .preview table { border-collapse: collapse; inline-size: 100%; } .preview th, .preview td { border: 1px solid var(--md-editor-border); padding: 6px 8px; }
        .completion-popup { position: absolute; z-index: 20; min-inline-size: 240px; max-inline-size: min(420px, 90vw); max-block-size: min(320px, 50vh); overflow: auto; border: 1px solid var(--md-editor-popup-border); border-radius: var(--md-editor-radius); background: var(--md-editor-popup-bg); color: var(--md-editor-popup-fg); box-shadow: var(--md-editor-popup-shadow); padding: 4px; }
        .completion-popup[hidden] { display: none; }
        @keyframes md-editor-pop { from { opacity: 0; transform: translateY(-3px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .completion-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
        .completion-item[aria-selected="true"] { background: color-mix(in srgb, Highlight 18%, transparent); }
        .completion-label { font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .completion-detail, .completion-description { color: var(--md-editor-muted); font-size: 0.9em; } .completion-description { grid-column: 1 / -1; }
        .validation { min-block-size: 1.2em; color: var(--md-editor-danger); font-size: 0.92em; } .validation:empty { display: none; }
        .sr-only { position: absolute; inline-size: 1px; block-size: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 720px) { :host([mode="split"]) .workspace, :host([preview="side"]) .workspace { grid-template-columns: 1fr; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; } }
      </style>
      <div class="container" part="container">
        <label class="label" part="label" id="${this._ids.label}" for="${this._ids.source}"></label>
        <div class="workspace">
          <div class="editor-shell" part="editor">
            <div class="live-editor" part="live-editor" id="${this._ids.live}" role="textbox" aria-multiline="true" tabindex="0" aria-controls="${this._ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${this._ids.validation}"></div>
            <textarea part="textarea" id="${this._ids.source}" aria-controls="${this._ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${this._ids.validation}" rows="12"></textarea>
            <div class="completion-popup" part="completion-popup" id="${this._ids.completion}" role="listbox" hidden></div>
          </div>
          <div class="preview" part="preview" aria-label="Rendered markdown preview"></div>
        </div>
        <div class="validation" part="error" id="${this._ids.validation}"></div>
        <div class="sr-only" part="status" id="${this._ids.status}" aria-live="polite" aria-atomic="true"></div>
      </div>`;
    this._label = this._shadow.querySelector(".label");
    this._liveEditor = this._shadow.querySelector(".live-editor");
    this._sourceTextarea = this._shadow.querySelector("textarea");
    this._preview = this._shadow.querySelector(".preview");
    this._completionPopup = this._shadow.querySelector(".completion-popup");
    this._validation = this._shadow.querySelector(".validation");
    this._status = this._shadow.querySelector(".sr-only");
  }

  _bindEvents() {
    this._sourceTextarea.addEventListener("beforeinput", () => this._beforeInputSnapshot = this._snapshot());
    this._sourceTextarea.addEventListener("input", event => this._onSourceInput(event));
    this._sourceTextarea.addEventListener("change", () => this._dispatch("md-change", { value: this._value }));
    this._sourceTextarea.addEventListener("keydown", event => this._onKeyDown(event));
    this._sourceTextarea.addEventListener("keyup", event => this._onNavigationKey(event));
    this._sourceTextarea.addEventListener("click", () => this._onSelectionChanged());
    this._sourceTextarea.addEventListener("select", () => this._onSelectionChanged());
    this._sourceTextarea.addEventListener("paste", event => this._onPaste(event));
    this._sourceTextarea.addEventListener("drop", event => this._onDrop(event));
    this._sourceTextarea.addEventListener("compositionstart", () => { this._isComposing = true; this._closeCompletion(); });
    this._sourceTextarea.addEventListener("compositionend", () => { this._isComposing = false; this._maybeUpdateCompletions(); });

    this._liveEditor.addEventListener("focus", () => { if (this._selection.start > this._value.length) this._selection = { start: 0, end: 0, direction: "none" }; }, true);
    this._liveEditor.addEventListener("keydown", event => this._onKeyDown(event));
    this._liveEditor.addEventListener("keyup", event => this._onNavigationKey(event));
    this._liveEditor.addEventListener("beforeinput", event => this._onLiveBeforeInput(event));
    this._liveEditor.addEventListener("input", event => this._onLiveInput(event));
    this._liveEditor.addEventListener("click", event => this._onLiveClick(event));
    this._liveEditor.addEventListener("mousedown", event => this._onLiveMouseDown(event));
    this._liveEditor.addEventListener("mouseup", () => this._onSelectionChanged());
    this._liveEditor.addEventListener("copy", event => this._onLiveCopy(event));
    this._liveEditor.addEventListener("cut", event => this._onLiveCut(event));
    this._liveEditor.addEventListener("paste", event => this._onPaste(event));
    this._liveEditor.addEventListener("drop", event => this._onDrop(event));
    this._liveEditor.addEventListener("compositionstart", () => { this._isComposing = true; this._closeCompletion(); });
    this._liveEditor.addEventListener("compositionend", () => { this._isComposing = false; this._onSelectionChanged(); });

    this._completionPopup.addEventListener("mousedown", e => e.preventDefault());
    this._completionPopup.addEventListener("click", e => { const item = e.target.closest("[data-index]"); if (!item) return; this._completion.activeIndex = Number(item.dataset.index); this._acceptCompletion("pointer"); });
    this._shadow.addEventListener("selectionchange", () => this._onSelectionChanged?.());
  }

  _syncAttributesToControls() {
    if (!this._sourceTextarea) return;
    this._label.textContent = this.label; this._label.hidden = !this.label;
    this._sourceTextarea.placeholder = this.placeholder;
    this._sourceTextarea.disabled = this.disabled;
    this._sourceTextarea.readOnly = this.readonly;
    this._sourceTextarea.required = this.required;
    this._sourceTextarea.name = this.name;
    this._liveEditor.setAttribute("aria-readonly", this.readonly ? "true" : "false");
    this._liveEditor.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    this._liveEditor.contentEditable = this._lineEditable();
    this._liveEditor.tabIndex = this.disabled ? -1 : 0;
    const maxLength = this.getAttribute("maxlength"); const minLength = this.getAttribute("minlength");
    maxLength != null ? this._sourceTextarea.maxLength = Number(maxLength) : this._sourceTextarea.removeAttribute("maxlength");
    minLength != null ? this._sourceTextarea.minLength = Number(minLength) : this._sourceTextarea.removeAttribute("minlength");
    if (this.hasAttribute("spellcheck")) { const raw = this.getAttribute("spellcheck"); this._sourceTextarea.spellcheck = raw == null || raw === "" || raw === "true"; this._liveEditor.spellcheck = this._sourceTextarea.spellcheck; }
    const ariaLabel = this.getAttribute("aria-label"); const ariaLabelledby = this.getAttribute("aria-labelledby");
    for (const el of [this._sourceTextarea, this._liveEditor]) {
      if (ariaLabel) el.setAttribute("aria-label", ariaLabel); else el.removeAttribute("aria-label");
      if (ariaLabelledby) el.setAttribute("aria-labelledby", ariaLabelledby); else if (this.label) el.setAttribute("aria-labelledby", this._ids.label); else el.removeAttribute("aria-labelledby");
      const dir = this.getAttribute("dir"); if (dir) el.dir = dir;
    }
  }

  _getActiveStateIds(ctx) {
    const ids = [];
    const block = ctx.block || {};
    if (block.kind === "heading" && block.heading) ids.push(`block.heading.${block.heading.level}`);
    if (block.kind === "bullet-list-item") ids.push("block.bulletList");
    if (block.kind === "ordered-list-item") ids.push("block.orderedList");
    if (block.kind === "task-list-item") ids.push("block.taskList");
    if (block.kind === "blockquote") ids.push("block.blockquote");
    if (block.kind === "fenced-code") ids.push("block.codeFence");
    if (block.kind === "table") ids.push("block.table");
    const line = ctx.currentLine?.text ?? "";
    const pos = clamp(ctx.selectionStart - (ctx.currentLine?.start ?? 0), 0, line.length);
    const before = line.slice(0, pos); const after = line.slice(pos);
    if ((before.match(/\*\*/g) || []).length % 2 === 1 && after.includes("**")) ids.push("inline.bold");
    if ((before.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 === 1 && /(?<!\*)\*(?!\*)/.test(after)) ids.push("inline.italic");
    if ((before.match(/(?<!\\)`/g) || []).length % 2 === 1 && /(?<!\\)`/.test(after)) ids.push("inline.code");
    if ((before.match(/~~/g) || []).length % 2 === 1 && after.includes("~~")) ids.push("inline.strikethrough");
    if (/\[[^\]]*$/.test(before) && /\]\([^)]+\)/.test(after)) ids.push("inline.link");
    return ids;
  }
  _findText(query, options = {}) {
    const q = String(query ?? ""); if (!q) return null;
    const hay = options.caseSensitive ? this._value : this._value.toLowerCase();
    const needle = options.caseSensitive ? q : q.toLowerCase();
    const from = clamp(Number(options.from ?? this.selectionEnd ?? 0), 0, this._value.length);
    let index = hay.indexOf(needle, from);
    if (index === -1 && options.wrap !== false) index = hay.indexOf(needle, 0);
    if (index === -1) return null;
    this.setSelectionRange(index, index + q.length, "forward");
    this._announce("Match found.");
    return { start: index, end: index + q.length, text: this._value.slice(index, index + q.length) };
  }
  _replaceText(query, replacement, options = {}) {
    const q = String(query ?? ""); if (!q) return 0;
    const repl = normalizeLineEndings(replacement ?? "");
    const source = options.caseSensitive ? this._value : this._value.toLowerCase();
    const needle = options.caseSensitive ? q : q.toLowerCase();
    const changes = [];
    if (options.all) {
      let i = 0;
      while ((i = source.indexOf(needle, i)) !== -1) { changes.push({ from: i, to: i + q.length, insert: repl }); i += q.length || 1; }
    } else {
      const sel = this._getCurrentSelection();
      const selected = this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end));
      const matchSelected = (options.caseSensitive ? selected : selected.toLowerCase()) === needle;
      const found = matchSelected ? { start: Math.min(sel.start, sel.end), end: Math.max(sel.start, sel.end) } : this._findText(q, options);
      if (found) changes.push({ from: found.start, to: found.end, insert: repl });
    }
    if (!changes.length) return 0;
    const first = changes[0].from + repl.length;
    this._applyTransaction({ changes, selectionAfter: { start: first, end: first, direction: "none" }, actionId: options.all ? "editor.replaceAll" : "editor.replace", undoGroup: "replace", source: "api" }, { source: "api" });
    return changes.length;
  }

  _rendererOptions() { return { markdownFlavor: this.markdownFlavor, allowRawHtml: false, sanitize: true, linkTarget: DEFAULTS.linkTarget }; }
  _setValueInternal(next, opts = {}) {
    const value = normalizeLineEndings(next ?? ""); const before = this._snapshot(); const changed = value !== this._value;
    this._value = value; if (this._sourceTextarea && this._sourceTextarea.value !== value) this._sourceTextarea.value = value;
    if (!opts.preserveSelection) this._selection = { start: clamp(this._selection.start, 0, value.length), end: clamp(this._selection.end, 0, value.length), direction: "none" };
    if (opts.recordUndo && changed) this._recordUndo(before, this._snapshot(), opts.undoGroup || opts.source || "api", { coalesce: false });
    if (changed || opts.force || !this._hasRenderedOnce) this._afterValueChanged({ source: opts.source || "api", silent: opts.silent, restoreSelection: opts.preserveSelection !== false });
  }
  _afterValueChanged({ source = "api", inputType = null, silent = false, restoreSelection = true } = {}) {
    this._selectAllLevel = 0;
    this._structuredSelection = null;
    this._updateFormValue(); this._updateValidity(); this._renderAll({ restoreSelection });
    const oldDirty = this._dirty; this._dirty = this._value !== this._defaultValue; if (oldDirty !== this._dirty) this._dispatch("md-dirty-change", { dirty: this._dirty });
    if (!silent) this._dispatch("md-input", { value: this._value, source, inputType });
  }
  _renderAll({ restoreSelection = true } = {}) {
    if (!this._liveEditor) return;
    this._hasRenderedOnce = true;
    this._sourceTextarea.value = this._value;
    this._renderLive();
    this._renderPreview();
    if (restoreSelection && !this._isSourceActive()) this._restoreLiveSelection(this._selection);
  }
  _renderPreview() {
    if (!this._preview) return;
    try { this._preview.innerHTML = this.getHTML(); this._dispatch("md-render", { html: this._preview.innerHTML }); }
    catch (error) { this._preview.innerHTML = `<pre><code>${escapeHtml(this._value)}</code></pre>`; this._emitError("render", error, true); }
  }
  _renderLive() {
    const blocks = parseBlocks(this._value);
    const html = blocks.map(block => this._renderLiveBlock(block)).join("");
    this._liveEditor.innerHTML = html || `<div class="live-placeholder">${escapeHtml(this.placeholder)}</div>`;
  }
  _renderLiveBlock(block) {
    const lineAttrs = (line, kind, extra = "") => `class="md-line ${extra}" part="line" data-editable="line" data-kind="${kind}" data-from="${line.start}" data-to="${line.end}" contenteditable="${this._lineEditable()}" spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}"`;
    if (block.type === "blank") return `<div ${lineAttrs(block.line, "blank")}>${block.line.text ? decorateInline(block.line.text) : "<br>"}</div>`;
    if (block.type === "heading") return `<div ${lineAttrs(block.line, "heading", `md-heading md-h${block.heading.level}`)}>${this._renderHeadingLine(block.line.text, block.heading)}</div>`;
    if (block.type === "blockquote") return `<div ${lineAttrs(block.line, "blockquote", "md-quote")}>${decorateInline(block.line.text)}</div>`;
    if (block.type === "horizontal-rule") return `<div class="md-line md-hr-line" part="line" data-kind="horizontal-rule" data-from="${block.line.start}" data-to="${block.line.end}" contenteditable="false" aria-label="Horizontal rule"></div>`;
    if (block.type === "task-list-item") {
      const list = block.list; const checkOffset = block.line.start + list.indent.length + `${list.marker} [`.length;
      return `<div class="md-line md-task-line md-list" part="line" data-kind="task-list-item" data-from="${block.line.start}" data-to="${block.line.end}" style="--md-list-depth:${Math.floor(list.indent.length / Math.max(1, this.indentString.length))}"><input type="checkbox" part="checkbox" data-task-checkbox="true" data-check-offset="${checkOffset}" ${list.checked ? "checked" : ""} ${this.disabled || this.readonly ? "disabled" : ""}><span class="md-task-source" data-editable="line" data-from="${block.line.start}" data-to="${block.line.end}" contenteditable="${this._lineEditable()}" spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${this._renderTaskLine(block.line.text, list)}</span></div>`;
    }
    if (block.type === "bullet-list-item" || block.type === "ordered-list-item") {
      const list = block.list; const depth = Math.floor(list.indent.length / Math.max(1, this.indentString.length));
      return `<div ${lineAttrs(block.line, block.type, "md-list")} style="--md-list-depth:${depth}">${decorateInline(block.line.text)}</div>`;
    }
    if (block.type === "code-fence") return this._renderCodeFence(block);
    if (block.type === "table") return this._renderTable(block);
    return `<div ${lineAttrs(block.line, "paragraph")}>${decorateInline(block.line.text)}</div>`;
  }
  _lineEditable() { return (!this.disabled && !this.readonly && this.mode !== "preview") ? "true" : "false"; }
  _renderHeadingLine(text, heading) {
    const markerEnd = heading.indent.length + heading.markerText.length;
    return `<span class="md-token">${escapeHtml(text.slice(0, markerEnd))}</span>${decorateInline(text.slice(markerEnd))}`;
  }
  _renderTaskLine(text, list) {
    const markerEnd = list.contentStart;
    return `<span class="md-token">${escapeHtml(text.slice(0, markerEnd))}</span>${decorateInline(text.slice(markerEnd))}`;
  }
  _renderCodeFence(block) {
    const editable = this._lineEditable();
    const language = String(block.language || "").trim();
    const label = language || "code";
    const header = `<div class="md-code-header" part="code-header" contenteditable="false"><span class="md-code-label">${escapeHtml(label)}</span>${language ? `<span class="md-code-language">fenced block</span>` : ""}</div>`;
    const codeLines = block.codeLines.map(line => `<div class="md-code-line" part="code-line" data-editable="line" data-kind="code-line" data-from="${line.start}" data-to="${line.end}" contenteditable="${editable}" spellcheck="false">${escapeHtml(line.text) || "<br>"}</div>`).join("");
    const virtualOffset = block.codeLines[0]?.start ?? (block.closing ? block.opening.newlineEnd : block.opening.end);
    const virtualLine = `<div class="md-code-line" part="code-line" data-editable="virtual-code" data-kind="code-line" data-from="${virtualOffset}" data-to="${virtualOffset}" contenteditable="${editable}" spellcheck="false"><br></div>`;
    return `<div class="md-code-block" part="code-block" data-kind="code-fence" data-from="${block.from}" data-to="${block.to}" data-language="${escapeAttribute(language)}">${header}<div class="md-code-lines" part="code-lines">${codeLines || virtualLine}</div></div>`;
  }
  _renderTable(block) {
    const renderCell = (cell, tag, row, col) => `<${tag}><div class="md-cell" part="table-cell" data-editable="cell" data-row="${row}" data-col="${col}" data-from="${cell?.from ?? block.to}" data-to="${cell?.to ?? block.to}" contenteditable="${this._lineEditable()}" spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${decorateInline(cell?.text ?? "")}</div></${tag}>`;
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const header = `<thead><tr>${Array.from({ length: cols }, (_, i) => renderCell(block.header.cells[i] ?? { text: "", from: block.header.end, to: block.header.end }, "th", -1, i)).join("")}</tr></thead>`;
    const bodyRows = block.rows.length ? block.rows : [{ cells: Array.from({ length: cols }, () => ({ text: "", from: block.delimiter.end, to: block.delimiter.end })) }];
    const body = `<tbody>${bodyRows.map((row, r) => `<tr>${Array.from({ length: cols }, (_, i) => renderCell(row.cells[i] ?? { text: "", from: row.end, to: row.end }, "td", r, i)).join("")}</tr>`).join("")}</tbody>`;
    return `<div class="md-table-block" part="table" data-kind="table" data-from="${block.from}" data-to="${block.to}"><table class="md-table">${header}${body}</table></div>`;
  }

  _onSourceInput(event) {
    const before = this._beforeInputSnapshot;
    this._value = normalizeLineEndings(this._sourceTextarea.value);
    if (this._sourceTextarea.value !== this._value) this._sourceTextarea.value = this._value;
    this._selection = { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
    const after = this._snapshot();
    if (before) this._recordUndo(before, after, this._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
    this._beforeInputSnapshot = null;
    this._afterValueChanged({ source: "user", inputType: event?.inputType, restoreSelection: false });
    if (!this._isComposing) this._maybeUpdateCompletions();
  }
  _onLiveBeforeInput(event) {
    if (this._isComposing) return;
    const inputType = event?.inputType || "";
    if (!this._isSourceActive() && !this.disabled && !this.readonly) {
      const ctx = this._getContext();
      const hasSelection = ctx.selectionStart !== ctx.selectionEnd;
      if (hasSelection && inputType.startsWith("delete")) {
        event.preventDefault();
        this._applyActionResult("editor.deleteSelection", this._deleteSelectionResult(ctx, "editor.deleteSelection"), { source: "user" });
        return;
      }
      if (hasSelection && inputType === "insertText" && event.data != null) {
        event.preventDefault();
        const text = normalizeLineEndings(event.data);
        this._applyActionResult("editor.replaceSelection", insertionTransaction(ctx, "editor.replaceSelection", text, text.length, "typing"), { source: "user" });
        return;
      }
    }
    this._beforeInputSnapshot = this._snapshot();
  }
  _onLiveInput(event) {
    if (this.disabled || this.readonly) return;
    const editable = this._closestEditable(event.target) || this._activeEditableFromSelection();
    if (!editable) return;
    const before = this._beforeInputSnapshot;
    const from = Number(editable.dataset.from); const to = Number(editable.dataset.to);
    const raw = this._plainText(editable).replace(/\n/g, "");
    const liveSelection = this._getLiveSelection(editable);
    const tableEdit = editable.dataset.editable === "cell" ? this._tableCellInputEdit(editable, raw) : null;
    if (tableEdit) {
      this._value = tableEdit.nextValue;
      this._selection = { start: tableEdit.cursor, end: tableEdit.cursor, direction: "none" };
      const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
      if (before) this._recordUndo(before, after, this._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
      this._beforeInputSnapshot = null;
      this._afterValueChanged({ source: "user", inputType: event?.inputType, restoreSelection: true });
      if (!this._isComposing) this._maybeUpdateCompletions();
      return;
    }
    let insert = raw;
    if (editable.dataset.editable === "virtual-code") {
      const beforeSource = this._value.slice(0, from);
      if (!beforeSource.endsWith("\n")) insert = `\n${raw}`;
    }
    const nextValue = this._value.slice(0, from) + insert + this._value.slice(to);
    const cursor = clamp(liveSelection?.end ?? from + insert.length, from, from + insert.length);
    this._value = nextValue;
    this._selection = { start: cursor, end: cursor, direction: "none" };
    const after = this._snapshot();
    if (before) this._recordUndo(before, after, this._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward" });
    this._beforeInputSnapshot = null;
    this._afterValueChanged({ source: "user", inputType: event?.inputType, restoreSelection: true });
    if (!this._isComposing) this._maybeUpdateCompletions();
  }
  _plainText(el) { return (el.innerText ?? el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n+$/g, ""); }
  _closestEditable(target) { return target?.closest?.("[data-editable]") ?? null; }
  _onLiveClick(event) {
    if (this._suppressLiveClick) {
      this._suppressLiveClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this._structuredSelection = null;
    const checkbox = event.target.closest?.("[data-task-checkbox]");
    if (checkbox) { event.preventDefault(); const offset = Number(checkbox.dataset.checkOffset); const current = this._value[offset] || " "; const next = current.toLowerCase() === "x" ? " " : "x"; this._applyTransaction({ changes: [{ from: offset, to: offset + 1, insert: next }], selectionAfter: this._selection, actionId: "block.taskDone", undoGroup: "block", source: "pointer" }, { source: "pointer" }); return; }
    this._onSelectionChanged();
  }

  _onLiveMouseDown(event) {
    if (this.disabled || this.readonly || this.mode === "source" || event.button !== 0 || event.detail > 1) return;
    if (event.target.closest?.("[data-task-checkbox]")) return;
    const anchor = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (anchor == null) return;
    event.preventDefault();
    this._closeCompletion();
    this._pointerSelection = { anchor, focus: anchor, startX: event.clientX, startY: event.clientY, moved: false };
    this.setSelectionRange(anchor, anchor, "none");
    this._boundLiveMouseMove ??= mouseEvent => this._onLiveMouseMove(mouseEvent);
    this._boundLiveMouseEnd ??= mouseEvent => this._onLiveMouseEnd(mouseEvent);
    const doc = this.ownerDocument || document;
    doc.addEventListener("mousemove", this._boundLiveMouseMove, true);
    doc.addEventListener("mouseup", this._boundLiveMouseEnd, true);
  }

  _onLiveMouseMove(event) {
    const state = this._pointerSelection;
    if (!state) return;
    const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (focus == null) return;
    event.preventDefault();
    state.focus = focus;
    state.moved = state.moved || Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 2;
    this._setLivePointerSelection(state.anchor, focus);
  }

  _onLiveMouseEnd(event) {
    const state = this._pointerSelection;
    if (!state) return;
    const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
    if (focus != null) this._setLivePointerSelection(state.anchor, focus);
    this._suppressLiveClick = state.moved;
    if (this._suppressLiveClick) globalThis.setTimeout?.(() => { this._suppressLiveClick = false; }, 0);
    this._pointerSelection = null;
    const doc = this.ownerDocument || document;
    doc.removeEventListener("mousemove", this._boundLiveMouseMove, true);
    doc.removeEventListener("mouseup", this._boundLiveMouseEnd, true);
    event.preventDefault();
  }

  _setLivePointerSelection(anchor, focus) {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    const direction = anchor <= focus ? "forward" : "backward";
    this.setSelectionRange(start, end, direction);
  }

  _onNavigationKey(event) { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) this._onSelectionChanged(); }

  _maybeHandleLiveArrowKey(event, activeEditable = null) {
    if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return false;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return false;
    if (event.shiftKey) return this._maybeExtendLiveVerticalSelection(event);
    const editable = activeEditable || this._activeEditableFromEvent(event);
    if (!editable || editable.dataset.editable === "cell") return false;
    const selection = this._getLiveSelection(editable);
    if (!selection || selection.start !== selection.end) return false;
    const direction = (event.key === "ArrowLeft" || event.key === "ArrowUp") ? -1 : 1;
    const target = (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ? this._horizontalArrowTarget(editable, selection.start, direction)
      : this._verticalArrowTarget(editable, selection.start, direction);
    if (target == null || target === selection.start) return false;
    event.preventDefault();
    this.setSelectionRange(target, target, "none");
    return true;
  }

  _maybeExtendLiveVerticalSelection(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false;
    const selection = this._getCurrentSelection();
    const focus = selection.direction === "backward" ? selection.start : selection.end;
    const anchor = selection.direction === "backward" ? selection.end : selection.start;
    const pos = this._domPositionFromSource(focus);
    const editable = pos?.editable;
    if (!editable || editable.dataset.editable === "cell") return false;
    const direction = event.key === "ArrowUp" ? -1 : 1;
    const target = this._verticalArrowTarget(editable, focus, direction);
    if (target == null || target === focus) return false;
    event.preventDefault();
    this._setSourceBackedSelection(anchor, target);
    return true;
  }

  _setSourceBackedSelection(anchor, focus) {
    const start = Math.min(anchor, focus);
    const end = Math.max(anchor, focus);
    const direction = anchor <= focus ? "forward" : "backward";
    this.setSelectionRange(start, end, direction);
  }

  _horizontalArrowTarget(editable, offset, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    if (direction < 0 && offset <= from) {
      const previous = this._adjacentLiveEditable(editable, -1);
      return previous ? Number(previous.dataset.to) : null;
    }
    if (direction > 0 && offset >= to) {
      const next = this._adjacentLiveEditable(editable, 1);
      return next ? Number(next.dataset.from) : null;
    }
    return null;
  }

  _verticalArrowTarget(editable, offset, direction) {
    if (!this._isCaretOnVisualBoundary(editable, offset, direction)) return null;
    const targetEditable = this._adjacentLiveEditable(editable, direction);
    if (!targetEditable) return null;
    if (this._isSingleVisualRow(editable) && this._isSingleVisualRow(targetEditable)) {
      const sourceColumn = clamp(offset - Number(editable.dataset.from), 0, this._plainText(editable).length);
      return Number(targetEditable.dataset.from) + Math.min(sourceColumn, this._plainText(targetEditable).length);
    }
    const caretRect = this._caretRectForSourceOffset(offset, editable);
    const fallbackRect = editable.getBoundingClientRect();
    const clientX = caretRect?.left ?? fallbackRect.left;
    return this._sourceOffsetInEditableAtX(targetEditable, clientX, direction);
  }

  _isSingleVisualRow(editable) {
    const box = editable.getBoundingClientRect();
    if (!box || box.height === 0) return true;
    return box.height <= this._computedLineHeight(editable) * 1.65;
  }

  _liveNavigationEditables() {
    return [...this._liveEditor.querySelectorAll("[data-editable]")]
      .filter(el => el.dataset.editable !== "cell" && el.dataset.kind !== "horizontal-rule" && Number.isFinite(Number(el.dataset.from)) && Number.isFinite(Number(el.dataset.to)))
      .sort((a, b) => Number(a.dataset.from) - Number(b.dataset.from));
  }

  _adjacentLiveEditable(editable, direction) {
    const editables = this._liveNavigationEditables();
    const index = editables.indexOf(editable);
    return index === -1 ? null : editables[index + direction] || null;
  }

  _computedLineHeight(el) {
    const style = globalThis.getComputedStyle?.(el);
    const parsed = Number.parseFloat(style?.lineHeight || "");
    if (Number.isFinite(parsed)) return parsed;
    const fontSize = Number.parseFloat(style?.fontSize || "");
    return Number.isFinite(fontSize) ? fontSize * 1.2 : 18;
  }

  _isCaretOnVisualBoundary(editable, offset, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    const rect = this._caretRectForSourceOffset(offset, editable);
    const box = editable.getBoundingClientRect();
    if (!rect || !box || box.height === 0) return direction < 0 ? offset <= from : offset >= to;
    const tolerance = this._computedLineHeight(editable) * 0.65;
    return direction < 0
      ? rect.top <= box.top + tolerance
      : rect.bottom >= box.bottom - tolerance;
  }

  _caretRectForSourceOffset(offset, preferredEditable = null) {
    const pos = preferredEditable
      ? this._textPositionInElement(preferredEditable, clamp(offset - Number(preferredEditable.dataset.from), 0, this._plainText(preferredEditable).length))
      : this._domPositionFromSource(offset);
    if (!pos) return null;
    return this._caretRectFromDomPosition(pos.node, pos.offset);
  }

  _caretRectFromDomPosition(node, offset) {
    const range = document.createRange();
    try { range.setStart(node, offset); } catch { return null; }
    range.collapse(true);
    const rect = range.getClientRects()[0] || range.getBoundingClientRect();
    return rect && Number.isFinite(rect.left) && (rect.height > 0 || rect.width > 0) ? rect : null;
  }

  _sourceOffsetInEditableAtX(editable, clientX, direction) {
    const from = Number(editable.dataset.from);
    const to = Number(editable.dataset.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    const box = editable.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return direction < 0 ? to : from;
    const lineHeight = this._computedLineHeight(editable);
    const x = clamp(clientX, box.left + 1, box.right - 1);
    const rowOffset = Math.min(Math.max(lineHeight / 2, 1), Math.max(box.height / 2, 1));
    const y = direction < 0 ? box.bottom - rowOffset : box.top + rowOffset;
    const fromPoint = this._sourceOffsetFromPoint(editable, x, y);
    if (fromPoint != null) return clamp(fromPoint, from, to);
    return this._nearestSourceOffsetInEditable(editable, x, y);
  }

  _sourceOffsetFromPoint(editable, clientX, clientY) {
    const doc = editable.ownerDocument || document;
    let node = null;
    let offset = 0;
    if (doc.caretPositionFromPoint) {
      try {
        const pos = doc.caretPositionFromPoint(clientX, clientY, { shadowRoots: [this._shadow] });
        if (pos) { node = pos.offsetNode; offset = pos.offset; }
      } catch {
        const pos = doc.caretPositionFromPoint(clientX, clientY);
        if (pos) { node = pos.offsetNode; offset = pos.offset; }
      }
    }
    if (!node && doc.caretRangeFromPoint) {
      const range = doc.caretRangeFromPoint(clientX, clientY);
      if (range) { node = range.startContainer; offset = range.startOffset; }
    }
    if (!node || (node !== editable && !editable.contains(node))) return null;
    return this._sourceOffsetFromDom(editable, node, offset);
  }

  _liveEditableFromPoint(clientX, clientY) {
    const direct = this._shadow.elementFromPoint?.(clientX, clientY);
    const directEditable = this._closestEditable(direct);
    if (directEditable) return directEditable;
    const editables = [...this._liveEditor.querySelectorAll("[data-editable]")]
      .filter(el => Number.isFinite(Number(el.dataset.from)) && Number.isFinite(Number(el.dataset.to)));
    let best = null;
    let bestScore = Infinity;
    for (const el of editables) {
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) continue;
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const score = dy * 10000 + dx;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  _sourceOffsetForClientPoint(clientX, clientY) {
    const editable = this._liveEditableFromPoint(clientX, clientY);
    if (!editable) return null;
    const rect = editable.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return Number(editable.dataset.from);
    const x = clamp(clientX, rect.left + 1, rect.right - 1);
    const y = clamp(clientY, rect.top + 1, rect.bottom - 1);
    const fromPoint = this._sourceOffsetFromPoint(editable, x, y);
    if (fromPoint != null) return clamp(fromPoint, Number(editable.dataset.from), Number(editable.dataset.to));
    return this._nearestSourceOffsetInEditable(editable, x, y);
  }

  _nearestSourceOffsetInEditable(editable, clientX, clientY) {
    const from = Number(editable.dataset.from);
    const length = this._plainText(editable).length;
    if (!length) return from;
    let bestOffset = 0;
    let bestScore = Infinity;
    for (let offset = 0; offset <= length; offset += 1) {
      const pos = this._textPositionInElement(editable, offset);
      const rect = this._caretRectFromDomPosition(pos.node, pos.offset);
      if (!rect) continue;
      const rowDistance = Math.abs(((rect.top + rect.bottom) / 2) - clientY);
      const columnDistance = Math.abs(rect.left - clientX);
      const score = (rowDistance * 1000) + columnDistance;
      if (score < bestScore) { bestScore = score; bestOffset = offset; }
    }
    return from + bestOffset;
  }

  _onSelectionChanged() {
    if (this._ignoreSelectionChangeCount > 0) {
      this._ignoreSelectionChangeCount -= 1;
      this._emitSelectionChange();
      if (!this._isComposing) this._maybeUpdateCompletions();
      return;
    }
    this._structuredSelection = null;
    this._selection = this._getCurrentSelection();
    this._emitSelectionChange();
    if (!this._isComposing) this._maybeUpdateCompletions();
  }

  _isSourceActive() { return this._shadow.activeElement === this._sourceTextarea || this.mode === "source"; }
  _focusEditable(options) {
    if (this.mode === "source") { this._sourceTextarea?.focus(options); this._sourceTextarea?.setSelectionRange(this._selection.start, this._selection.end, this._selection.direction); return; }
    this._liveEditor?.focus(options); this._restoreLiveSelection(this._selection);
  }
  _getCurrentSelection() {
    if (this._isSourceActive() && this._sourceTextarea) return { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
    if (this._structuredSelection) return { ...this._structuredSelection };
    const live = this._getLiveSelection();
    return live || this._selection || { start: 0, end: 0, direction: "none" };
  }
  _getLiveSelection(preferredEditable = null) {
    const sel = this._shadow.getSelection?.() || globalThis.getSelection?.();
    if (!sel || sel.rangeCount === 0) return null;
    const anchorEditable = preferredEditable || this._closestEditable(sel.anchorNode?.nodeType === Node.ELEMENT_NODE ? sel.anchorNode : sel.anchorNode?.parentElement);
    const focusEditable = preferredEditable || this._closestEditable(sel.focusNode?.nodeType === Node.ELEMENT_NODE ? sel.focusNode : sel.focusNode?.parentElement);
    if (!anchorEditable || !focusEditable) return null;
    const start = this._sourceOffsetFromDom(anchorEditable, sel.anchorNode, sel.anchorOffset);
    const end = this._sourceOffsetFromDom(focusEditable, sel.focusNode, sel.focusOffset);
    if (start == null || end == null) return null;
    return { start: Math.min(start, end), end: Math.max(start, end), direction: start <= end ? "forward" : "backward" };
  }
  _sourceOffsetFromDom(editable, node, offset) {
    const from = Number(editable.dataset.from); if (!Number.isFinite(from)) return null;
    const range = document.createRange(); range.selectNodeContents(editable);
    try { range.setEnd(node, offset); } catch { return from; }
    const text = range.toString().replace(/\u00a0/g, " ").replace(/\n/g, "");
    return from + text.length;
  }
  _restoreLiveSelection(selection = this._selection) {
    if (!this._liveEditor || this.mode === "source") return;
    const startPos = this._domPositionFromSource(selection.start);
    const endPos = this._domPositionFromSource(selection.end);
    if (!startPos || !endPos) { this._liveEditor.focus(); return; }
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset); range.setEnd(endPos.node, endPos.offset);
    const sel = this._shadow.getSelection?.() || globalThis.getSelection?.();
    if (!sel) return;
    sel.removeAllRanges();
    try {
      if (selection.start !== selection.end && typeof sel.setBaseAndExtent === "function") {
        if (selection.direction === "backward") sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
        else sel.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
      } else {
        sel.addRange(range);
      }
    } catch {
      sel.removeAllRanges(); sel.addRange(range);
    }
    const focusEditable = selection.direction === "backward" ? startPos.editable : endPos.editable;
    (focusEditable || startPos.editable)?.focus?.();
  }
  _domPositionFromSource(offset) {
    const safe = clamp(offset, 0, this._value.length);
    const editables = [...this._liveEditor.querySelectorAll("[data-editable]")]
      .filter(el => Number.isFinite(Number(el.dataset.from)) && Number.isFinite(Number(el.dataset.to)))
      .sort((a, b) => Number(a.dataset.from) - Number(b.dataset.from));
    if (!editables.length) return null;
    let previous = null;
    for (const el of editables) {
      const from = Number(el.dataset.from);
      const to = Number(el.dataset.to);
      if (safe < from) {
        if (!previous) return this._textPositionInElement(el, 0);
        const prevTo = Number(previous.dataset.to);
        return (safe - prevTo <= from - safe)
          ? this._textPositionInElement(previous, this._plainText(previous).length)
          : this._textPositionInElement(el, 0);
      }
      if (safe >= from && safe <= to) return this._textPositionInElement(el, safe - from);
      previous = el;
    }
    return this._textPositionInElement(previous, this._plainText(previous).length);
  }
  _textPositionInElement(el, offset) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = clamp(offset, 0, this._plainText(el).length);
    let lastText = null;
    while (walker.nextNode()) {
      const node = walker.currentNode; const len = node.nodeValue.length; lastText = node;
      if (remaining <= len) return { node, offset: remaining, editable: el };
      remaining -= len;
    }
    if (lastText) return { node: lastText, offset: lastText.nodeValue.length, editable: el };
    const text = document.createTextNode(""); el.appendChild(text); return { node: text, offset: 0, editable: el };
  }

  _snapshot() { const sel = this._getCurrentSelection(); this._selection = sel; return makeSnapshot(this._value, sel.start, sel.end, sel.direction || "none"); }
  _recordUndo(before, after, group, { coalesce = false } = {}) {
    if (!before || !after) return; if (before.value === after.value && sameSelection(before.selection, after.selection)) return;
    const latest = this._undoStack[this._undoStack.length - 1]; const timestamp = now();
    if (coalesce && latest && latest.group === group && timestamp - latest.timestamp < 900) { latest.after = after; latest.timestamp = timestamp; return; }
    this._undoStack.push({ before, after, group, timestamp }); if (this._undoStack.length > this._maxUndo) this._undoStack.shift();
  }
  _undoGroupForInput(inputType) { if (inputType?.startsWith("insert")) return "typing"; if (inputType?.startsWith("delete")) return "delete"; return inputType || "input"; }
  _undo() { const entry = this._undoStack.pop(); if (!entry) return false; const current = this._snapshot(); this._redoStack.push({ before: entry.before, after: current, group: entry.group, timestamp: now() }); this._restoreSnapshot(entry.before, "undo"); this._dispatch("md-action", { actionId: "history.undo", source: "keyboard", before: current, after: this._snapshot() }); return true; }
  _redo() { const entry = this._redoStack.pop(); if (!entry) return false; const current = this._snapshot(); this._undoStack.push({ before: current, after: entry.after, group: entry.group, timestamp: now() }); this._restoreSnapshot(entry.after, "redo"); this._dispatch("md-action", { actionId: "history.redo", source: "keyboard", before: current, after: this._snapshot() }); return true; }
  _restoreSnapshot(snapshot, source) { this._value = snapshot.value; this._selection = { ...snapshot.selection }; this._redoStack = this._redoStack; this._afterValueChanged({ source, restoreSelection: true }); }

  _onKeyDown(event) {
    const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
    const mod = isMac ? event.metaKey : event.ctrlKey;
    const activeEditable = this._activeEditableFromEvent(event);
    const activeCell = activeEditable?.dataset.editable === "cell" ? activeEditable : null;

    if (mod && !event.altKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? this._redo() : this._undo();
      return;
    }

    if (mod && !event.altKey && event.key.toLowerCase() === "a" && !this._isSourceActive()) {
      event.preventDefault();
      this._expandSelection();
      return;
    }

    if (this._isComposing) return;

    if (this._completion.open) {
      const map = { ArrowDown: "completion.next", ArrowUp: "completion.previous", Home: "completion.first", End: "completion.last", Escape: "completion.close" };
      if (map[event.key]) { event.preventDefault(); this._runAction(map[event.key], undefined, { source: "keyboard", apply: true }); return; }
      if (event.key === "PageDown") { event.preventDefault(); this._moveCompletion(5); return; }
      if (event.key === "PageUp") { event.preventDefault(); this._moveCompletion(-5); return; }
      if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) { event.preventDefault(); this._runAction("completion.accept", undefined, { source: "keyboard", apply: true }); return; }
    }

    if (this._maybeHandleLiveArrowKey(event, activeEditable)) return;

    if ((event.key === "Backspace" || event.key === "Delete") && !this._isSourceActive()) {
      if (this.readonly || this.disabled) return;
      const selection = this._getCurrentSelection();
      if (selection.start !== selection.end) {
        event.preventDefault();
        const result = this._deleteSelectionResult(this._getContext(), event.key === "Delete" ? "editor.smartDelete" : "editor.smartBackspace");
        this._applyActionResult(event.key === "Delete" ? "editor.smartDelete" : "editor.smartBackspace", result, { source: "keyboard" });
        return;
      }
    }

    if (activeCell && (event.key === "Backspace" || event.key === "Delete")) {
      if (this.readonly || this.disabled) return;
      const result = this._deleteEmptyTableRowFromCellResult(activeCell);
      if (result?.ok && result.transaction) {
        event.preventDefault();
        this._applyActionResult("table.deleteRow", result, { source: "keyboard" });
        return;
      }
    }

    if (event.key === "Escape") {
      if (activeCell && !this._completion.open) {
        event.preventDefault();
        this._exitTable(activeCell, "after");
        return;
      }
      this._closeCompletion();
      return;
    }

    if (activeCell && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (this._maybeExitTableWithArrow(activeCell, direction)) {
        event.preventDefault();
        return;
      }
    }

    if (mod && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      const map = { b: "inline.bold", i: "inline.italic", k: "inline.link", e: "inline.code" };
      if (map[key]) { event.preventDefault(); this._runAction(map[key], undefined, { source: "keyboard", apply: true }); return; }
    }
    if (mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === "x") { event.preventDefault(); this._runAction("inline.strikethrough", undefined, { source: "keyboard", apply: true }); return; }
    if (mod && event.altKey && /^[1-6]$/.test(event.key)) { event.preventDefault(); this._runAction(`block.heading.${event.key}`, undefined, { source: "keyboard", apply: true }); return; }

    if (event.key === " " && !event.shiftKey && !event.altKey && !mod) {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.markdownShortcut", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.markdownShortcut", result, { source: "keyboard" }); return; }
    }

    if (event.key === "Delete") {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.smartDelete", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.smartDelete", result, { source: "keyboard" }); return; }
    }

    if (event.key === "Enter") {
      if (this.readonly || this.disabled) return;
      event.preventDefault();
      if (activeCell) {
        if (event.shiftKey || mod || event.altKey) this._exitTable(activeCell, "after");
        else this._insertTableRowAfterCell(activeCell);
        return;
      }
      this._runAction(event.shiftKey ? "editor.insertSoftBreak" : "editor.smartEnter", undefined, { source: "keyboard", apply: true });
      return;
    }

    if (event.key === "Tab") {
      if (this.readonly || this.disabled) return;
      if (activeCell) { event.preventDefault(); this._handleTableTab(activeCell, event.shiftKey ? -1 : 1); return; }
      const id = event.shiftKey ? "editor.smartOutdent" : "editor.smartTab";
      const result = this._runAction(id, undefined, { source: "keyboard", apply: false });
      if (result?.ok && (result.transaction || result.preventDefault)) { event.preventDefault(); this._applyActionResult(id, result, { source: "keyboard" }); }
      return;
    }

    if (event.key === "Backspace") {
      if (this.readonly || this.disabled) return;
      const result = this._runAction("editor.smartBackspace", undefined, { source: "keyboard", apply: false });
      if (result?.ok && result.transaction) { event.preventDefault(); this._applyActionResult("editor.smartBackspace", result, { source: "keyboard" }); }
    }
  }

  _activeEditableFromEvent(event) {
    return this._closestEditable(event?.target) || this._activeEditableFromSelection();
  }

  _activeEditableFromSelection() {
    const sel = this._shadow.getSelection?.() || globalThis.getSelection?.();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.focusNode || sel.anchorNode;
    return this._closestEditable(node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement);
  }

  _findBlockAtOffset(offset, type = null) {
    const safe = clamp(Number(offset) || 0, 0, this._value.length);
    return parseBlocks(this._value).find(block => (!type || block.type === type) && safe >= block.from && safe <= Math.max(block.to, block.from)) || null;
  }

  _findTableBlockForCell(cell) {
    const tableEl = cell?.closest?.(".md-table-block");
    if (!tableEl) return null;
    const from = Number(tableEl.dataset.from);
    const to = Number(tableEl.dataset.to);
    return parseBlocks(this._value).find(block => block.type === "table" && block.from === from && block.to === to) || null;
  }

  _tableInfoForCell(cell) {
    const block = this._findTableBlockForCell(cell);
    if (!block) return null;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const line = row < 0 ? block.header : block.rows[row];
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    return { block, row, col, line, cols };
  }

  _moveTableCell(cell, delta) {
    const cells = [...cell.closest(".md-table-block")?.querySelectorAll('[data-editable="cell"]') || []];
    const i = cells.indexOf(cell);
    if (i === -1) return false;
    const next = cells[i + delta];
    if (!next) return false;
    const from = Number(next.dataset.from);
    const text = this._plainText(next);
    this._selection = { start: from, end: from + text.length, direction: "none" };
    this._restoreLiveSelection(this._selection);
    this._announce("Table cell.");
    return true;
  }

  _handleTableTab(cell, delta) {
    if (this._moveTableCell(cell, delta)) return;
    if (delta < 0) {
      this._exitTable(cell, "before");
      return;
    }
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    if (info.row >= 0 && this._isTableRowEmpty(info.line)) this._exitTable(cell, "after");
    else this._insertTableRowAfterCell(cell);
  }

  _maybeExitTableWithArrow(cell, direction) {
    const info = this._tableInfoForCell(cell);
    if (!info) return false;
    const atStart = this._isCellSelectionAtBoundary(cell, "start");
    const atEnd = this._isCellSelectionAtBoundary(cell, "end");
    if (direction < 0 && info.row < 0 && atStart) { this._exitTable(cell, "before"); return true; }
    if (direction > 0 && info.row === info.block.rows.length - 1 && atEnd) { this._exitTable(cell, "after"); return true; }
    return false;
  }

  _isCellSelectionAtBoundary(cell, boundary) {
    const sel = this._getLiveSelection(cell);
    if (!sel || sel.start !== sel.end) return false;
    const from = Number(cell.dataset.from);
    const to = Number(cell.dataset.to);
    return boundary === "start" ? sel.start <= from : sel.start >= to;
  }

  _isTableRowEmpty(line) {
    if (!line) return true;
    return splitTableRow(line.text).every(cell => cell.trim() === "");
  }

  _escapeTableCellText(cell) {
    return String(cell ?? "").replace(/\|/g, "\\|");
  }

  _tableRowSourceParts(cells) {
    const escaped = cells.map(cell => this._escapeTableCellText(cell));
    const offsets = [];
    let text = "| ";
    escaped.forEach((cell, index) => {
      offsets[index] = { from: text.length, to: text.length + cell.length };
      text += cell;
      text += index === escaped.length - 1 ? " |" : " | ";
    });
    return { text, offsets };
  }

  _tableBlockSourceWithOffsets(headerCells, delimiterCells, rows) {
    const parts = [
      this._tableRowSourceParts(headerCells),
      this._tableRowSourceParts(delimiterCells),
      ...rows.map(row => this._tableRowSourceParts(row)),
    ];
    const lines = [];
    const lineStarts = [];
    let cursor = 0;
    for (const part of parts) {
      lineStarts.push(cursor);
      lines.push(part.text);
      cursor += part.text.length + 1;
    }
    return { source: lines.join("\n"), parts, lineStarts };
  }

  _tableCellInputEdit(cell, raw) {
    const info = this._tableInfoForCell(cell);
    if (!info) return null;
    const existingCell = info.line?.cells?.[info.col];
    if (existingCell && Number.isFinite(existingCell.from) && Number.isFinite(existingCell.to)) return null;
    const cols = info.cols;
    const header = this._tableCellTexts(info.block.header, cols);
    const delimiter = this._tableCellTexts(info.block.delimiter, cols);
    const rows = info.block.rows.map(row => this._tableCellTexts(row, cols));
    if (info.row < 0) {
      header[info.col] = raw;
    } else {
      while (rows.length <= info.row) rows.push(Array.from({ length: cols }, () => ""));
      rows[info.row][info.col] = raw;
    }
    const serialized = this._tableBlockSourceWithOffsets(header, delimiter, rows);
    const lineIndex = info.row < 0 ? 0 : info.row + 2;
    const cellOffsets = serialized.parts[lineIndex]?.offsets?.[info.col];
    const cursor = info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.to ?? 0);
    return {
      nextValue: this._value.slice(0, info.block.from) + serialized.source + this._value.slice(info.block.to),
      cursor,
    };
  }

  _deleteEmptyTableRowFromCellResult(cell) {
    const info = this._tableInfoForCell(cell);
    if (!info || info.row < 0 || !info.line) return fail("not-applicable");
    const selection = this._getLiveSelection(cell);
    if (!selection || selection.start !== selection.end) return fail("not-applicable");
    if (this._plainText(cell).trim() || !this._isTableRowEmpty(info.line)) return fail("not-applicable");
    return this._tableDeleteRowResult(this._getContext(), info.block, info.row);
  }

  _insertTableRowAfterCell(cell) {
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    const ctx = this._getContext();
    const result = this._tableRowInsertionResult(ctx, info.block, info.line, info.row < 0 ? "after-delimiter" : "after-row");
    this._applyActionResult("table.insertRowAfter", result, { source: "keyboard" });
  }

  _tableRowInsertionResult(ctx, block, line, placement = "after-row") {
    if (!block) return fail("not-applicable");
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const insert = `\n| ${Array.from({ length: cols }, () => "").join(" | ")} |`;
    const insertionLine = placement === "after-delimiter" ? block.delimiter : (line || block.rows.at(-1) || block.delimiter);
    const from = insertionLine.end;
    const cursor = from + 3;
    return ok(tx(ctx, "table.insertRowAfter", [{ from, to: from, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), "Table row inserted.");
  }

  _exitTable(cell, direction = "after") {
    const info = this._tableInfoForCell(cell);
    if (!info) return;
    const before = this._snapshot();
    const block = info.block;
    let changes = [];
    let cursor;
    if (direction === "before") {
      if (block.from === 0 || this._value[block.from - 1] !== "\n") {
        changes = [{ from: block.from, to: block.from, insert: "\n" }];
        cursor = block.from;
      } else {
        cursor = block.from;
      }
    } else {
      if (this._value.slice(block.to, block.to + 2) === "\n\n") {
        cursor = block.to + 1;
      } else {
        changes = [{ from: block.to, to: block.to, insert: "\n" }];
        cursor = block.to + 1;
      }
    }
    if (changes.length) {
      this._applyTransaction({ changes, selectionAfter: { start: cursor, end: cursor, direction: "none" }, actionId: "table.exit", undoGroup: "table", source: "keyboard" }, { source: "keyboard" });
    } else {
      this._selection = { start: cursor, end: cursor, direction: "none" };
      this._restoreLiveSelection(this._selection);
      this._emitSelectionChange();
    }
    const after = this._snapshot();
    this._dispatch("md-action", { actionId: "table.exit", source: "keyboard", before, after });
    this._announce(direction === "before" ? "Before table." : "After table.");
  }

  _expandSelection() {
    const current = this._getCurrentSelection();
    const candidates = this._selectionExpansionCandidates(current);
    const normalized = { start: Math.min(current.start, current.end), end: Math.max(current.start, current.end) };
    let next = candidates.find(range => (range.end > range.start || this._value.length === 0) && range.start <= normalized.start && range.end >= normalized.end && !this._sameRange(range, normalized));
    if (!next) next = { start: 0, end: this._value.length, label: "document" };
    this.setSelectionRange(next.start, next.end, "forward");
    this._announce(`Selected ${next.label || "content"}.`);
  }

  _selectionExpansionCandidates(selection) {
    const point = clamp(selection.start, 0, this._value.length);
    const out = [];
    const push = (start, end, label) => {
      const range = { start: clamp(start, 0, this._value.length), end: clamp(end, 0, this._value.length), label };
      if (range.end < range.start) [range.start, range.end] = [range.end, range.start];
      if (!out.some(existing => this._sameRange(existing, range))) out.push(range);
    };
    const active = this._activeEditableFromSelection();
    if (active?.dataset.editable === "cell") {
      const info = this._tableInfoForCell(active);
      const cellFrom = Number(active.dataset.from);
      const cellTo = Number(active.dataset.to);
      push(cellFrom, cellTo, "cell");
      if (info?.line) push(info.line.start, info.line.end, "row");
      if (info?.block) push(info.block.from, info.block.to, "table");
    }
    const block = this._findBlockAtOffset(point) || parseBlocks(this._value)[0];
    if (block) push(block.from, block.to, block.type === "table" ? "table" : "block");
    const section = this._sectionRangeForOffset(point);
    if (section) push(section.start, section.end, "section");
    push(0, this._value.length, "document");
    return out.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  }

  _sectionRangeForOffset(offset) {
    const blocks = parseBlocks(this._value);
    let headingIndex = -1;
    let headingLevel = Infinity;
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.type === "heading" && block.from <= offset) {
        headingIndex = i;
        headingLevel = block.heading.level;
      }
      if (block.from > offset) break;
    }
    if (headingIndex === -1) return null;
    let end = this._value.length;
    for (let i = headingIndex + 1; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.type === "heading" && block.heading.level <= headingLevel) { end = block.from; break; }
    }
    return { start: blocks[headingIndex].from, end, label: "section" };
  }

  _sameRange(a, b) {
    return a && b && a.start === b.start && a.end === b.end;
  }

  _clipboardRangeFromSelection(selection = this._getCurrentSelection()) {
    if (!selection || selection.start === selection.end) return null;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    return expandMarkdownFormattingRange(this._value, start, end);
  }
  _writeMarkdownClipboard(event, markdown) {
    event.clipboardData?.setData("text/plain", markdown);
    event.clipboardData?.setData("text/markdown", markdown);
    event.clipboardData?.setData("text/x-markdown", markdown);
    event.clipboardData?.setData("text/html", renderMarkdown(markdown, this._rendererOptions()));
  }
  _onLiveCopy(event) {
    if (this._isSourceActive()) return;
    const range = this._clipboardRangeFromSelection();
    if (!range) return;
    const markdown = this._value.slice(range.start, range.end);
    event.preventDefault();
    this._writeMarkdownClipboard(event, markdown);
    this._dispatch("md-copy", { markdown, start: range.start, end: range.end });
  }
  _onLiveCut(event) {
    if (this._isSourceActive() || this.disabled || this.readonly) return;
    const range = this._clipboardRangeFromSelection();
    if (!range) return;
    const markdown = this._value.slice(range.start, range.end);
    event.preventDefault();
    this._writeMarkdownClipboard(event, markdown);
    const ctx = this._getContext();
    const result = ok(tx(ctx, "editor.deleteSelection", [{ from: range.start, to: range.end, insert: "" }], { start: range.start, end: range.start, direction: "none" }, "cut"), "Cut.");
    this._applyActionResult("editor.deleteSelection", result, { source: "keyboard" });
    this._dispatch("md-cut", { markdown, start: range.start, end: range.end });
  }

  _serializeTableBlock(headerCells, delimiterCells, rows) {
    const serialize = cells => this._tableRowSourceParts(cells).text;
    return [serialize(headerCells), serialize(delimiterCells), ...rows.map(serialize)].join("\n");
  }
  _tableCellTexts(line, cols) {
    const cells = splitTableRow(line?.text ?? "");
    return Array.from({ length: cols }, (_, i) => cells[i] ?? "");
  }
  _tableColumnResult(ctx, block, col, mode) {
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const target = clamp(Number(col) || 0, 0, cols - 1);
    const header = this._tableCellTexts(block.header, cols);
    const delimiter = this._tableCellTexts(block.delimiter, cols);
    const rows = block.rows.map(row => this._tableCellTexts(row, cols));
    if (mode === "delete") {
      if (cols <= 1) return fail("not-applicable", "Cannot delete the only column.");
      for (const list of [header, delimiter, ...rows]) list.splice(target, 1);
    } else {
      const at = target + 1;
      header.splice(at, 0, `Column ${cols + 1}`);
      delimiter.splice(at, 0, "---");
      for (const row of rows) row.splice(at, 0, "");
    }
    const insert = this._serializeTableBlock(header, delimiter, rows.length ? rows : [Array.from({ length: header.length }, () => "")]);
    const cursor = block.from + insert.split("\n")[0].length;
    return ok(tx(ctx, mode === "delete" ? "table.deleteColumn" : "table.insertColumnAfter", [{ from: block.from, to: block.to, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), mode === "delete" ? "Column deleted." : "Column inserted.");
  }
  _tableDeleteRowResult(ctx, block, row) {
    if (!block.rows.length) return fail("not-applicable");
    const index = clamp(Number(row) || 0, 0, block.rows.length - 1);
    const line = block.rows[index];
    let from = line.start; let to = line.newlineEnd;
    if (to <= line.end && line.start > block.delimiter.end && ctx.value[line.start - 1] === "\n") {
      from = line.start - 1;
      to = line.end;
    } else if (to <= from) {
      to = line.end;
    }
    const cursor = from;
    return ok(tx(ctx, "table.deleteRow", [{ from, to, insert: "" }], { start: cursor, end: cursor, direction: "none" }, "table"), "Row deleted.");
  }

  _preparePastedMarkdown(markdown, kind = "text") {
    let insert = normalizeLineEndings(markdown ?? "");
    if (!insert) return insert;
    const sel = this._getCurrentSelection();
    if (sel.start !== sel.end) return insert;
    const shouldSeparate = kind === "markdown" || kind === "html" || kind === "table" || insert.includes("\n") || looksLikeBlockMarkdown(insert);
    if (!shouldSeparate) return insert;
    const line = getLineRange(this._value, sel.start);
    const beforeLine = this._value.slice(line.start, sel.start);
    const afterLine = this._value.slice(sel.start, line.end);
    if (beforeLine.trim() && !insert.startsWith("\n")) insert = "\n" + insert;
    if (afterLine.trim() && !insert.endsWith("\n")) insert = insert + "\n";
    return insert;
  }
  _insertPastedMarkdown(markdown, kind = "text") {
    const prepared = this._preparePastedMarkdown(markdown, kind);
    if (!prepared) return false;
    this._runAction("editor.insertText", { text: prepared }, { source: "paste", apply: true });
    this._dispatch("md-paste", { markdown: prepared, kind });
    return true;
  }
  _onPaste(event) {
    if (this.disabled || this.readonly) return;
    const clipboard = event.clipboardData || event.dataTransfer; if (!clipboard) return;
    const files = Array.from(clipboard.files || []);
    if (files.length > 0) { event.preventDefault(); const insertionPoint = this.selectionStart; this._dispatch("md-file-paste", { files, insertionPoint, insertMarkdown: markdown => this._insertPastedMarkdown(markdown, "file") }); return; }
    const text = safeClipboardGet(clipboard, "text/plain");
    if (text && this.selectionStart !== this.selectionEnd && isProbablyUrl(text) && !safeClipboardGet(clipboard, "text/markdown") && !safeClipboardGet(clipboard, "text/html")) { event.preventDefault(); this._runAction("inline.link", { url: text.trim() }, { source: "paste", apply: true }); return; }
    const { markdown, kind } = markdownFromClipboardData(clipboard);
    if (!markdown) return;
    event.preventDefault();
    this._insertPastedMarkdown(markdown, kind);
  }
  _onDrop(event) { if (this.disabled || this.readonly) return; const files = Array.from(event.dataTransfer?.files || []); if (!files.length) return; event.preventDefault(); const insertionPoint = this.selectionStart; this._dispatch("md-file-drop", { files, insertionPoint, insertMarkdown: markdown => this._insertPastedMarkdown(markdown, "file") }); }

  _getContext() {
    const sel = this._getCurrentSelection(); this._selection = sel;
    const value = this._value; const line = getLineRange(value, sel.start); const currentLine = makeLineInfo(line.start, line.end, line.text); const selectedLines = getSelectedLineRanges(value, sel.start, sel.end); const block = classifyLine(value, sel.start, currentLine); const lineBeforeCursor = currentLine.text.slice(0, sel.start - currentLine.start);
    return { value, selectionStart: sel.start, selectionEnd: sel.end, selectionDirection: sel.direction || "none", mode: this.disabled ? "disabled" : this.readonly ? "readonly" : this._isComposing ? "composing-ime" : this._completion.open ? (this._completion.providerId === "slash" ? "slash-open" : "completion-open") : "idle", currentLine, selectedLines, block, inline: { insideInlineCode: isInsideInlineCode(lineBeforeCursor) }, completion: { ...this._completion }, config: { mode: this.mode, preview: this.preview, markdownFlavor: this.markdownFlavor, tabBehavior: this.tabBehavior, indentString: this.indentString, disabled: this.disabled, readonly: this.readonly }, host: this };
  }
  _runAction(actionId, args, options = {}) {
    const action = this._actions.get(actionId); if (!action) return fail("not-applicable", `Unknown action: ${actionId}`);
    const ctx = this._getContext(); if (ctx.mode === "disabled" && !action.viewSafe) return fail("disabled"); if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return fail("readonly"); if (ctx.mode === "composing-ime" && action.structural !== false) return fail("composition-active"); if (action.when && !action.when(ctx, args)) return fail("not-applicable");
    try { const result = action.run(ctx, args); if (options.apply === false) return result; return this._applyActionResult(actionId, result, options); } catch (error) { this._emitError("action", error, true, { actionId }); return fail("provider-error", String(error?.message || error)); }
  }
  _applyActionResult(actionId, result, options = {}) {
    if (!result?.ok) return result; const before = this._snapshot();
    if (result.transaction) { const t = { ...result.transaction, source: options.source || result.transaction.source || "api", actionId, timestamp: now() }; this._applyTransaction(t, { source: t.source }); const after = this._snapshot(); this._dispatch("md-action", { actionId, args: t.args, source: t.source, before, after }); }
    else this._dispatch("md-action", { actionId, source: options.source || "api", before, after: this._snapshot() });
    if (result.announcement) this._announce(result.announcement); return result;
  }
  _applyTransaction(transaction, options = {}) {
    const before = this._snapshot();
    const nextValue = applyTextChanges(this._value, transaction.changes);
    const proposedSelection = transaction.selectionAfter || { start: nextValue.length, end: nextValue.length, direction: "none" };
    const beforeEvent = this._dispatch("md-before-change", { transaction, before, nextValue, selectionAfter: proposedSelection, source: options.source || transaction.source || "api" }, { cancelable: true });
    if (beforeEvent.defaultPrevented) { this._announce("Change blocked."); return false; }
    this._value = nextValue;
    const sel = proposedSelection;
    this._selection = { start: clamp(sel.start, 0, nextValue.length), end: clamp(sel.end, 0, nextValue.length), direction: sel.direction || "none" }; this._structuredSelection = null;
    const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction); this._recordUndo(before, after, transaction.undoGroup || transaction.actionId, { coalesce: false }); this._redoStack.length = 0; this._afterValueChanged({ source: options.source || transaction.source || "api", restoreSelection: true }); this._maybeUpdateCompletions();
    return true;
  }

  _installBuiltInActions() {
    const r = a => this.registerAction(a);
    r({ id: "editor.insertText", label: "Insert text", group: "Editor", structural: false, run: (ctx, args = {}) => insertionTransaction(ctx, "editor.insertText", normalizeLineEndings(args.text ?? ""), normalizeLineEndings(args.text ?? "").length, "insertText") });
    r({ id: "editor.replaceSelection", label: "Replace selection", group: "Editor", structural: false, run: (ctx, args = {}) => insertionTransaction(ctx, "editor.replaceSelection", normalizeLineEndings(args.text ?? ""), normalizeLineEndings(args.text ?? "").length, "replaceSelection") });
    r({ id: "editor.insertParagraph", label: "Insert paragraph", group: "Editor", defaultShortcut: "Enter", run: ctx => insertionTransaction(ctx, "editor.insertParagraph", "\n", 1, "insertParagraph") });
    r({ id: "editor.insertSoftBreak", label: "Insert soft break", group: "Editor", defaultShortcut: "Shift+Enter", run: ctx => insertionTransaction(ctx, "editor.insertSoftBreak", "  \n", 3, "insertSoftBreak") });
    r({ id: "editor.smartEnter", label: "Smart enter", group: "Editor", defaultShortcut: "Enter", run: ctx => this._smartEnter(ctx) });
    r({ id: "editor.smartTab", label: "Indent", group: "Editor", defaultShortcut: "Tab", run: ctx => this._smartTab(ctx) });
    r({ id: "editor.smartOutdent", label: "Outdent", group: "Editor", defaultShortcut: "Shift+Tab", run: ctx => this._smartOutdent(ctx) });
    r({ id: "editor.smartBackspace", label: "Smart backspace", group: "Editor", defaultShortcut: "Backspace", run: ctx => this._smartBackspace(ctx) });
    r({ id: "editor.smartDelete", label: "Smart delete", group: "Editor", defaultShortcut: "Delete", run: ctx => this._smartDelete(ctx) });
    r({ id: "editor.markdownShortcut", label: "Markdown shortcut", group: "Editor", defaultShortcut: "Space", run: ctx => this._markdownShortcut(ctx) });
    r({ id: "editor.deleteSelection", label: "Delete selection", group: "Editor", run: ctx => this._deleteSelectionResult(ctx, "editor.deleteSelection") });
    r({ id: "editor.selectAllExpand", label: "Expand selection", group: "Editor", defaultShortcut: "Mod+A", viewSafe: true, readonlySafe: true, run: () => { this._expandSelection(); return okNoop("Selection expanded."); } });
    r({ id: "history.undo", label: "Undo", group: "History", defaultShortcut: "Mod+Z", run: () => this._undo() ? okNoop("Undo.") : fail("not-applicable") });
    r({ id: "history.redo", label: "Redo", group: "History", defaultShortcut: "Mod+Shift+Z", run: () => this._redo() ? okNoop("Redo.") : fail("not-applicable") });
    r({ id: "block.paragraph", label: "Paragraph", description: "Convert current block to paragraph", group: "Blocks", aliases: ["p", "text", "clear"], visibleInSlash: true, run: ctx => this._toggleParagraph(ctx) });
    for (let level = 1; level <= 6; level += 1) r({ id: `block.heading.${level}`, label: `Heading ${level}`, description: `Convert to heading level ${level}`, group: "Blocks", aliases: [`h${level}`, `heading${level}`], keywords: ["title", "section"], defaultShortcut: level <= 3 ? `Mod+Alt+${level}` : undefined, visibleInSlash: true, run: ctx => this._toggleHeading(ctx, level) });
    r({ id: "block.bulletList", label: "Bullet list", description: "Create an unordered list", group: "Blocks", aliases: ["bullet", "ul", "list"], visibleInSlash: true, run: ctx => this._toggleList(ctx, "bullet") });
    r({ id: "block.orderedList", label: "Numbered list", description: "Create an ordered list", group: "Blocks", aliases: ["number", "numbered", "ol"], visibleInSlash: true, run: ctx => this._toggleList(ctx, "ordered") });
    r({ id: "block.taskList", label: "Task list", description: "Create a task list", group: "Blocks", aliases: ["todo", "task", "checkbox"], visibleInSlash: true, run: ctx => this._toggleList(ctx, "task") });
    r({ id: "block.taskDone", label: "Toggle task done", description: "Toggle task checkbox state", group: "Blocks", aliases: ["done", "check"], visibleInSlash: true, run: ctx => this._toggleTaskDone(ctx) });
    r({ id: "block.blockquote", label: "Blockquote", description: "Create a blockquote", group: "Blocks", aliases: ["quote", "blockquote"], visibleInSlash: true, run: ctx => this._toggleBlockquote(ctx) });
    r({ id: "block.codeFence", label: "Code block", description: "Create a fenced code block", group: "Insert", aliases: ["code", "pre", "fence"], visibleInSlash: true, run: (ctx, args) => this._toggleCodeFence(ctx, args) });
    r({ id: "block.horizontalRule", label: "Horizontal rule", description: "Insert horizontal rule", group: "Insert", aliases: ["hr", "divider", "rule"], visibleInSlash: true, run: ctx => this._insertHorizontalRule(ctx) });
    r({ id: "block.table", label: "Table", description: "Insert a markdown table", group: "Insert", aliases: ["table", "grid"], visibleInSlash: true, run: (ctx, args = {}) => this._insertTable(ctx, args) });
    r({ id: "table.insertRowAfter", label: "Insert table row", group: "Table", run: ctx => { const block = this._findBlockAtOffset(ctx.selectionStart, "table"); return block ? this._tableRowInsertionResult(ctx, block, ctx.currentLine, "after-row") : fail("not-applicable"); } });
    r({ id: "table.insertColumnAfter", label: "Insert table column", group: "Table", run: ctx => { const block = this._findBlockAtOffset(ctx.selectionStart, "table"); return block ? this._tableColumnResult(ctx, block, 0, "insert-after") : fail("not-applicable"); } });
    r({ id: "table.deleteRow", label: "Delete table row", group: "Table", run: ctx => { const block = this._findBlockAtOffset(ctx.selectionStart, "table"); return block ? this._tableDeleteRowResult(ctx, block, 0) : fail("not-applicable"); } });
    r({ id: "table.deleteColumn", label: "Delete table column", group: "Table", run: ctx => { const block = this._findBlockAtOffset(ctx.selectionStart, "table"); return block ? this._tableColumnResult(ctx, block, 0, "delete") : fail("not-applicable"); } });
    r({ id: "code.setLanguage", label: "Set code language", group: "Code", run: (ctx, args = {}) => { const block = this._findBlockAtOffset(ctx.selectionStart, "code-fence"); return block ? this._setCodeLanguageResult(ctx, block, String(args.language ?? "")) : fail("not-applicable"); } });
    r({ id: "inline.bold", label: "Bold", description: "Strong emphasis", group: "Inline", aliases: ["bold", "strong"], defaultShortcut: "Mod+B", visibleInSlash: true, run: ctx => this._wrapInline(ctx, "**", "**", "Bold") });
    r({ id: "inline.italic", label: "Italic", description: "Emphasis", group: "Inline", aliases: ["italic", "em"], defaultShortcut: "Mod+I", visibleInSlash: true, run: ctx => this._wrapInline(ctx, "*", "*", "Italic") });
    r({ id: "inline.code", label: "Inline code", description: "Inline code span", group: "Inline", aliases: ["inline-code", "codespan"], defaultShortcut: "Mod+E", visibleInSlash: true, run: ctx => this._wrapInline(ctx, "`", "`", "Inline code") });
    r({ id: "inline.strikethrough", label: "Strikethrough", description: "Strikethrough text", group: "Inline", aliases: ["strike", "s"], defaultShortcut: "Mod+Shift+X", visibleInSlash: true, run: ctx => this._wrapInline(ctx, "~~", "~~", "Strikethrough") });
    r({ id: "inline.link", label: "Link", description: "Insert or wrap a link", group: "Inline", aliases: ["link", "url"], defaultShortcut: "Mod+K", visibleInSlash: true, run: (ctx, args = {}) => this._insertLink(ctx, args) });
    r({ id: "inline.image", label: "Image", description: "Insert an image", group: "Inline", aliases: ["image", "img", "picture"], visibleInSlash: true, run: (ctx, args = {}) => this._insertImage(ctx, args) });
    r({ id: "view.live", label: "Live mode", group: "View", viewSafe: true, readonlySafe: true, run: () => { this.mode = "live"; return okNoop("Live mode."); } });
    r({ id: "view.source", label: "Source mode", group: "View", viewSafe: true, readonlySafe: true, run: () => { this.mode = "source"; return okNoop("Source mode."); } });
    r({ id: "completion.close", label: "Close completion", group: "Completion", viewSafe: true, run: () => { this._closeCompletion(); return okNoop("Completion closed."); } });
    r({ id: "completion.next", label: "Next completion", group: "Completion", viewSafe: true, run: () => { this._moveCompletion(1); return okNoop(); } });
    r({ id: "completion.previous", label: "Previous completion", group: "Completion", viewSafe: true, run: () => { this._moveCompletion(-1); return okNoop(); } });
    r({ id: "completion.first", label: "First completion", group: "Completion", viewSafe: true, run: () => { this._setCompletionIndex(0); return okNoop(); } });
    r({ id: "completion.last", label: "Last completion", group: "Completion", viewSafe: true, run: () => { this._setCompletionIndex(this._completion.items.length - 1); return okNoop(); } });
    r({ id: "completion.accept", label: "Accept completion", group: "Completion", viewSafe: true, run: () => this._acceptCompletion("action") });
  }

  _installBuiltInProviders() {
    this.registerCompletionProvider({ id: "slash", priority: 100, triggers: ["/"], match: ctx => this._matchSlash(ctx), getItems: match => this._getSlashItems(match), apply: (item, match, ctx) => this._applySlashItem(item, match, ctx) });
    this.registerCompletionProvider({ id: "code-language", priority: 60, triggers: ["```"], match: ctx => this._matchCodeLanguage(ctx), getItems: match => this._getLanguageItems(match), apply: (item, match, ctx) => { const insert = `\`\`\`${item.label}`; const cursor = match.from + insert.length; return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert }], { start: cursor, end: cursor, direction: "none" }, "completion"), `Language ${item.label}.`); } });
  }
  _getLanguageItems(match) {
    const q = match.query.toLowerCase(); const alias = ALIASES.get(q);
    return LANGUAGES.map(lang => ({ lang, score: !q ? 0 : lang === q || lang === alias ? -100 : lang.startsWith(q) ? -50 : lang.includes(q) ? -10 : 0 })).filter(x => !q || x.score < 0).sort((a, b) => a.score - b.score || a.lang.localeCompare(b.lang)).slice(0, 16).map(x => ({ id: x.lang, label: x.lang, detail: "code language", kind: "code-language" }));
  }

  _smartEnter(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    const currentTextBeforeCursor = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
    if (isFenceOpenerLine(ctx.currentLine.text) && currentTextBeforeCursor.trim().startsWith("```") && !isInsideFence(ctx.value, ctx.selectionStart) && !hasClosingFenceAfter(ctx.value, ctx.currentLine.end)) {
      return insertionTransaction(ctx, "editor.smartEnter", "\n\n```", 1, "smartEnter");
    }
    if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    const list = ctx.block.list;
    if (list) {
      if (list.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", list.contentStart, "Exited list.");
      if (list.kind === "task-list-item") { const insert = `\n${list.indent}${list.marker} [ ] `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
      if (list.kind === "ordered-list-item") { const next = Number.isFinite(list.number) ? list.number + 1 : 1; const insert = `\n${list.indent}${next}${list.delimiter || "."} `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
      const insert = `\n${list.indent}${list.marker} `; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter");
    }
    const quote = ctx.block.blockquote;
    if (quote) { if (quote.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", quote.contentStart, "Exited blockquote."); const insert = `\n${quote.markerText}`; return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter"); }
    if (ctx.block.kind === "heading") return insertionTransaction(ctx, "editor.smartEnter", "\n\n", 2, "smartEnter");
    if (ctx.block.kind === "table") {
      const table = this._findBlockAtOffset(ctx.selectionStart, "table");
      if (table) {
        const placement = ctx.currentLine.start === table.header.start ? "after-delimiter" : "after-row";
        return this._tableRowInsertionResult(ctx, table, ctx.currentLine, placement);
      }
    }
    return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
  }
  _smartTab(ctx) {
    if (ctx.completion?.open) return this._acceptCompletion("tab");
    const anyList = ctx.selectedLines.some(line => parseListItem(line.text)); if (anyList) return this._indentLines(ctx, ctx.config.indentString);
    if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
    if (ctx.config.tabBehavior === "editor-first") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
    return fail("not-applicable", "Tab should move focus in accessibility-first mode.");
  }
  _smartOutdent(ctx) { const any = ctx.selectedLines.some(line => this._lineOutdentAmount(line.text) > 0); if (any) return this._outdentLines(ctx); return fail("not-applicable"); }
  _deleteSelectionResult(ctx, actionId = "editor.deleteSelection") {
    const start = Math.min(ctx.selectionStart, ctx.selectionEnd);
    const end = Math.max(ctx.selectionStart, ctx.selectionEnd);
    if (start === end) return fail("not-applicable");
    return ok(tx(ctx, actionId, [{ from: start, to: end, insert: "" }], { start, end: start, direction: "none" }, "delete"), "Deleted selection.");
  }
  _markdownShortcut(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd || ctx.inline.insideInlineCode || ctx.block.kind === "fenced-code") return fail("not-applicable");
    const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
    const after = ctx.currentLine.text.slice(ctx.selectionStart - ctx.currentLine.start);
    if (after.trim()) return fail("not-applicable");
    const task = /^(\s*)(\[\]|\[ \]|\[x\]|\[X\])$/.exec(before);
    if (task) {
      const checked = /x/i.test(task[2]) ? "x" : " ";
      const insert = `${task[1]}- [${checked}] `;
      const cursor = ctx.currentLine.start + insert.length;
      return ok(tx(ctx, "editor.markdownShortcut", [{ from: ctx.currentLine.start, to: ctx.selectionStart, insert }], { start: cursor, end: cursor, direction: "none" }, "markdownShortcut"), "Task list.");
    }
    const heading = /^(\s*)(#{1,6})$/.exec(before);
    if (heading) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const bullet = /^(\s*)[-+*]$/.exec(before);
    if (bullet) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const ordered = /^(\s*)\d+[.)]$/.exec(before);
    if (ordered) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    const quote = /^(\s*)>$/.exec(before);
    if (quote) return insertionTransaction(ctx, "editor.markdownShortcut", " ", 1, "markdownShortcut");
    return fail("not-applicable");
  }
  _smartDelete(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return this._deleteSelectionResult(ctx, "editor.smartDelete");
    const lineOffset = ctx.selectionStart - ctx.currentLine.start;
    if (lineOffset === ctx.currentLine.text.length && ctx.currentLine.end < ctx.value.length && ctx.value[ctx.currentLine.end] === "\n") {
      return ok(tx(ctx, "editor.smartDelete", [{ from: ctx.currentLine.end, to: ctx.currentLine.end + 1, insert: "" }], { start: ctx.currentLine.end, end: ctx.currentLine.end, direction: "none" }, "smartDelete"), "Joined line.");
    }
    return fail("not-applicable");
  }
  _smartBackspace(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return this._deleteSelectionResult(ctx, "editor.smartBackspace"); const lineOffset = ctx.selectionStart - ctx.currentLine.start; const list = ctx.block.list;
    if (list) { if (list.content.trim() === "" && lineOffset >= list.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", list.contentStart, "Exited list."); if (lineOffset === list.contentStart) { const from = ctx.currentLine.start + list.fullMarkerStart; const to = ctx.currentLine.start + list.fullMarkerEnd; return ok(tx(ctx, "editor.smartBackspace", [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace"), "Removed list marker."); } }
    const heading = ctx.block.heading; if (heading && lineOffset === heading.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", heading.contentStart, "Converted to paragraph.");
    const quote = ctx.block.blockquote; if (quote && lineOffset === quote.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", quote.contentStart, "Exited blockquote.");
    if (lineOffset === 0 && ctx.currentLine.start > 0 && ctx.value[ctx.currentLine.start - 1] === "\n") { const joinAt = ctx.currentLine.start - 1; return ok(tx(ctx, "editor.smartBackspace", [{ from: joinAt, to: ctx.currentLine.start, insert: "" }], { start: joinAt, end: joinAt, direction: "none" }, "smartBackspace"), "Joined line."); }
    if (lineOffset > 0 && /^\s+$/.test(ctx.currentLine.text.slice(0, lineOffset))) { const amount = this._lineOutdentAmount(ctx.currentLine.text.slice(0, lineOffset)); if (amount > 0) { const from = ctx.selectionStart - amount; return ok(tx(ctx, "editor.smartBackspace", [{ from, to: ctx.selectionStart, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace")); } }
    return fail("not-applicable");
  }
  _lineOutdentAmount(text) { if (text.startsWith("\t")) return 1; const indent = (text.match(/^ +/) || [""])[0].length; if (indent >= this.indentString.length && this.indentString !== "\t") return this.indentString.length; if (indent >= 4) return 4; if (indent >= 2) return 2; if (indent >= 1) return 1; return 0; }
  _indentLines(ctx, indent) { const changes = []; let ds = 0; let de = 0; for (const line of ctx.selectedLines) { if (!parseListItem(line.text) && ctx.block.kind !== "fenced-code") continue; changes.push({ from: line.start, to: line.start, insert: indent }); if (line.start < ctx.selectionStart) ds += indent.length; if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += indent.length; } if (!changes.length) return fail("not-applicable"); return ok(tx(ctx, "editor.smartTab", changes, { start: ctx.selectionStart + ds, end: ctx.selectionEnd + de, direction: ctx.selectionDirection || "none" }, "indent"), "Indented."); }
  _outdentLines(ctx) { const changes = []; let ds = 0; let de = 0; for (const line of ctx.selectedLines) { const amount = this._lineOutdentAmount(line.text); if (amount <= 0) continue; changes.push({ from: line.start, to: line.start + amount, insert: "" }); if (line.start < ctx.selectionStart) ds -= amount; if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de -= amount; } if (!changes.length) return fail("not-applicable"); const base = ctx.selectedLines[0]?.start ?? 0; return ok(tx(ctx, "editor.smartOutdent", changes, { start: Math.max(base, ctx.selectionStart + ds), end: Math.max(base, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "outdent"), "Outdented."); }

  _toggleParagraph(ctx) { const changes = []; for (const line of ctx.selectedLines) { const list = parseListItem(line.text); const heading = parseHeading(line.text); const quote = parseBlockquote(line.text); if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" }); else if (heading) changes.push({ from: line.start, to: line.start + heading.contentStart, insert: heading.indent }); else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: "" }); } if (!changes.length) return fail("not-applicable"); const d = changes.reduce((sum, c) => c.from < ctx.selectionStart ? sum + c.insert.length - (c.to - c.from) : sum, 0); return ok(tx(ctx, "block.paragraph", changes, { start: Math.max(0, ctx.selectionStart + d), end: Math.max(0, ctx.selectionEnd + d), direction: ctx.selectionDirection || "none" }, "block"), "Converted to paragraph."); }
  _toggleHeading(ctx, level) { const marker = `${"#".repeat(level)} `; const lines = ctx.selectedLines; const allSame = lines.every(line => { const h = parseHeading(line.text); return h && h.level === level; }); const changes = []; for (const line of lines) { const h = parseHeading(line.text); const list = parseListItem(line.text); const quote = parseBlockquote(line.text); if (allSame && h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent }); else if (h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent + marker }); else if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: marker }); else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: marker }); else changes.push({ from: line.start, to: line.start, insert: marker }); } let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } return ok(tx(ctx, `block.heading.${level}`, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allSame ? "Converted to paragraph." : `Heading level ${level}.`); }
  _toggleList(ctx, type) { const markerFor = i => type === "ordered" ? `${i + 1}. ` : type === "task" ? "- [ ] " : "- "; const lines = ctx.selectedLines; const allList = lines.every(line => parseListItem(line.text)); const changes = []; lines.forEach((line, i) => { const list = parseListItem(line.text); const h = parseHeading(line.text); const quote = parseBlockquote(line.text); let c; if (allList && list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" }; else if (list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: markerFor(i) }; else if (h) c = { from: line.start, to: line.start + h.contentStart, insert: h.indent + markerFor(i) }; else if (quote) c = { from: line.start, to: line.start + quote.contentStart, insert: markerFor(i) }; else { const indent = (line.text.match(/^\s*/) || [""])[0]; c = { from: line.start + indent.length, to: line.start + indent.length, insert: markerFor(i) }; } changes.push(c); }); let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } const id = `block.${type === "bullet" ? "bulletList" : type === "ordered" ? "orderedList" : "taskList"}`; return ok(tx(ctx, id, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allList ? "Removed list." : type === "ordered" ? "Numbered list." : type === "task" ? "Task list." : "Bullet list."); }
  _toggleTaskDone(ctx) { const list = ctx.block.list; if (!list || list.kind !== "task-list-item") return fail("not-applicable"); const checkboxStart = ctx.currentLine.start + list.indent.length + `${list.marker} [`.length; const next = list.checked ? " " : "x"; return ok(tx(ctx, "block.taskDone", [{ from: checkboxStart, to: checkboxStart + 1, insert: next }], { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection || "none" }, "block"), next === "x" ? "Task checked." : "Task unchecked."); }
  _toggleBlockquote(ctx) { const lines = ctx.selectedLines; const allQuote = lines.every(line => parseBlockquote(line.text)); const changes = lines.map(line => { const quote = parseBlockquote(line.text); return allQuote && quote ? { from: line.start, to: line.start + quote.contentStart, insert: "" } : { from: line.start, to: line.start, insert: "> " }; }); let ds = 0; let de = 0; for (const c of changes) { const diff = c.insert.length - (c.to - c.from); if (c.from < ctx.selectionStart) ds += diff; if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff; } return ok(tx(ctx, "block.blockquote", changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allQuote ? "Removed blockquote." : "Blockquote."); }
  _toggleCodeFence(ctx, args = {}) { const language = String(args.language ?? "").trim(); const langPart = language ? language : ""; if (ctx.selectionStart !== ctx.selectionEnd) { const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd); const insert = `\`\`\`${langPart}\n${selected}\n\`\`\``; const cursor = ctx.selectionStart + 4 + langPart.length + selected.length; return ok(tx(ctx, "block.codeFence", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "block"), "Code block."); } const insert = `\`\`\`${langPart}\n\n\`\`\``; const cursor = ctx.selectionStart + 4 + langPart.length; return ok(tx(ctx, "block.codeFence", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "block"), "Code block."); }
  _insertHorizontalRule(ctx) { const lead = ctx.selectionStart > 0 && ctx.value[ctx.selectionStart - 1] !== "\n" ? "\n" : ""; const trail = ctx.selectionStart < ctx.value.length && ctx.value[ctx.selectionStart] !== "\n" ? "\n" : "\n"; const insert = `${lead}---${trail}`; return insertionTransaction(ctx, "block.horizontalRule", insert, insert.length, "block"); }
  _insertTable(ctx, args = {}) { const rows = clamp(Number(args.rows) || 2, 1, 20); const cols = clamp(Number(args.cols) || 3, 2, 12); const header = `| ${Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ")} |`; const delimiter = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`; const body = Array.from({ length: rows }, (_, r) => `| ${Array.from({ length: cols }, (_, c) => `Cell ${r * cols + c + 1}`).join(" | ")} |`); const insert = [header, delimiter, ...body].join("\n"); const cursor = ctx.selectionStart + header.indexOf("Column 1"); return ok(tx(ctx, "block.table", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor + "Column 1".length, direction: "none" }, "block"), "Table inserted."); }
  _wrapInline(ctx, prefix, suffix, label) { const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd); if (selected) { const insert = `${prefix}${selected}${suffix}`; const cursor = ctx.selectionStart + insert.length; return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), `${label}.`); } const insert = `${prefix}${suffix}`; const cursor = ctx.selectionStart + prefix.length; return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), `${label}.`); }
  _insertLink(ctx, args = {}) { const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd); const url = args.url ?? ""; if (selected) { const insert = `[${selected}](${url})`; const cursor = url ? ctx.selectionStart + insert.length : ctx.selectionStart + selected.length + 3; return ok(tx(ctx, "inline.link", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Link."); } const insert = url ? `[](${url})` : `[]()`; return ok(tx(ctx, "inline.link", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: ctx.selectionStart + 1, end: ctx.selectionStart + 1, direction: "none" }, "inline"), "Link."); }
  _insertImage(ctx, args = {}) { const alt = args.alt ?? ""; const src = args.src ?? ""; const insert = `![${alt}](${src})`; const cursor = alt ? ctx.selectionStart + insert.length : ctx.selectionStart + 2; return ok(tx(ctx, "inline.image", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Image."); }

  _matchSlash(ctx) { if (ctx.block.kind === "fenced-code" || ctx.inline.insideInlineCode) return null; const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start); const m = /^(\s*)\/([\w-]*)$/.exec(before); if (!m) return null; return { from: ctx.currentLine.start + m[1].length, to: ctx.selectionStart, trigger: "/", query: m[2], providerId: "slash" }; }
  _getSlashItems(match) { const q = match.query.toLowerCase(); const items = []; for (const action of this._actions.values()) { if (!action.visibleInSlash) continue; const hay = [action.label, action.description, ...(action.aliases || []), ...(action.keywords || [])].filter(Boolean).join(" ").toLowerCase(); if (q && !hay.includes(q)) continue; items.push({ id: action.id, label: action.label, detail: action.group, description: action.description || displayShortcut(action.defaultShortcut), kind: "slash-command", actionId: action.id }); } return items.slice(0, 24); }
  _applySlashItem(item, match, ctx) { const repl = this._slashReplacementForAction(item.actionId); if (repl) { const insert = typeof repl.insert === "function" ? repl.insert(ctx) : repl.insert; const off = typeof repl.selectionOffset === "number" ? repl.selectionOffset : insert.length; return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert }], { start: match.from + off, end: match.from + off + (repl.selectionLength || 0), direction: "none" }, "slash"), item.label); } return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert: "" }], { start: match.from, end: match.from, direction: "none" }, "slash"), item.label); }
  _slashReplacementForAction(actionId) { return { "block.paragraph": { insert: "", selectionOffset: 0 }, "block.heading.1": { insert: "# ", selectionOffset: 2 }, "block.heading.2": { insert: "## ", selectionOffset: 3 }, "block.heading.3": { insert: "### ", selectionOffset: 4 }, "block.heading.4": { insert: "#### ", selectionOffset: 5 }, "block.heading.5": { insert: "##### ", selectionOffset: 6 }, "block.heading.6": { insert: "###### ", selectionOffset: 7 }, "block.bulletList": { insert: "- ", selectionOffset: 2 }, "block.orderedList": { insert: "1. ", selectionOffset: 3 }, "block.taskList": { insert: "- [ ] ", selectionOffset: 6 }, "block.blockquote": { insert: "> ", selectionOffset: 2 }, "block.codeFence": { insert: "```\n\n```", selectionOffset: 4 }, "block.horizontalRule": { insert: "---\n", selectionOffset: 4 }, "block.table": { insert: "| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |", selectionOffset: 2, selectionLength: "Column 1".length }, "inline.link": { insert: "[]()", selectionOffset: 1 }, "inline.image": { insert: "![]()", selectionOffset: 2 }, "inline.bold": { insert: "****", selectionOffset: 2 }, "inline.italic": { insert: "**", selectionOffset: 1 }, "inline.code": { insert: "``", selectionOffset: 1 }, "inline.strikethrough": { insert: "~~~~", selectionOffset: 2 } }[actionId] || null; }
  _matchCodeLanguage(ctx) { if (ctx.inline.insideInlineCode) return null; const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start); const m = /^(\s*)```([\w+-]*)$/.exec(before); if (!m) return null; return { from: ctx.currentLine.start + m[1].length, to: ctx.selectionStart, trigger: "```", query: m[2], providerId: "code-language" }; }

  _maybeUpdateCompletions() {
    if (this.disabled || this.readonly || this._isComposing) return; const ctx = this._getContext(); if (ctx.selectionStart !== ctx.selectionEnd) { this._closeCompletion(); return; } const providers = [...this._providers.values()].sort((a, b) => b.priority - a.priority); let selectedProvider = null; let selectedMatch = null;
    for (const provider of providers) { try { const match = provider.match(ctx); if (match) { selectedProvider = provider; selectedMatch = match; break; } } catch (error) { this._emitError("completion", error, true, { providerId: provider.id }); } }
    if (!selectedProvider || !selectedMatch) { this._closeCompletion(); return; }
    const requestId = this._completion.requestId + 1; this._completion.requestId = requestId; this._completion.abort?.abort(); const abort = new AbortController(); this._completion.abort = abort;
    try { Promise.resolve(selectedProvider.getItems(selectedMatch, ctx, abort.signal)).then(items => { if (abort.signal.aborted || this._completion.requestId !== requestId) return; const normalized = this._normalizeCompletionItems(items); if (!normalized.length) { this._closeCompletion(); return; } this._openCompletion(selectedProvider.id, selectedMatch, normalized); }).catch(error => { if (!abort.signal.aborted) { this._emitError("completion", error, true, { providerId: selectedProvider.id }); this._closeCompletion(); } }); } catch (error) { this._emitError("completion", error, true, { providerId: selectedProvider.id }); this._closeCompletion(); }
  }
  _normalizeCompletionItems(items) { const seen = new Set(); const out = []; for (const item of items || []) { if (!item?.id || !item?.label) continue; const key = `${item.kind}:${item.id}`; if (seen.has(key)) continue; seen.add(key); out.push(item); } return out; }
  _openCompletion(providerId, match, items) { const was = this._completion.open; this._completion.open = true; this._completion.providerId = providerId; this._completion.match = match; this._completion.items = items; this._completion.activeIndex = clamp(this._completion.activeIndex, 0, items.length - 1); this._renderCompletion(); if (!was) this._dispatch("md-completion-open", { providerId, match, items }); }
  _closeCompletion() { if (!this._completion.open) return; const detail = { providerId: this._completion.providerId, match: this._completion.match }; this._completion.abort?.abort(); this._completion = { ...this._completion, open: false, providerId: null, match: null, items: [], activeIndex: 0, abort: null }; this._renderCompletion(); this._dispatch("md-completion-close", detail); }
  _renderCompletion() {
    if (!this._completionPopup) return; const open = this._completion.open && this._completion.items.length > 0; this._completionPopup.hidden = !open; const controller = this._isSourceActive() ? this._sourceTextarea : this._liveEditor; controller?.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) { this._completionPopup.innerHTML = ""; this._sourceTextarea?.removeAttribute("aria-activedescendant"); this._liveEditor?.removeAttribute("aria-activedescendant"); return; }
    const activeId = `${this._ids.completion}-item-${this._completion.activeIndex}`; controller?.setAttribute("aria-activedescendant", activeId);
    this._completionPopup.innerHTML = this._completion.items.map((item, index) => `<div id="${this._ids.completion}-item-${index}" class="completion-item" part="${index === this._completion.activeIndex ? "completion-item completion-item-active" : "completion-item"}" role="option" aria-selected="${index === this._completion.activeIndex ? "true" : "false"}" data-index="${index}"><div class="completion-label">${escapeHtml(item.label)}</div><div class="completion-detail">${escapeHtml(item.detail || "")}</div>${item.description ? `<div class="completion-description">${escapeHtml(item.description)}</div>` : ""}</div>`).join("");
    this._positionCompletionPopup();
  }
  _positionCompletionPopup() {
    const shell = this._shadow.querySelector(".editor-shell"); if (!shell || !this._completionPopup) return; const shellRect = shell.getBoundingClientRect(); let rect = null;
    try { const sel = this._shadow.getSelection?.() || globalThis.getSelection?.(); if (sel?.rangeCount) rect = sel.getRangeAt(0).getBoundingClientRect(); } catch {}
    if (!rect || (!rect.width && !rect.height)) { const target = this._domPositionFromSource(this._selection.start)?.editable || this._sourceTextarea; rect = target?.getBoundingClientRect?.(); }
    const left = clamp((rect?.left ?? shellRect.left) - shellRect.left, 4, Math.max(4, shellRect.width - 260)); const top = clamp((rect?.bottom ?? shellRect.top) - shellRect.top + 6, 4, Math.max(4, shellRect.height - 16));
    this._completionPopup.style.left = `${left}px`; this._completionPopup.style.top = `${top}px`;
  }
  _moveCompletion(delta) { const n = this._completion.items.length; if (!n) return; this._setCompletionIndex((this._completion.activeIndex + delta + n) % n); }
  _setCompletionIndex(index) { const n = this._completion.items.length; if (!n) return; this._completion.activeIndex = clamp(index, 0, n - 1); this._renderCompletion(); }
  _acceptCompletion(source = "action") { if (!this._completion.open || !this._completion.items.length) return fail("not-applicable"); const provider = this._providers.get(this._completion.providerId); const item = this._completion.items[this._completion.activeIndex]; if (!provider || !item || item.disabled) return fail("not-applicable"); const ctx = this._getContext(); let result; try { result = provider.apply(item, this._completion.match, ctx); } catch (error) { this._emitError("completion", error, true, { providerId: provider.id }); this._closeCompletion(); return fail("provider-error", String(error?.message || error)); } this._closeCompletion(); if (result?.ok && result.transaction) { const before = this._snapshot(); this._applyTransaction({ ...result.transaction, source: source === "pointer" ? "pointer" : "keyboard", actionId: "completion.accept" }, { source: source === "pointer" ? "pointer" : "keyboard" }); const after = this._snapshot(); this._dispatch("md-completion-accept", { providerId: provider.id, item, before, after }); if (result.announcement) this._announce(result.announcement); return okNoop(result.announcement); } return result || fail("not-applicable"); }

  _updateFormValue() { if (!this._internals) return; this.disabled ? this._internals.setFormValue(null) : this._internals.setFormValue(this._value); }
  _fallbackValidity() { const flags = this._computeValidityFlags(); return { valid: Object.keys(flags).length === 0, valueMissing: Boolean(flags.valueMissing), tooShort: Boolean(flags.tooShort), tooLong: Boolean(flags.tooLong), customError: Boolean(flags.customError) }; }
  _computeValidityFlags() { const flags = {}; const value = this._value; if (this._customValidityMessage) flags.customError = true; if (this.required) { const empty = DEFAULTS.emptyRequiredTrim ? value.trim().length === 0 : value.length === 0; if (empty) flags.valueMissing = true; } const min = this.getAttribute("minlength"); if (min != null && value.length > 0 && value.length < Number(min)) flags.tooShort = true; const max = this.getAttribute("maxlength"); if (max != null && value.length > Number(max)) flags.tooLong = true; return flags; }
  _updateValidity() { if (!this._sourceTextarea) return; const flags = this._computeValidityFlags(); let message = this._customValidityMessage || ""; if (!message) { if (flags.valueMissing) message = "Please fill out this field."; else if (flags.tooShort) message = `Please lengthen this text to at least ${this.getAttribute("minlength")} characters.`; else if (flags.tooLong) message = `Please shorten this text to no more than ${this.getAttribute("maxlength")} characters.`; } const valid = Object.keys(flags).length === 0; for (const el of [this._sourceTextarea, this._liveEditor]) el?.setAttribute("aria-invalid", valid ? "false" : "true"); this._validation.textContent = valid ? "" : message; this._validationMessage = message; this._internals?.setValidity(flags, message, this._sourceTextarea); }
  _emitSelectionChange() { this._dispatch("md-selection-change", { selectionStart: this._selection.start, selectionEnd: this._selection.end, selectionDirection: this._selection.direction || "none" }); }
  _announce(message) { if (!message || !this._status) return; this._status.textContent = ""; requestAnimationFrame(() => { this._status.textContent = message; }); }
  _dispatch(name, detail = {}, options = {}) { const event = new CustomEvent(name, { detail, bubbles: options.bubbles ?? true, composed: options.composed ?? true, cancelable: options.cancelable ?? false }); this.dispatchEvent(event); return event; }
  _emitError(phase, error, recoverable = true, extra = {}) { this._dispatch("md-error", { phase, error, recoverable, ...extra }); }
  formResetCallback() { this.reset(); }
  formDisabledCallback(disabled) { this.disabled = disabled; }
  formStateRestoreCallback(state) { if (typeof state === "string") this.value = state; }
}

if (globalThis.customElements && !customElements.get(TAG_NAME)) customElements.define(TAG_NAME, MdLiveEditorElement);

export { MdLiveEditorElement, renderMarkdown, renderInlineMarkdown, parseBlocks, parseListItem, parseHeading, parseBlockquote, parseFixtureMarkedValue, serializeMarkedValue, htmlToMarkdown, tsvToMarkdownTable };
