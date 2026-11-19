/*! Writemark v1.9.0
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
(() => {
"use strict";
var __writemark = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/writemark-editor.ts
  var writemark_editor_exports = {};
  __export(writemark_editor_exports, {
    MdLiveEditorElement: () => MdLiveEditorElement3,
    WritemarkEditorElement: () => WritemarkEditorElement3,
    enhanceTextarea: () => enhanceTextarea2,
    enhanceTextareas: () => enhanceTextareas2,
    htmlToMarkdown: () => htmlToMarkdown2,
    parseBlockquote: () => parseBlockquote3,
    parseBlocks: () => parseBlocks3,
    parseHeading: () => parseHeading3,
    parseListItem: () => parseListItem2,
    parseTags: () => parseTags2,
    renderInlineMarkdown: () => renderInlineMarkdown2,
    renderMarkdown: () => renderMarkdown2,
    tsvToMarkdownTable: () => tsvToMarkdownTable2
  });

  // src/core/collections.ts
  function requireItem(items, index) {
    const item = items[index];
    if (item === void 0) throw new RangeError(`Missing array entry at ${index}.`);
    return item;
  }
  __name(requireItem, "requireItem");

  // src/browser/runtime.ts
  function isAppleWebKitRuntime(navigator = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    if (!/AppleWebKit/.test(userAgent)) return false;
    if (isIOSWebKitRuntime(navigator)) return true;
    return /Safari\//.test(userAgent) && !/(?:Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|OPiOS|FxiOS|Firefox|Android)/.test(userAgent);
  }
  __name(isAppleWebKitRuntime, "isAppleWebKitRuntime");
  function isIOSWebKitRuntime(navigator = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    const platform = navigator?.platform || "";
    const iOSDevice = /iPhone|iPad|iPod/.test(`${userAgent} ${platform}`) || platform === "MacIntel" && Number(navigator?.maxTouchPoints) > 1;
    return iOSDevice && /AppleWebKit/.test(userAgent);
  }
  __name(isIOSWebKitRuntime, "isIOSWebKitRuntime");
  function readSelectionCandidates(shadowRoot) {
    const candidates = [];
    const add = /* @__PURE__ */ __name((channel, selection) => {
      if (!selection || candidates.some((candidate) => candidate.selection === selection)) return;
      candidates.push({ channel, selection });
    }, "add");
    try {
      const root = shadowRoot;
      if (typeof root?.getSelection === "function") add("shadow", root.getSelection());
    } catch {
    }
    try {
      add("document", globalThis.getSelection?.());
    } catch {
    }
    return candidates;
  }
  __name(readSelectionCandidates, "readSelectionCandidates");

  // src/config.ts
  var TAG_NAME = "writemark-editor";
  var LEGACY_TAG_NAME = "md-live-editor";
  var DEFAULTS = Object.freeze({
    debug: 0,
    mode: "live",
    preview: "none",
    markdownFlavor: "gfm",
    tagsEnabled: false,
    shiftEnterBehavior: "soft-break",
    tabBehavior: "accessibility-first",
    indentString: "  ",
    placeholder: "Write markdown...",
    renderDebounceMs: 100,
    smallDocChars: 2e4,
    largeDocChars: 1e5,
    linkTarget: "_self",
    allowRawHtml: false,
    sanitize: true,
    emptyRequiredTrim: true
  });
  var REFLECTED_ATTRIBUTES = [
    "name",
    "value",
    "label",
    "placeholder",
    "mode",
    "preview",
    "markdown-flavor",
    "tags-enabled",
    "shift-enter-behavior",
    "tab-behavior",
    "indent-string",
    "debug",
    "debug-log",
    "required",
    "disabled",
    "readonly",
    "spellcheck",
    "maxlength",
    "minlength",
    "aria-label",
    "aria-labelledby",
    "dir"
  ];
  var LANGUAGES = [
    "python",
    "javascript",
    "typescript",
    "tsx",
    "jsx",
    "html",
    "css",
    "json",
    "bash",
    "shell",
    "sh",
    "sql",
    "yaml",
    "toml",
    "xml",
    "markdown",
    "text",
    "go",
    "rust",
    "java",
    "c",
    "cpp",
    "csharp",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "r",
    "scala",
    "dockerfile",
    "nginx",
    "graphql",
    "regex"
  ];
  var ALIASES = /* @__PURE__ */ new Map([
    ["py", "python"],
    ["js", "javascript"],
    ["ts", "typescript"],
    ["yml", "yaml"],
    ["md", "markdown"],
    ["rb", "ruby"],
    ["rs", "rust"],
    ["cs", "csharp"],
    ["kt", "kotlin"]
  ]);
  var LIVE_ARROW_KEYS = /* @__PURE__ */ new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
  var NAVIGATION_KEYS = /* @__PURE__ */ new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
  var LIVE_STRUCTURAL_BLOCK_TYPES = /* @__PURE__ */ new Set([
    "blockquote",
    "bullet-list-item",
    "heading",
    "horizontal-rule",
    "ordered-list-item",
    "table",
    "task-list-item"
  ]);
  function normalizeIndentAttribute(value) {
    if (value === "tab" || value === "\\t") return "	";
    if (value === "4" || value === "4-spaces") return "    ";
    if (value === "2" || value === "2-spaces") return "  ";
    if (value === "	" || value === "  " || value === "    ") return value;
    return DEFAULTS.indentString;
  }
  __name(normalizeIndentAttribute, "normalizeIndentAttribute");

  // src/core/text.ts
  function now() {
    return Date.now();
  }
  __name(now, "now");
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  __name(clamp, "clamp");
  function normalizeLineEndings(value) {
    return String(value ?? "").replace(/\r\n?/g, "\n");
  }
  __name(normalizeLineEndings, "normalizeLineEndings");
  function literalSearchPattern(query, caseSensitive = false, global = false) {
    const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, `${global ? "g" : ""}${caseSensitive ? "" : "i"}u`);
  }
  __name(literalSearchPattern, "literalSearchPattern");
  function graphemeBoundaries(value) {
    const text = String(value ?? "");
    if (typeof globalThis.Intl?.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
      return [...segmenter.segment(text)].map((part) => part.index).concat(text.length);
    }
    const boundaries = [0];
    let offset = 0;
    for (const character of text) {
      offset += character.length;
      boundaries.push(offset);
    }
    return boundaries;
  }
  __name(graphemeBoundaries, "graphemeBoundaries");
  function graphemeWindowStart(text, offset) {
    const stable = /^(?:[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{N}\p{P}]|\p{Extended_Pictographic})$/u;
    const previous = /* @__PURE__ */ __name((index) => {
      if (index <= 0) return null;
      let start = index - 1;
      if (start > 0 && /[\uDC00-\uDFFF]/.test(text[start] || "") && /[\uD800-\uDBFF]/.test(text[start - 1] || "")) start -= 1;
      return { start, char: text.slice(start, index) };
    }, "previous");
    for (let index = offset; index > 0; ) {
      const current = previous(index);
      if (!current) break;
      const before = previous(current.start);
      if (before && stable.test(current.char) && stable.test(before.char)) return current.start;
      index = current.start;
    }
    return 0;
  }
  __name(graphemeWindowStart, "graphemeWindowStart");
  function previousGraphemeOffset(value, offset) {
    const text = String(value ?? "");
    const safe = clamp(offset, 0, text.length);
    const start = graphemeWindowStart(text, safe);
    return start + (graphemeBoundaries(text.slice(start, safe)).filter((boundary) => boundary < safe - start).at(-1) ?? 0);
  }
  __name(previousGraphemeOffset, "previousGraphemeOffset");
  function nextGraphemeOffset(value, offset) {
    const text = String(value ?? "");
    const safe = clamp(offset, 0, text.length);
    const start = graphemeWindowStart(text, safe);
    let radius = 64;
    while (true) {
      let end = Math.min(text.length, safe + radius);
      if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1] || "")) end += 1;
      const next = graphemeBoundaries(text.slice(start, end)).find((boundary) => boundary > safe - start) ?? end - start;
      if (next < end - start || end === text.length) return start + next;
      radius *= 2;
    }
  }
  __name(nextGraphemeOffset, "nextGraphemeOffset");
  function parseLengthConstraint(value) {
    if (value == null || !/^\d+$/.test(String(value).trim())) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= 2147483647 ? parsed : null;
  }
  __name(parseLengthConstraint, "parseLengthConstraint");
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
  __name(getLines, "getLines");
  function getLineRange(value, offset) {
    const source = normalizeLineEndings(value);
    const safe = clamp(offset, 0, source.length);
    const before = source.lastIndexOf("\n", Math.max(0, safe - 1));
    const start = before === -1 ? 0 : before + 1;
    const after = source.indexOf("\n", safe);
    const end = after === -1 ? source.length : after;
    return { start, end, text: source.slice(start, end) };
  }
  __name(getLineRange, "getLineRange");

  // src/markdown/inline.ts
  var ESCAPABLE_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  function isEscapablePunctuation(char) {
    return char != null && ESCAPABLE_PUNCTUATION.includes(char);
  }
  __name(isEscapablePunctuation, "isEscapablePunctuation");
  function placeholderPrefix(source) {
    let longestRun = 0;
    for (const match of String(source ?? "").matchAll(/\uE000+/g)) longestRun = Math.max(longestRun, (match[0] ?? "").length);
    return "\uE000".repeat(longestRun + 1);
  }
  __name(placeholderPrefix, "placeholderPrefix");
  function isBackslashEscaped(source, index) {
    let slashes = 0;
    for (let i = index - 1; i >= 0 && source[i] === "\\"; i -= 1) slashes += 1;
    return slashes % 2 === 1;
  }
  __name(isBackslashEscaped, "isBackslashEscaped");
  function matchingBrackets(source) {
    const matches = new Int32Array(source.length).fill(-1);
    const openers = [];
    let escaped = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "[") openers.push(i);
      else if (char === "]" && openers.length) {
        const opener = openers.pop();
        if (opener != null) matches[opener] = i;
      }
    }
    return matches;
  }
  __name(matchingBrackets, "matchingBrackets");
  function parseCodeSpanAt(source, index) {
    if (source[index] !== "`" || source[index - 1] === "`" || isBackslashEscaped(source, index)) return null;
    let markerLength = 1;
    while (source[index + markerLength] === "`") markerLength += 1;
    let cursor = index + markerLength;
    while (cursor < source.length) {
      if (source[cursor] !== "`") {
        cursor += 1;
        continue;
      }
      let closingLength = 1;
      while (source[cursor + closingLength] === "`") closingLength += 1;
      if (closingLength === markerLength) {
        return {
          from: index,
          to: cursor + closingLength,
          marker: source.slice(index, index + markerLength),
          content: source.slice(index + markerLength, cursor),
          contentStart: index + markerLength,
          contentEnd: cursor
        };
      }
      cursor += closingLength;
    }
    return null;
  }
  __name(parseCodeSpanAt, "parseCodeSpanAt");
  function normalizeCodeSpanContent(content) {
    let value = String(content ?? "").replace(/\n/g, " ");
    if (/^\s[\s\S]*\s$/.test(value) && /\S/.test(value)) value = value.slice(1, -1);
    return value;
  }
  __name(normalizeCodeSpanContent, "normalizeCodeSpanContent");
  function codeSpanMarkdown(content) {
    const value = String(content ?? "");
    let longestRun = 0;
    for (const match of value.matchAll(/`+/g)) longestRun = Math.max(longestRun, (match[0] ?? "").length);
    const marker = "`".repeat(longestRun + 1);
    const padded = value && (value.startsWith("`") || value.endsWith("`") || value.startsWith(" ") && value.endsWith(" ")) ? ` ${value} ` : value;
    return `${marker}${padded}${marker}`;
  }
  __name(codeSpanMarkdown, "codeSpanMarkdown");
  function splitLinkDestinationAndTitle(raw) {
    const value = String(raw ?? "").trim();
    if (!value) return { url: "", title: "" };
    const angle = /^<([^<>\n]*)>(?:\s+(["'])(.*?)\2)?\s*$/.exec(value);
    if (angle) return { url: angle[1] ?? "", title: angle[3] || "" };
    const quoted = /^(.*?)\s+(["'])(.*?)\2\s*$/.exec(value);
    if (quoted && (quoted[1] ?? "").trim()) return { url: (quoted[1] ?? "").trim(), title: quoted[3] ?? "" };
    return { url: value, title: "" };
  }
  __name(splitLinkDestinationAndTitle, "splitLinkDestinationAndTitle");
  function parseInlineLinkAt(text, start = 0, brackets = null) {
    const source = String(text ?? "");
    if (isBackslashEscaped(source, start)) return null;
    const bang = source[start] === "!" ? "!" : "";
    let i = start + bang.length;
    if (source[i] !== "[" || isBackslashEscaped(source, i)) return null;
    let escaped = false;
    let labelEnd = brackets ? brackets[i] ?? -1 : -1;
    if (!brackets) {
      let labelDepth = 1;
      for (let j = i + 1; j < source.length; j += 1) {
        const ch = source[j];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === "[") {
          labelDepth += 1;
          continue;
        }
        if (ch === "]") {
          labelDepth -= 1;
          if (labelDepth === 0) {
            labelEnd = j;
            break;
          }
        }
      }
    }
    if (labelEnd === -1 || source[labelEnd + 1] !== "(") return null;
    const label = source.slice(i + 1, labelEnd);
    const destStart = labelEnd + 2;
    let depth = 0;
    let quote = "";
    let angle = false;
    escaped = false;
    for (let j = destStart; j < source.length; j += 1) {
      const ch = source[j];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "<" && j === destStart) {
        angle = true;
        continue;
      }
      if (angle) {
        if (ch === ">") angle = false;
        continue;
      }
      if (quote) {
        if (ch === quote) quote = "";
        continue;
      }
      if ((ch === '"' || ch === "'") && depth === 0 && /\s/.test(source[j - 1] || "")) {
        quote = ch;
        continue;
      }
      if (ch === "(") {
        depth += 1;
        continue;
      }
      if (ch === ")") {
        if (depth > 0) {
          depth -= 1;
          continue;
        }
        const destination = splitLinkDestinationAndTitle(source.slice(destStart, j));
        return {
          bang,
          label,
          url: destination.url,
          title: destination.title,
          from: start,
          to: j + 1,
          labelStart: i + 1,
          labelEnd,
          full: source.slice(start, j + 1)
        };
      }
    }
    return null;
  }
  __name(parseInlineLinkAt, "parseInlineLinkAt");
  function normalizeReferenceLabel(label) {
    return String(label ?? "").replace(/\\([!-/:-@[-`{-~])/g, "$1").trim().replace(/\s+/g, " ").toLowerCase();
  }
  __name(normalizeReferenceLabel, "normalizeReferenceLabel");
  function parseReferenceLinkAt(text, references, start = 0, brackets = null) {
    if (!(references instanceof Map) || references.size === 0) return null;
    const source = String(text ?? "");
    if (isBackslashEscaped(source, start)) return null;
    const bang = source[start] === "!" ? "!" : "";
    const labelStartMarker = start + bang.length;
    if (source[labelStartMarker] !== "[" || isBackslashEscaped(source, labelStartMarker)) return null;
    let labelEnd = brackets ? brackets[labelStartMarker] ?? -1 : -1;
    if (!brackets) {
      let escaped = false;
      let depth = 1;
      for (let i = labelStartMarker + 1; i < source.length; i += 1) {
        const char = source[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === "[") {
          depth += 1;
          continue;
        }
        if (char !== "]") continue;
        depth -= 1;
        if (depth === 0) {
          labelEnd = i;
          break;
        }
      }
    }
    if (labelEnd === -1 || source[labelEnd + 1] === "(") return null;
    const label = source.slice(labelStartMarker + 1, labelEnd);
    let referenceLabel = label;
    let to = labelEnd + 1;
    if (source[to] === "[") {
      const referenceEnd = source.indexOf("]", to + 1);
      if (referenceEnd === -1 || isBackslashEscaped(source, referenceEnd)) return null;
      referenceLabel = source.slice(to + 1, referenceEnd) || label;
      to = referenceEnd + 1;
    }
    const reference = references.get(normalizeReferenceLabel(referenceLabel));
    if (!reference) return null;
    return {
      bang,
      label,
      url: reference.url,
      title: reference.title,
      from: start,
      to,
      labelStart: labelStartMarker + 1,
      labelEnd,
      full: source.slice(start, to)
    };
  }
  __name(parseReferenceLinkAt, "parseReferenceLinkAt");
  function isInlineWhitespace(char) {
    return !char || /\s/u.test(char);
  }
  __name(isInlineWhitespace, "isInlineWhitespace");
  function isInlinePunctuation(char) {
    return char != null && /[\p{P}\p{S}]/u.test(char);
  }
  __name(isInlinePunctuation, "isInlinePunctuation");
  function emphasisDelimiterRuns(source) {
    const runs = [];
    for (let i = 0; i < source.length; i += 1) {
      const marker = source[i];
      if (marker !== "*" && marker !== "_" || isBackslashEscaped(source, i)) continue;
      let length = 1;
      while (source[i + length] === marker) length += 1;
      const before = source[i - 1] || "";
      const after = source[i + length] || "";
      const beforeWhitespace = isInlineWhitespace(before);
      const afterWhitespace = isInlineWhitespace(after);
      const beforePunctuation = isInlinePunctuation(before);
      const afterPunctuation = isInlinePunctuation(after);
      const leftFlanking = !afterWhitespace && (!afterPunctuation || beforeWhitespace || beforePunctuation);
      const rightFlanking = !beforeWhitespace && (!beforePunctuation || afterWhitespace || afterPunctuation);
      const canOpen = marker === "*" ? leftFlanking : leftFlanking && (!rightFlanking || beforePunctuation);
      const canClose = marker === "*" ? rightFlanking : rightFlanking && (!leftFlanking || afterPunctuation);
      runs.push({
        start: i,
        length,
        marker,
        canOpen,
        canClose,
        leftUsed: 0,
        rightUsed: 0,
        get remaining() {
          return this.length - this.leftUsed - this.rightUsed;
        }
      });
      i += length - 1;
    }
    return runs;
  }
  __name(emphasisDelimiterRuns, "emphasisDelimiterRuns");
  function emphasisPairs(source) {
    const runs = emphasisDelimiterRuns(source);
    const pairs = [];
    const openers = { "*": [], "_": [] };
    for (const closer of runs) {
      if (closer.canClose) {
        while (closer.remaining > 0) {
          const candidates = openers[closer.marker];
          while (candidates.length && (candidates.at(-1)?.remaining ?? 0) <= 0) candidates.pop();
          let opener = null;
          for (let openerIndex = candidates.length - 1; openerIndex >= 0; openerIndex -= 1) {
            const candidate = candidates[openerIndex];
            if (!candidate) continue;
            ;
            if (candidate.remaining <= 0) continue;
            const blockedByRuleOfThree = (candidate.canClose || closer.canOpen) && (candidate.remaining + closer.remaining) % 3 === 0 && (candidate.remaining % 3 !== 0 || closer.remaining % 3 !== 0);
            if (blockedByRuleOfThree) continue;
            opener = candidate;
            break;
          }
          if (!opener) break;
          const use = opener.remaining >= 2 && closer.remaining >= 2 ? 2 : 1;
          const openEnd = opener.start + opener.length - opener.rightUsed;
          const openStart = openEnd - use;
          const closeStart = closer.start + closer.leftUsed;
          const closeEnd = closeStart + use;
          opener.rightUsed += use;
          closer.leftUsed += use;
          pairs.push({
            openStart,
            openEnd,
            closeStart,
            closeEnd,
            marker: source.slice(openStart, openEnd),
            tag: use === 2 ? "strong" : "em"
          });
        }
      }
      if (closer.canOpen && closer.remaining > 0) openers[closer.marker].push(closer);
    }
    return pairs;
  }
  __name(emphasisPairs, "emphasisPairs");
  function collectInlineMarkdownRanges(source) {
    const ranges = [];
    const addMatches = /* @__PURE__ */ __name((regex, openLength, closeLength, labelGroup = 1, markerOffsetGroup = null) => {
      regex.lastIndex = 0;
      let match;
      while (match = regex.exec(source)) {
        const label = match[labelGroup] ?? "";
        const markerOffset = markerOffsetGroup == null ? 0 : (match[markerOffsetGroup] ?? "")?.length ?? 0;
        const from = match.index + markerOffset;
        const to = match.index + (match[0] ?? "").length;
        const innerFrom = from + openLength;
        const innerTo = to - closeLength;
        if (isBackslashEscaped(source, from) || isBackslashEscaped(source, to - closeLength)) continue;
        if (innerTo >= innerFrom && label.length >= 0) ranges.push({ from, to, innerFrom, innerTo });
        if (match.index === regex.lastIndex) regex.lastIndex += 1;
      }
    }, "addMatches");
    addMatches(/\*\*([^*]+)\*\*/g, 2, 2);
    addMatches(/__([^_]+)__/g, 2, 2);
    addMatches(/~~([^~]+)~~/g, 2, 2);
    addMatches(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, 1, 1, 2, 1);
    addMatches(/(^|[^_])_([^_\n]+)_(?!_)/g, 1, 1, 2, 1);
    for (let i = 0; i < source.length; i += 1) {
      const code = parseCodeSpanAt(source, i);
      if (!code) continue;
      ranges.push({ from: code.from, to: code.to, innerFrom: code.contentStart, innerTo: code.contentEnd });
      i = code.to - 1;
    }
    const brackets = matchingBrackets(source);
    for (let i = 0; i < source.length; i += 1) {
      const link = parseInlineLinkAt(source, i, brackets);
      if (!link) continue;
      ranges.push({ from: link.from, to: link.to, innerFrom: link.labelStart, innerTo: link.labelEnd });
      i = link.to - 1;
    }
    return ranges.sort((a, b) => a.to - a.from - (b.to - b.from));
  }
  __name(collectInlineMarkdownRanges, "collectInlineMarkdownRanges");

  // src/core/transactions.ts
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
  __name(applyTextChanges, "applyTextChanges");
  function diffTextChange(before, after) {
    const oldValue = normalizeLineEndings(before ?? "");
    const newValue = normalizeLineEndings(after ?? "");
    if (oldValue === newValue) return [];
    let start = 0;
    const maxStart = Math.min(oldValue.length, newValue.length);
    while (start < maxStart && oldValue[start] === newValue[start]) start += 1;
    let oldEnd = oldValue.length;
    let newEnd = newValue.length;
    while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
    }
    return [{ from: start, to: oldEnd, insert: newValue.slice(start, newEnd) }];
  }
  __name(diffTextChange, "diffTextChange");
  function diffTextChanges(before, after) {
    const fallback = diffTextChange(before, after);
    const span = fallback[0];
    if (!span || span.from === span.to || !span.insert.length) return fallback;
    const oldText = normalizeLineEndings(before).slice(span.from, span.to);
    const newText = span.insert;
    const frontier = /* @__PURE__ */ new Map([[1, 0]]);
    const trace = [];
    let work = 0;
    const limit = Math.min(128, oldText.length + newText.length);
    for (let distance = 0; distance <= limit; distance += 1) {
      trace.push(new Map(frontier));
      for (let diagonal = -distance; diagonal <= distance; diagonal += 2) {
        if (++work > 2e5) return fallback;
        const left = frontier.get(diagonal - 1) ?? -Infinity;
        const right = frontier.get(diagonal + 1) ?? -Infinity;
        let x = diagonal === -distance || diagonal !== distance && left < right ? right : left + 1;
        if (!Number.isFinite(x)) x = 0;
        let y = x - diagonal;
        while (x < oldText.length && y < newText.length && oldText[x] === newText[y]) {
          x += 1;
          y += 1;
          if (++work > 2e5) return fallback;
        }
        frontier.set(diagonal, x);
        if (x < oldText.length || y < newText.length) continue;
        const operations = [];
        for (let level = distance; level >= 0; level -= 1) {
          const previous = trace[level];
          if (!previous) return fallback;
          const currentDiagonal = x - y;
          const previousLeft = previous.get(currentDiagonal - 1) ?? -Infinity;
          const previousRight = previous.get(currentDiagonal + 1) ?? -Infinity;
          const previousDiagonal = currentDiagonal === -level || currentDiagonal !== level && previousLeft < previousRight ? currentDiagonal + 1 : currentDiagonal - 1;
          const previousX = previous.get(previousDiagonal) ?? 0;
          const previousY = previousX - previousDiagonal;
          while (x > previousX && y > previousY) {
            operations.push({ kind: "equal", text: oldText[x - 1] ?? "" });
            x -= 1;
            y -= 1;
          }
          if (!level) break;
          if (x === previousX) {
            operations.push({ kind: "insert", text: newText[y - 1] ?? "" });
            y -= 1;
          } else {
            operations.push({ kind: "delete", text: oldText[x - 1] ?? "" });
            x -= 1;
          }
        }
        const changes = [];
        let offset = span.from;
        let pending = null;
        for (const operation of operations.reverse()) {
          if (operation.kind === "equal") {
            if (pending) {
              changes.push(pending);
              pending = null;
            }
            offset += 1;
          } else {
            pending ??= { from: offset, to: offset, insert: "" };
            if (operation.kind === "delete") {
              offset += 1;
              pending.to = offset;
            } else pending.insert += operation.text;
          }
        }
        if (pending) changes.push(pending);
        return changes;
      }
    }
    return fallback;
  }
  __name(diffTextChanges, "diffTextChanges");
  function normalizeChanges(changes = []) {
    return [...changes].map((change) => ({
      from: Number(change.from) || 0,
      to: Number(change.to) || Number(change.from) || 0,
      insert: normalizeLineEndings(change.insert ?? "")
    })).sort((a, b) => a.from - b.from || a.to - b.to);
  }
  __name(normalizeChanges, "normalizeChanges");
  function changedSpans(changes = []) {
    const sorted = normalizeChanges(changes);
    if (!sorted.length) return null;
    let oldStart = Infinity;
    let oldEnd = -Infinity;
    let newStart = Infinity;
    let newEnd = -Infinity;
    let shift = 0;
    for (const change of sorted) {
      oldStart = Math.min(oldStart, change.from);
      oldEnd = Math.max(oldEnd, change.to);
      const newFrom = change.from + shift;
      const newTo = newFrom + change.insert.length;
      newStart = Math.min(newStart, newFrom);
      newEnd = Math.max(newEnd, newTo);
      shift += change.insert.length - (change.to - change.from);
    }
    return { oldStart, oldEnd, newStart, newEnd, delta: shift };
  }
  __name(changedSpans, "changedSpans");
  function sameSelection(a, b) {
    return Boolean(a && b && a.start === b.start && a.end === b.end && (a.direction || "none") === (b.direction || "none"));
  }
  __name(sameSelection, "sameSelection");
  function makeSnapshot(value, selectionStart, selectionEnd, direction = "none") {
    return { value, selection: { start: selectionStart, end: selectionEnd, direction } };
  }
  __name(makeSnapshot, "makeSnapshot");
  function tx(ctx, actionId, changes, selectionAfter, undoGroup = actionId) {
    return { changes, selectionBefore: { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection ?? "none" }, selectionAfter, source: "api", actionId, undoGroup, timestamp: now() };
  }
  __name(tx, "tx");
  function ok(transaction, announcement) {
    return { ok: true, transaction, announcement };
  }
  __name(ok, "ok");
  function okNoop(announcement, preventDefault = false) {
    return { ok: true, announcement, preventDefault };
  }
  __name(okNoop, "okNoop");
  function fail(reason, message) {
    return { ok: false, reason, message };
  }
  __name(fail, "fail");
  function insertionTransaction(ctx, actionId, insert, selectionOffset = insert.length, undoGroup = actionId) {
    const from = ctx.selectionStart;
    const to = ctx.selectionEnd;
    const cursor = from + selectionOffset;
    return ok(tx(ctx, actionId, [{ from, to, insert }], { start: cursor, end: cursor, direction: "none" }, undoGroup));
  }
  __name(insertionTransaction, "insertionTransaction");
  function removePrefixFromLine(ctx, actionId, prefixEndOffset, announcement) {
    const from = ctx.currentLine.start;
    const to = ctx.currentLine.start + prefixEndOffset;
    return ok(tx(ctx, actionId, [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, actionId), announcement);
  }
  __name(removePrefixFromLine, "removePrefixFromLine");
  function validateTransactionRequest(value, request, currentRevision) {
    try {
      if (!request || typeof request !== "object" || Array.isArray(request)) return { ok: false, reason: "invalid-request" };
      const input = request;
      const baseRevision = input.baseRevision;
      if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) return { ok: false, reason: "invalid-request" };
      if (currentRevision !== void 0 && baseRevision !== currentRevision) return { ok: false, reason: "stale-revision" };
      const inputChanges = input.changes;
      if (!Array.isArray(inputChanges)) return { ok: false, reason: "invalid-request" };
      const inputCount = inputChanges.length;
      if (!Number.isSafeInteger(inputCount) || inputCount < 0) return { ok: false, reason: "invalid-request" };
      const origin = input.origin;
      let copiedOrigin;
      if (origin !== void 0) {
        if (!origin || typeof origin !== "object") return { ok: false, reason: "invalid-request" };
        const o = origin;
        const kind = o.kind;
        const id = o.id;
        if (typeof kind !== "string" || !["user", "paste", "action", "completion", "external", "api"].includes(kind) || id !== void 0 && typeof id !== "string") return { ok: false, reason: "invalid-request" };
        copiedOrigin = { kind, ...id === void 0 ? {} : { id } };
      }
      const changes = [];
      const items = inputChanges;
      for (let index = 0; index < inputCount; index += 1) {
        const item = items[index];
        if (!item || typeof item !== "object") return { ok: false, reason: "invalid-change" };
        const c = item;
        const from = c.from;
        const to = c.to;
        const insert = c.insert;
        const expected = c.expected;
        if (typeof from !== "number" || typeof to !== "number" || !Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > value.length || typeof insert !== "string" || expected !== void 0 && typeof expected !== "string") return { ok: false, reason: "invalid-change" };
        if (expected !== void 0 && expected !== value.slice(from, to)) return { ok: false, reason: "expected-mismatch" };
        changes.push({ from, to, insert: normalizeLineEndings(insert) });
      }
      changes.sort((a, b) => a.from - b.from || a.to - b.to);
      for (let i = 1; i < changes.length; i += 1) {
        const previous = changes[i - 1];
        const current = changes[i];
        if (current.from < previous.to || current.from === previous.to && (current.from === current.to || previous.from === previous.to)) return { ok: false, reason: "overlapping-changes" };
      }
      const nextValue = applyTextChanges(value, changes);
      const selection = input.selectionAfter;
      let copiedSelection;
      if (selection !== void 0) {
        if (!selection || typeof selection !== "object") return { ok: false, reason: "invalid-selection" };
        const sel = selection;
        const start = sel.start;
        const end = sel.end;
        const direction = sel.direction;
        if (typeof start !== "number" || typeof end !== "number" || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > nextValue.length || direction !== void 0 && (typeof direction !== "string" || !["none", "forward", "backward"].includes(direction))) return { ok: false, reason: "invalid-selection" };
        copiedSelection = { start, end, direction: direction ?? "none" };
      }
      const copy = {
        baseRevision,
        changes,
        ...copiedOrigin ? { origin: { kind: copiedOrigin.kind, ...copiedOrigin.id === void 0 ? {} : { id: copiedOrigin.id } } } : {},
        ...copiedSelection ? { selectionAfter: { start: copiedSelection.start, end: copiedSelection.end, direction: copiedSelection.direction ?? "none" } } : {}
      };
      return { ok: true, request: copy, value: nextValue, changes };
    } catch {
      return { ok: false, reason: "invalid-request" };
    }
  }
  __name(validateTransactionRequest, "validateTransactionRequest");
  function mapTransactionSelection(selection, changes) {
    const collapsed = selection.start === selection.end;
    const map = /* @__PURE__ */ __name((offset, affinity) => {
      let shift = 0;
      for (const c of changes) {
        if (offset < c.from) break;
        if (offset <= c.to) return c.from + shift + (affinity === "right" || offset === c.to && c.from !== c.to ? c.insert.length : 0);
        shift += c.insert.length - (c.to - c.from);
      }
      return offset + shift;
    }, "map");
    return { start: map(selection.start, collapsed ? "right" : "left"), end: map(selection.end, "right"), direction: selection.direction ?? "none" };
  }
  __name(mapTransactionSelection, "mapTransactionSelection");
  function invertTextChanges(before, changes) {
    const inverse = [];
    let shift = 0;
    for (const change of [...changes].sort((a, b) => a.from - b.from || a.to - b.to)) {
      const inserted = normalizeLineEndings(change.insert);
      const from = change.from + shift;
      const next = { from, to: from + inserted.length, insert: before.slice(change.from, change.to) };
      shift += inserted.length - (change.to - change.from);
      if (next.from === next.to && !next.insert.length) continue;
      const previous = inverse.at(-1);
      if (previous && previous.to === next.from && (previous.from === previous.to || next.from === next.to)) {
        previous.to = next.to;
        previous.insert += next.insert;
      } else inverse.push(next);
    }
    return inverse;
  }
  __name(invertTextChanges, "invertTextChanges");

  // src/markdown/tables.ts
  function splitTableRow(line) {
    let row = String(line ?? "").trim();
    if (row.startsWith("|")) row = row.slice(1);
    if (row.endsWith("|")) row = row.slice(0, -1);
    const cells = [];
    let current = "";
    let escaped = false;
    for (const char of row) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        current += char;
        escaped = true;
        continue;
      }
      if (char === "|") {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    return cells;
  }
  __name(splitTableRow, "splitTableRow");
  function hasTablePipe(text) {
    let escaped = false;
    for (const character of text) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === "|") return true;
    }
    return false;
  }
  __name(hasTablePipe, "hasTablePipe");
  function isTableDelimiter(line) {
    const t = String(line ?? "").trim();
    if (!hasTablePipe(t)) return false;
    const cells = splitTableRow(t);
    return cells.length >= 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
  }
  __name(isTableDelimiter, "isTableDelimiter");
  function isLikelyTableRow(line) {
    const t = String(line ?? "").trim();
    return hasTablePipe(t) && splitTableRow(t).length >= 1;
  }
  __name(isLikelyTableRow, "isLikelyTableRow");
  function parseTableLineRanges(line, absoluteStart, preserveWhitespace = false) {
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
      if (!atEnd && escaped) {
        escaped = false;
        continue;
      }
      if (!atEnd && ch === "\\") {
        escaped = true;
        continue;
      }
      if (atEnd || ch === "|") {
        const rawCellStart = cellStart;
        const rawCellEnd = i;
        let from = cellStart;
        let to = i;
        while (from < to && raw[from] === " ") {
          from += 1;
          if (preserveWhitespace) break;
        }
        while (to > from && raw[to - 1] === " ") {
          to -= 1;
          if (preserveWhitespace) break;
        }
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
  __name(parseTableLineRanges, "parseTableLineRanges");
  function tableAlignmentFromDelimiter(cellText) {
    const value = String(cellText ?? "").trim();
    const left = value.startsWith(":");
    const right = value.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return "";
  }
  __name(tableAlignmentFromDelimiter, "tableAlignmentFromDelimiter");
  function tableAlignmentStyle(alignment) {
    return alignment ? ` style="text-align:${alignment}"` : "";
  }
  __name(tableAlignmentStyle, "tableAlignmentStyle");
  function unescapeTableCellText(cellText) {
    return String(cellText ?? "").replace(/\\([\\|])/g, "$1");
  }
  __name(unescapeTableCellText, "unescapeTableCellText");
  function escapeTableCellText(cellText) {
    return String(cellText ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
  }
  __name(escapeTableCellText, "escapeTableCellText");
  function tableCellDisplayMap(raw) {
    let inline = "";
    const tableOffsets = [0];
    for (let index = 0; index < raw.length; ) {
      if (raw[index] === "\\" && (raw[index + 1] === "\\" || raw[index + 1] === "|")) {
        inline += raw[index + 1];
        index += 2;
      } else {
        inline += raw[index];
        index += 1;
      }
      tableOffsets.push(index);
    }
    let text = "";
    const sourceOffsets = [0];
    for (let index = 0; index < inline.length; ) {
      const code = inline[index] === "`" ? parseCodeSpanAt(inline, index) : null;
      if (code) {
        while (index < code.to) {
          text += inline[index];
          index += 1;
          sourceOffsets.push(tableOffsets[index] ?? raw.length);
        }
      } else if (inline[index] === "\\" && isEscapablePunctuation(inline[index + 1])) {
        text += inline[index + 1];
        index += 2;
        sourceOffsets.push(tableOffsets[index] ?? raw.length);
      } else {
        text += inline[index];
        index += 1;
        sourceOffsets.push(tableOffsets[index] ?? raw.length);
      }
    }
    return { text, sourceOffsets };
  }
  __name(tableCellDisplayMap, "tableCellDisplayMap");
  function editTableCellDisplay(raw, nextText, displayCursor) {
    const before = tableCellDisplayMap(raw);
    const change = diffTextChange(before.text, nextText)[0];
    let text = raw;
    if (change) {
      const from = before.sourceOffsets[change.from] ?? raw.length;
      const to = before.sourceOffsets[change.to] ?? raw.length;
      text = raw.slice(0, from) + escapeTableCellText(change.insert) + raw.slice(to);
    }
    const after = tableCellDisplayMap(text);
    const cursor = after.sourceOffsets[Math.max(0, Math.min(after.text.length, displayCursor))] ?? text.length;
    return { text, cursor };
  }
  __name(editTableCellDisplay, "editTableCellDisplay");

  // src/browser/selection.ts
  var SelectionController = class {
    static {
      __name(this, "SelectionController");
    }
    constructor(api) {
      this.api = Object.freeze(api);
      this._boundLiveMouseEnd = void 0;
      this._boundLiveMouseMove = void 0;
      this._liveEditablesCache = [];
      this._liveNavigationCache = [];
      this._liveIndexDirty = true;
      this._liveSelectionAPI = null;
      this._fallbackEditable = null;
      this._fallbackSelectionPending = false;
      this._selectionRestoreRequest = 0;
      this._pointerSelection = null;
      this._suppressLiveClick = false;
      this._structuredSelection = null;
      this._ignoreSelectionChangeCount = 0;
    }
    get disabled() {
      return this.api.getDisabled();
    }
    get readonly() {
      return this.api.getReadonly();
    }
    get mode() {
      return this.api.getMode();
    }
    get _selection() {
      return this.api.getSelection();
    }
    set _selection(value) {
      this.api.setSelection(value);
    }
    get ownerDocument() {
      return this.api.getOwnerDocument();
    }
    get _isComposing() {
      return this.api.getIsComposing();
    }
    set _isComposing(value) {
      this.api.setIsComposing(value);
    }
    get _value() {
      return this.api.getValue();
    }
    get _shadow() {
      return this.api.getShadow();
    }
    get _sourceTextarea() {
      return this.api.getSourceTextarea();
    }
    get _preview() {
      return this.api.getPreview();
    }
    get _liveEditor() {
      return this.api.getLiveEditor();
    }
    set _liveEditor(value) {
      this.api.setLiveEditor(value);
    }
    get _virtualState() {
      return this.api.getVirtualState();
    }
    get isConnected() {
      return this.api.getIsConnected();
    }
    get _liveBlocks() {
      return this.api.getLiveBlocks();
    }
    set _liveBlocks(value) {
      this.api.setLiveBlocks(value);
    }
    disconnect() {
      const doc = this.ownerDocument || document;
      if (this._boundLiveMouseMove) doc.removeEventListener("mousemove", this._boundLiveMouseMove, true);
      if (this._boundLiveMouseEnd) doc.removeEventListener("mouseup", this._boundLiveMouseEnd, true);
      this._pointerSelection = null;
    }
    _onLiveMouseDown(event) {
      if (this.disabled || this.readonly || this.mode === "source" || event.button !== 0 || event.detail > 1) return;
      if (event.target instanceof Element && event.target.closest("[data-task-checkbox]")) return;
      const anchor = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
      if (anchor == null) return;
      const editable = this._liveEditableFromPoint(event.clientX, event.clientY);
      this.api._closeCompletion();
      if (this._liveSelectionAPI === false || this.api.isAppleWebKitRuntime()) {
        if (this._liveSelectionAPI === false) this._fallbackEditable = editable;
        this._fallbackSelectionPending = false;
        this._selection = { start: anchor, end: anchor, direction: "none" };
        this._pointerSelection = {
          anchor,
          focus: anchor,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          native: true
        };
        this._bindPointerSelectionListeners();
        return;
      }
      event.preventDefault();
      this._pointerSelection = { anchor, focus: anchor, startX: event.clientX, startY: event.clientY, moved: false, native: false };
      this.api.setSelectionRange(anchor, anchor, "none");
      this._bindPointerSelectionListeners();
    }
    _bindPointerSelectionListeners() {
      this._boundLiveMouseMove ??= (mouseEvent) => this._onLiveMouseMove(mouseEvent);
      this._boundLiveMouseEnd ??= (mouseEvent) => this._onLiveMouseEnd(mouseEvent);
      const doc = this.ownerDocument || document;
      doc.addEventListener("mousemove", this._boundLiveMouseMove, true);
      doc.addEventListener("mouseup", this._boundLiveMouseEnd, true);
    }
    _onLiveMouseMove(event) {
      const state = this._pointerSelection;
      if (!state) return;
      const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
      if (focus == null) return;
      if (state.native) {
        state.focus = focus;
        state.moved = state.moved || Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 2;
        this._setFallbackPointerSelection(state.anchor, focus);
        return;
      }
      event.preventDefault();
      state.focus = focus;
      state.moved = state.moved || Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 2;
      this._setLivePointerSelection(state.anchor, focus);
    }
    _onLiveMouseEnd(event) {
      const state = this._pointerSelection;
      if (!state) return;
      const focus = this._sourceOffsetForClientPoint(event.clientX, event.clientY);
      if (focus != null) {
        if (state.native) this._setFallbackPointerSelection(state.anchor, focus);
        else this._setLivePointerSelection(state.anchor, focus);
      }
      this._suppressLiveClick = state.moved;
      if (this._suppressLiveClick) globalThis.setTimeout?.(() => {
        this._suppressLiveClick = false;
      }, 0);
      this._pointerSelection = null;
      const doc = this.ownerDocument || document;
      if (this._boundLiveMouseMove) doc.removeEventListener("mousemove", this._boundLiveMouseMove, true);
      if (this._boundLiveMouseEnd) doc.removeEventListener("mouseup", this._boundLiveMouseEnd, true);
      if (!state.native) event.preventDefault();
      else {
        this.api._emitSelectionChange();
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
      }
    }
    _setLivePointerSelection(anchor, focus) {
      const start = Math.min(anchor, focus);
      const end = Math.max(anchor, focus);
      const direction = anchor <= focus ? "forward" : "backward";
      this.api.setSelectionRange(start, end, direction);
    }
    _setFallbackPointerSelection(anchor, focus) {
      const start = Math.min(anchor, focus);
      const end = Math.max(anchor, focus);
      this._selection = {
        start,
        end,
        direction: anchor <= focus ? "forward" : "backward"
      };
    }
    _onNavigationKey(event) {
      if (NAVIGATION_KEYS.has(event.key)) this._onSelectionChanged();
    }
    _maybeHandleLineBoundaryKey(event, activeCell = null, activeEditable = null) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || activeCell || this.mode === "preview") return false;
      const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "") || this.api.isAppleWebKitRuntime() && !this.api.isIOSWebKitRuntime();
      let boundary = null;
      if (!event.metaKey && (event.key === "Home" || event.key === "End")) boundary = event.key === "Home" ? "start" : "end";
      else if (isMac && event.metaKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) boundary = event.key === "ArrowLeft" ? "start" : "end";
      if (!boundary) return false;
      const selection = this._getCurrentSelection();
      const focus = selection.direction === "backward" ? selection.start : selection.end;
      const anchor = selection.direction === "backward" ? selection.end : selection.start;
      const line = getLineRange(this._value, focus);
      const editableRange = !this._isSourceActive() ? activeEditable ? this._editableSourceRange(activeEditable) : null : null;
      const target = boundary === "start" ? editableRange?.from ?? line.start : editableRange?.to ?? line.end;
      event.preventDefault();
      if (event.shiftKey) this._setSourceBackedSelection(anchor, target);
      else this.api.setSelectionRange(target, target, "none");
      return true;
    }
    _maybeHandleLiveArrowKey(event, activeEditable = null) {
      if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return false;
      if (!LIVE_ARROW_KEYS.has(event.key)) return false;
      const editable = activeEditable || this.api._activeEditableFromEvent(event);
      if (!editable || editable.dataset.editable === "cell") return false;
      const selection = this._getLiveSelection() || this._getCurrentSelection();
      if (!selection) return false;
      if (selection.start !== selection.end && !event.shiftKey) {
        const target2 = event.key === "ArrowLeft" || event.key === "ArrowUp" ? selection.start : selection.end;
        event.preventDefault();
        this.api.setSelectionRange(target2, target2, "none");
        return true;
      }
      if (event.shiftKey) return this._maybeExtendLiveArrowSelection(event, selection);
      if (selection.start !== selection.end) return false;
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      let target = event.key === "ArrowLeft" || event.key === "ArrowRight" ? this._horizontalArrowTarget(editable, selection.start, direction) : this._verticalArrowTarget(editable, selection.start, direction);
      if (target == null && this._liveSelectionAPI === false) {
        target = event.key === "ArrowLeft" || event.key === "ArrowRight" ? this._fallbackHorizontalArrowTarget(editable, selection.start, direction) : this._fallbackVerticalArrowTarget(editable, selection.start, direction);
      }
      if (target == null || target === selection.start) return false;
      event.preventDefault();
      this.api.setSelectionRange(target, target, "none");
      return true;
    }
    _maybeExtendLiveArrowSelection(event, selection = this._getCurrentSelection()) {
      const focus = selection.direction === "backward" ? selection.start : selection.end;
      const anchor = selection.direction === "backward" ? selection.end : selection.start;
      const pos = this._domPositionFromSource(focus);
      const editable = pos?.editable;
      if (!editable || editable.dataset.editable === "cell") return false;
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      let target = event.key === "ArrowLeft" || event.key === "ArrowRight" ? this._horizontalArrowTarget(editable, focus, direction) : this._verticalArrowTarget(editable, focus, direction);
      if (target == null && this._liveSelectionAPI === false) {
        target = event.key === "ArrowLeft" || event.key === "ArrowRight" ? this._fallbackHorizontalArrowTarget(editable, focus, direction) : this._fallbackVerticalArrowTarget(editable, focus, direction);
      }
      if (target == null || target === focus) return false;
      event.preventDefault();
      this._setSourceBackedSelection(anchor, target);
      return true;
    }
    _setSourceBackedSelection(anchor, focus) {
      const start = Math.min(anchor, focus);
      const end = Math.max(anchor, focus);
      const direction = anchor <= focus ? "forward" : "backward";
      this.api.setSelectionRange(start, end, direction);
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
    _fallbackHorizontalArrowTarget(editable, offset, direction) {
      const from = Number(editable.dataset.from);
      const to = Number(editable.dataset.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      if (direction < 0 && offset > from) {
        return offset - (Array.from(this._value.slice(from, offset)).at(-1)?.length || 1);
      }
      if (direction > 0 && offset < to) {
        return offset + (Array.from(this._value.slice(offset, to))[0]?.length || 1);
      }
      return null;
    }
    _fallbackVerticalArrowTarget(editable, offset, direction) {
      const caret = this._caretRectForSourceOffset(offset, editable);
      const box = editable.getBoundingClientRect();
      if (!caret || !box || box.height === 0) return null;
      const lineHeight = this._computedLineHeight(editable);
      const clientX = caret.left;
      const clientY = (caret.top + caret.bottom) / 2 + direction * lineHeight;
      if (clientY <= box.top || clientY >= box.bottom) return null;
      const fromPoint = this._sourceOffsetFromPoint(editable, clientX, clientY);
      if (fromPoint != null) return fromPoint;
      return this._nearestSourceOffsetInEditable(editable, clientX, clientY);
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
      return direction < 0 ? rect.top <= box.top + tolerance : rect.bottom >= box.bottom - tolerance;
    }
    _caretRectForSourceOffset(offset, preferredEditable = null) {
      const pos = preferredEditable ? this._textPositionInElement(preferredEditable, this._displayOffsetFromSourceOffset(preferredEditable, offset)) : this._domPositionFromSource(offset);
      if (!pos) return null;
      return this._caretRectFromDomPosition(pos.node, pos.offset);
    }
    _caretRectFromDomPosition(node, offset) {
      const range = document.createRange();
      try {
        range.setStart(node, offset);
      } catch {
        return null;
      }
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
          if (pos) {
            node = pos.offsetNode;
            offset = pos.offset;
          }
        } catch {
          const pos = doc.caretPositionFromPoint(clientX, clientY);
          if (pos) {
            node = pos.offsetNode;
            offset = pos.offset;
          }
        }
      }
      if (!node && doc.caretRangeFromPoint) {
        const range = doc.caretRangeFromPoint(clientX, clientY);
        if (range) {
          node = range.startContainer;
          offset = range.startOffset;
        }
      }
      if (!node || node !== editable && !editable.contains(node)) return null;
      return this._sourceOffsetFromDom(editable, node, offset);
    }
    _liveEditableFromPoint(clientX, clientY) {
      const direct = this._shadow.elementFromPoint?.(clientX, clientY);
      const directEditable = this._closestEditable(direct);
      if (directEditable) return directEditable;
      const editables = this._liveEditables();
      let best = null;
      let bestScore = Infinity;
      for (const el of editables) {
        const rect = el.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) continue;
        const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
        const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
        const score = dy * 1e4 + dx;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
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
        const rowDistance = Math.abs((rect.top + rect.bottom) / 2 - clientY);
        const columnDistance = Math.abs(rect.left - clientX);
        const score = rowDistance * 1e3 + columnDistance;
        if (score < bestScore) {
          bestScore = score;
          bestOffset = offset;
        }
      }
      return this._sourceOffsetFromDisplayOffset(editable, bestOffset) ?? from;
    }
    _onSelectionChanged() {
      if (this._ignoreSelectionChangeCount > 0) {
        this._ignoreSelectionChangeCount -= 1;
        this.api._debug(2, "live.selection.change-ignored", {
          remaining: this._ignoreSelectionChangeCount,
          selection: { ...this._selection }
        });
        this.api._emitSelectionChange();
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      this._structuredSelection = null;
      this._selection = this._getCurrentSelection();
      const exposedSelection = this._exposedLiveSelection();
      const selectionEndpoints = this._liveSelectionEndpoints(exposedSelection);
      this.api._debug(2, "live.selection.changed", {
        selection: { ...this._selection },
        active: this.api._debugEditableInfo(this._activeEditableFromSelection()),
        selectionReadStrategy: selectionEndpoints?.strategy || null
      });
      this.api._emitSelectionChange();
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
    _isSourceActive() {
      return this._shadow.activeElement === this._sourceTextarea || this.mode === "source" || this.mode === "split";
    }
    _focusEditable(options) {
      if (this.disabled) return;
      if (this.mode === "source" || this.mode === "split") {
        this._sourceTextarea?.focus(options);
        this._sourceTextarea?.setSelectionRange(this._selection.start, this._selection.end, this._selection.direction);
        return;
      }
      if (this.mode === "preview") {
        this._preview?.focus(options);
        return;
      }
      this._liveEditor?.focus(options);
      this._restoreLiveSelection(this._selection);
    }
    _displayOffsetFromSourceOffset(editable, sourceOffset) {
      const range = this._editableSourceRange(editable);
      if (!range) return 0;
      const raw = this._cellRawSource(editable);
      const rel = clamp(Number(sourceOffset) - range.from, 0, range.to - range.from);
      if (raw == null) return clamp(rel, 0, this._plainText(editable).length);
      const map = tableCellDisplayMap(raw);
      let display = 0;
      while (display < map.text.length && (map.sourceOffsets[display + 1] ?? raw.length) <= rel) display += 1;
      return clamp(display, 0, this._plainText(editable).length);
    }
    _sourceOffsetFromDisplayOffset(editable, displayOffset) {
      const range = this._editableSourceRange(editable);
      if (!range) return null;
      const raw = this._cellRawSource(editable);
      const target = clamp(Number(displayOffset) || 0, 0, this._plainText(editable).length);
      if (raw == null) return clamp(range.from + target, range.from, Math.max(range.to, range.from + this._plainText(editable).length));
      return range.from + (tableCellDisplayMap(raw).sourceOffsets[target] ?? raw.length);
    }
    _getCurrentSelection() {
      if (this._isSourceActive() && this._sourceTextarea) return { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
      if (this._structuredSelection) return { ...this._structuredSelection };
      const live = this._getLiveSelection();
      return live || this._selection || { start: 0, end: 0, direction: "none" };
    }
    _getLiveSelection(preferredEditable = null) {
      if (this._liveSelectionAPI === false) {
        if (!this._selection) return null;
        if (preferredEditable) {
          const range = this._editableSourceRange(preferredEditable);
          if (!range || this._selection.start < range.from || this._selection.end > range.to) return null;
        }
        return { ...this._selection };
      }
      return this._readLiveSelection(preferredEditable);
    }
    _readLiveSelection(preferredEditable = null) {
      const sel = this._exposedLiveSelection();
      if (!sel) return null;
      const endpoints = this._liveSelectionEndpoints(sel);
      if (!endpoints) return null;
      const anchorEditable = preferredEditable || this._closestEditable(endpoints.anchorNode?.nodeType === Node.ELEMENT_NODE ? endpoints.anchorNode : endpoints.anchorNode?.parentElement);
      const focusEditable = preferredEditable || this._closestEditable(endpoints.focusNode?.nodeType === Node.ELEMENT_NODE ? endpoints.focusNode : endpoints.focusNode?.parentElement);
      if (!anchorEditable || !focusEditable) return null;
      if (preferredEditable && (!preferredEditable.contains(endpoints.anchorNode) && preferredEditable !== endpoints.anchorNode || !preferredEditable.contains(endpoints.focusNode) && preferredEditable !== endpoints.focusNode)) return null;
      const start = this._sourceOffsetFromDom(anchorEditable, endpoints.anchorNode, endpoints.anchorOffset);
      const end = this._sourceOffsetFromDom(focusEditable, endpoints.focusNode, endpoints.focusOffset);
      if (start == null || end == null) return null;
      return { start: Math.min(start, end), end: Math.max(start, end), direction: start <= end ? "forward" : "backward" };
    }
    _isLiveSelectionNode(node) {
      return Boolean(node && (node === this._liveEditor || this._liveEditor?.contains(node)));
    }
    _liveComposedSelectionRange(selection) {
      if (!selection || typeof selection.getComposedRanges !== "function" || !this.api.isAppleWebKitRuntime() || this.api.isIOSWebKitRuntime()) return null;
      const attempts = [
        () => selection.getComposedRanges(this._shadow),
        () => selection.getComposedRanges({ shadowRoots: [this._shadow] })
      ];
      for (const read of attempts) {
        let range = null;
        try {
          range = read()?.[0] || null;
        } catch {
          continue;
        }
        if (this._isLiveSelectionNode(range?.startContainer) && this._isLiveSelectionNode(range?.endContainer)) return range;
      }
      return null;
    }
    _liveSelectionEndpoints(selection) {
      if (!selection || selection.rangeCount === 0) return null;
      const anchorNode = selection.anchorNode;
      const focusNode = selection.focusNode;
      if (this._isLiveSelectionNode(anchorNode) && this._isLiveSelectionNode(focusNode)) {
        return {
          anchorNode,
          anchorOffset: selection.anchorOffset,
          focusNode,
          focusOffset: selection.focusOffset,
          strategy: "direct"
        };
      }
      const composed = this._liveComposedSelectionRange(selection);
      if (!composed) return null;
      const startEditable = this._closestEditable(
        composed.startContainer?.nodeType === Node.ELEMENT_NODE ? composed.startContainer : composed.startContainer?.parentElement
      );
      const endEditable = this._closestEditable(
        composed.endContainer?.nodeType === Node.ELEMENT_NODE ? composed.endContainer : composed.endContainer?.parentElement
      );
      const composedStart = startEditable ? this._sourceOffsetFromDom(
        startEditable,
        composed.startContainer,
        composed.startOffset
      ) : null;
      const composedEnd = endEditable ? this._sourceOffsetFromDom(
        endEditable,
        composed.endContainer,
        composed.endOffset
      ) : null;
      const explicitDirection = selection.direction;
      const previous = this._selection;
      const inferredBackward = composedStart != null && composedEnd != null && composedStart !== composedEnd && (previous?.start === previous?.end && composedEnd === previous.end || previous?.direction === "backward" && composedEnd === previous.end);
      const backward = explicitDirection === "backward" || !["forward", "backward"].includes(explicitDirection) && inferredBackward;
      return {
        anchorNode: backward ? composed.endContainer : composed.startContainer,
        anchorOffset: backward ? composed.endOffset : composed.startOffset,
        focusNode: backward ? composed.startContainer : composed.endContainer,
        focusOffset: backward ? composed.startOffset : composed.endOffset,
        strategy: "composed-range"
      };
    }
    _exposedLiveSelection() {
      if (!this._liveEditor) return null;
      const candidate = this.api.readSelectionCandidates().find(({ selection }) => {
        return Boolean(this._liveSelectionEndpoints(selection));
      });
      return candidate?.selection || null;
    }
    _displayOffsetFromSelection(editable) {
      const sel = this._exposedLiveSelection();
      const endpoints = this._liveSelectionEndpoints(sel);
      const node = endpoints?.focusNode;
      if (!endpoints || !node || node !== editable && !editable.contains(node)) return null;
      const range = document.createRange();
      range.selectNodeContents(editable);
      try {
        range.setEnd(node, endpoints.focusOffset);
      } catch {
        return null;
      }
      return range.toString().replace(/\u00a0/g, " ").replace(/\n/g, "").length;
    }
    _sourceOffsetFromDom(editable, node, offset) {
      const from = Number(editable.dataset.from);
      if (!Number.isFinite(from)) return null;
      const range = document.createRange();
      range.selectNodeContents(editable);
      try {
        range.setEnd(node, offset);
      } catch {
        return from;
      }
      const text = range.toString().replace(/\u00a0/g, " ").replace(/\n/g, "");
      return this._sourceOffsetFromDisplayOffset(editable, text.length) ?? from;
    }
    _restoreLiveSelection(selection = this._selection, options = {}) {
      const deferredAttempt = options.deferredAttempt || 0;
      const requestId = options.requestId ?? ++this._selectionRestoreRequest;
      if (requestId !== this._selectionRestoreRequest) return;
      if (!this._liveEditor || this.mode === "source" || this.disabled) return;
      if (this._virtualState.active && !this.api._ensureVirtualSelectionVisible(selection)) {
        this._liveEditor.focus();
        return;
      }
      const startPos = this._domPositionFromSource(selection.start);
      const endPos = this._domPositionFromSource(selection.end);
      if (!startPos || !endPos) {
        this._liveEditor.focus();
        return;
      }
      if (!this._isLiveDomPositionConnected(startPos) || !this._isLiveDomPositionConnected(endPos)) {
        this._liveEditor.focus();
        return;
      }
      const focusEditable = selection.direction === "backward" ? startPos.editable : endPos.editable;
      const focusTarget = this._liveSelectionAPI === false ? focusEditable || startPos.editable : this._liveEditor;
      const activeElement = this._shadow?.activeElement || null;
      const focusRequired = Boolean(focusTarget && (focusTarget === this._liveEditor ? !this.api.hasComponentFocus() : activeElement !== focusTarget && !focusTarget.contains(activeElement)));
      this.api._debug(2, "live.selection.restore-requested", {
        requested: { ...selection },
        deferredAttempt,
        focusRequired,
        start: this.api._debugEditableInfo(startPos.editable),
        end: this.api._debugEditableInfo(endPos.editable)
      });
      if (focusRequired) {
        try {
          focusTarget?.focus?.({ preventScroll: true });
        } catch {
          focusTarget?.focus?.();
        }
      }
      const range = document.createRange();
      try {
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);
      } catch {
        this._liveEditor.focus();
        return;
      }
      const candidates = this.api.readSelectionCandidates();
      const strictDocumentRestore = options.strictDocumentRestore ?? Boolean(
        candidates.length === 1 && candidates[0]?.channel === "document" && this.api.isAppleWebKitRuntime()
      );
      let actual = null;
      let observed = null;
      let selectionChannel = null;
      let selectionReadStrategy = null;
      let selectionStrategy = null;
      let selectionVerification = null;
      let opaqueDocumentWrite = null;
      for (const candidate of candidates) {
        const sel = candidate.selection;
        const strategies = [];
        if (strictDocumentRestore && typeof sel.setBaseAndExtent === "function") {
          strategies.push({
            name: "setBaseAndExtent",
            apply: /* @__PURE__ */ __name(() => {
              if (selection.direction === "backward") sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
              else sel.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
            }, "apply")
          });
        }
        if (selection.start === selection.end && !strictDocumentRestore) {
          strategies.push({
            name: "addRange",
            apply: /* @__PURE__ */ __name(() => sel.addRange(range), "apply")
          });
        }
        if (!strictDocumentRestore && typeof sel.setBaseAndExtent === "function") {
          strategies.push({
            name: "setBaseAndExtent",
            apply: /* @__PURE__ */ __name(() => {
              if (selection.direction === "backward") sel.setBaseAndExtent(endPos.node, endPos.offset, startPos.node, startPos.offset);
              else sel.setBaseAndExtent(startPos.node, startPos.offset, endPos.node, endPos.offset);
            }, "apply")
          });
        }
        if (selection.start === selection.end && typeof sel.setPosition === "function") {
          strategies.push({
            name: "setPosition",
            apply: /* @__PURE__ */ __name(() => sel.setPosition(startPos.node, startPos.offset), "apply")
          });
        }
        if (selection.start === selection.end && typeof sel.collapse === "function") {
          strategies.push({
            name: "collapse",
            apply: /* @__PURE__ */ __name(() => sel.collapse(startPos.node, startPos.offset), "apply")
          });
        }
        if (selection.start !== selection.end) {
          strategies.push({
            name: "addRange",
            apply: /* @__PURE__ */ __name(() => sel.addRange(range), "apply")
          });
        }
        for (const strategy of strategies) {
          try {
            sel.removeAllRanges();
            strategy.apply();
          } catch {
            continue;
          }
          observed = this._readLiveSelection();
          if (observed) {
            selectionReadStrategy = this._liveSelectionEndpoints(
              this._exposedLiveSelection()
            )?.strategy || null;
          }
          if (!observed) {
            if (strictDocumentRestore && candidate.channel === "document" && strategy.name === "setBaseAndExtent") {
              opaqueDocumentWrite = {
                actual: {
                  start: Math.min(selection.start, selection.end),
                  end: Math.max(selection.start, selection.end),
                  direction: selection.direction === "backward" ? "backward" : "forward"
                },
                selectionChannel: candidate.channel,
                selectionStrategy: strategy.name
              };
              break;
            }
            continue;
          }
          if (strictDocumentRestore && (observed.start !== Math.min(selection.start, selection.end) || observed.end !== Math.max(selection.start, selection.end))) continue;
          actual = observed;
          selectionChannel = candidate.channel;
          selectionStrategy = strategy.name;
          selectionVerification = "read-back";
          break;
        }
        if (actual) break;
      }
      if (!actual) {
        const deferDocumentRestore = options.deferDocumentRestore ?? strictDocumentRestore;
        if (deferDocumentRestore && deferredAttempt < 2 && this.isConnected) {
          this.api._debug(2, "live.selection.restore-deferred", {
            requested: { ...selection },
            deferredAttempt: deferredAttempt + 1,
            observed,
            selectionChannels: candidates.map((candidate) => candidate.channel)
          });
          requestAnimationFrame(() => {
            if (requestId !== this._selectionRestoreRequest) return;
            this._restoreLiveSelection(selection, {
              deferredAttempt: deferredAttempt + 1,
              deferDocumentRestore,
              requestId,
              strictDocumentRestore
            });
          });
          return;
        }
        if (strictDocumentRestore && opaqueDocumentWrite) {
          actual = opaqueDocumentWrite.actual;
          selectionChannel = opaqueDocumentWrite.selectionChannel;
          selectionStrategy = opaqueDocumentWrite.selectionStrategy;
          selectionVerification = "write-only";
        }
      }
      if (!actual) {
        if (this.api.isAppleWebKitRuntime()) {
          this._liveSelectionAPI = true;
          this._fallbackEditable = null;
          this._fallbackSelectionPending = false;
          this._liveEditor.contentEditable = this.api._lineEditable();
          this.api._syncLiveEditingHosts();
          this.api._debug(1, "live.selection.native-preserved", {
            requested: { ...selection },
            reason: candidates.length ? "selection-verification-failed" : "selection-api-unavailable",
            deferredAttempt,
            observed,
            selectionChannels: candidates.map((candidate) => candidate.channel)
          });
          return;
        }
        this.api._debug(1, "live.selection.restore-fallback", {
          requested: { ...selection },
          reason: candidates.length ? "selection-verification-failed" : "selection-api-unavailable",
          deferredAttempt,
          observed,
          selectionChannels: candidates.map((candidate) => candidate.channel)
        });
        this._useFallbackLiveSelection(focusEditable || startPos.editable);
        return;
      }
      this.api._debug(2, "live.selection.restored", {
        requested: { ...selection },
        actual,
        deferredAttempt,
        focusRequired,
        selectionChannel,
        selectionReadStrategy,
        selectionStrategy,
        selectionVerification
      });
      const recoveredFromFallback = this._liveSelectionAPI === false;
      this._liveSelectionAPI = true;
      this._fallbackEditable = null;
      this._fallbackSelectionPending = false;
      if (recoveredFromFallback) {
        this._liveEditor.contentEditable = this.api._lineEditable();
        this.api._syncLiveEditingHosts();
      }
    }
    _domPositionFromSource(offset) {
      const safe = clamp(offset, 0, this._value.length);
      if (this._virtualState.active && !this.api._isSourceOffsetRendered(safe)) {
        const blocks = this._liveBlocks?.length ? this._liveBlocks : this.api._getBlocks();
        this.api._renderLiveVirtual(blocks, { anchorOffset: safe, force: true });
        this._rebuildLiveIndex();
      }
      const editables = this._liveEditables();
      if (!editables.length) return null;
      let previous = null;
      for (const el of editables) {
        const from = Number(el.dataset.from);
        const to = Number(el.dataset.to);
        if (safe < from) {
          if (!previous) return this._textPositionInElement(el, 0);
          const prevTo = Number(previous.dataset.to);
          return safe - prevTo <= from - safe ? this._textPositionInElement(previous, this._plainText(previous).length) : this._textPositionInElement(el, 0);
        }
        if (safe >= from && safe <= to) return this._textPositionInElement(el, this._displayOffsetFromSourceOffset(el, safe));
        previous = el;
      }
      return previous ? this._textPositionInElement(previous, this._plainText(previous).length) : null;
    }
    _rebuildLiveIndex() {
      const editables = [...this._liveEditor.querySelectorAll("[data-editable]")].filter((el) => Number.isFinite(Number(el.dataset.from)) && Number.isFinite(Number(el.dataset.to))).sort((a, b) => Number(a.dataset.from) - Number(b.dataset.from));
      this._liveEditablesCache = editables;
      this._liveNavigationCache = editables.filter((el) => el.dataset.editable !== "cell" && el.dataset.kind !== "horizontal-rule");
      this._liveIndexDirty = false;
    }
    _liveEditables() {
      if (this._liveIndexDirty) this._rebuildLiveIndex();
      return this._liveEditablesCache || [];
    }
    _liveNavigationEditables() {
      if (this._liveIndexDirty) this._rebuildLiveIndex();
      return this._liveNavigationCache || [];
    }
    _isLiveDomPositionConnected(pos) {
      return Boolean(pos?.node?.isConnected && pos?.editable?.isConnected && this._liveEditor?.contains(pos.editable));
    }
    _textPositionInElement(el, offset) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let remaining = clamp(offset, 0, this._plainText(el).length);
      let lastText = null;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const len = (node.nodeValue || "").length;
        lastText = node;
        if (remaining <= len) return { node, offset: remaining, editable: el };
        remaining -= len;
      }
      if (lastText) return { node: lastText, offset: (lastText.nodeValue || "").length, editable: el };
      const text = document.createTextNode("");
      el.appendChild(text);
      return { node: text, offset: 0, editable: el };
    }
    _useFallbackLiveSelection(editable) {
      this._liveSelectionAPI = false;
      this._fallbackEditable = editable || this._domPositionFromSource(this._selection.end)?.editable || null;
      this._fallbackSelectionPending = true;
      if (this._liveEditor) this._liveEditor.contentEditable = "false";
      this.api._syncLiveEditingHosts();
      this.api._debug(1, "live.selection.fallback-enabled", {
        editable: this.api._debugEditableInfo(this._fallbackEditable)
      });
      const focusTarget = this._fallbackEditable || this._liveEditor;
      focusTarget?.blur();
      try {
        focusTarget?.focus?.({ preventScroll: true });
      } catch {
        focusTarget?.focus?.();
      }
    }
    _ensureEmptyLiveEditable() {
      if (this._value.length !== 0 || !this._liveEditor) return;
      if (!this._liveEditor.querySelector("[data-editable]")) {
        const blocks = this.api._getBlocks();
        this.api._renderLiveFull(blocks);
        this._liveBlocks = blocks;
        this._rebuildLiveIndex();
      }
      this._selection = { start: 0, end: 0, direction: "none" };
      this._restoreLiveSelection(this._selection);
    }
    _activeEditableFromSelection() {
      const sel = this._exposedLiveSelection();
      if (sel) {
        const endpoints = this._liveSelectionEndpoints(sel);
        const node = endpoints?.focusNode || endpoints?.anchorNode;
        const editable = this._closestEditable(node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement);
        if (editable) return editable;
      }
      const focus = this._selection.direction === "backward" ? this._selection.start : this._selection.end;
      return this._domPositionFromSource(focus)?.editable || this._fallbackEditable;
    }
    _cellRawSource(editable) {
      const range = this._editableSourceRange(editable);
      return range && editable?.dataset?.editable === "cell" ? this._value.slice(range.from, range.to) : null;
    }
    _closestEditable(target) {
      return target instanceof Element ? target.closest("[data-editable]") : null;
    }
    _editableSourceRange(editable) {
      const from = Number(editable?.dataset?.from);
      const to = Number(editable?.dataset?.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
      return { from, to: Math.max(from, to) };
    }
    _plainText(el) {
      return (el.innerText ?? el.textContent ?? "").replace(/\u00a0/g, " ").replace(/\n+$/g, "");
    }
  };

  // src/browser/presence-geometry.ts
  var mirrorProperties = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "font-stretch",
    "font-variant",
    "font-kerning",
    "font-feature-settings",
    "font-variation-settings",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "text-align",
    "text-indent",
    "text-transform",
    "text-rendering",
    "direction",
    "unicode-bidi",
    "tab-size",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "word-break",
    "overflow-wrap",
    "white-space",
    "writing-mode"
  ];
  var longRangeLength = 1024;
  function intersect(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.left + a.width, b.left + b.width);
    const bottom = Math.min(a.top + a.height, b.top + b.height);
    return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
  }
  __name(intersect, "intersect");
  function firstCaretRect(range) {
    for (const rect of range.getClientRects()) {
      if (rect.height > 0) return rect;
    }
    return void 0;
  }
  __name(firstCaretRect, "firstCaretRect");
  function visibleSelectionRects(range, viewport, translate) {
    const selection = [];
    for (const bounds of range.getClientRects()) {
      const clipped = intersect(translate ? translate(bounds) : bounds, viewport);
      if (clipped) selection.push(clipped);
    }
    return selection;
  }
  __name(visibleSelectionRects, "visibleSelectionRects");
  function visibleOffsetWindow(viewport, offsets, rectAt) {
    const { top, height } = viewport;
    const findOffset = /* @__PURE__ */ __name((atOrAfter) => {
      let low = offsets.from;
      let high = offsets.to;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const rect = rectAt(mid);
        if (!rect) return null;
        if (atOrAfter(rect)) high = mid;
        else low = mid + 1;
      }
      return low;
    }, "findOffset");
    const from = findOffset((rect) => rect.top + rect.height >= top - height);
    const to = findOffset((rect) => rect.top >= top + 2 * height);
    return from === null || to === null ? null : { from, to };
  }
  __name(visibleOffsetWindow, "visibleOffsetWindow");
  var PresenceGeometry = class {
    static {
      __name(this, "PresenceGeometry");
    }
    options;
    mirror = null;
    mirrorText = null;
    mirrorEnd = null;
    mirrorStyle = "";
    stopped = false;
    constructor(options) {
      this.options = options;
    }
    disconnect() {
      this.stopped = true;
      this.mirror?.remove();
      this.mirror = null;
      this.mirrorText = null;
      this.mirrorEnd = null;
    }
    measure(anchor, head) {
      return this.measureBatch([{ anchor, head }])[0] ?? null;
    }
    measureBatch(cursors) {
      if (!cursors.length) return [];
      const prepared = this.prepare();
      const source = prepared?.source;
      if (prepared && source && prepared.value.length > longRangeLength && (cursors.length > 16 || cursors.some((cursor) => Math.abs(cursor.head - cursor.anchor) > longRangeLength))) {
        this.sourceVisibleOffsets(prepared, source);
      }
      return cursors.map((cursor) => prepared ? this.measurePrepared(prepared, cursor.anchor, cursor.head) : null);
    }
    prepare() {
      const { host, shell, source, live, getMode, getValue } = this.options;
      if (this.stopped || !host.isConnected || !shell.isConnected) return null;
      const mode = getMode();
      if (mode === "preview") return null;
      const surface = mode === "source" || mode === "split" ? source : live;
      if (!surface.isConnected || !surface.getClientRects().length) return null;
      const view = host.ownerDocument.defaultView;
      if (!view) return null;
      const shellBounds = shell.getBoundingClientRect();
      const bounds = surface.getBoundingClientRect();
      const scaleX = surface.offsetWidth ? bounds.width / surface.offsetWidth : 1;
      const scaleY = surface.offsetHeight ? bounds.height / surface.offsetHeight : 1;
      const shellScaleX = shell.offsetWidth ? shellBounds.width / shell.offsetWidth : 1;
      const shellScaleY = shell.offsetHeight ? shellBounds.height / shell.offsetHeight : 1;
      if (!(scaleX > 0 && scaleY > 0 && shellScaleX > 0 && shellScaleY > 0)) return null;
      let viewport = intersect({
        left: bounds.left + surface.clientLeft * scaleX,
        top: bounds.top + surface.clientTop * scaleY,
        width: surface.clientWidth * scaleX,
        height: surface.clientHeight * scaleY
      }, shellBounds);
      if (viewport) viewport = intersect(viewport, { left: 0, top: 0, width: view.innerWidth, height: view.innerHeight });
      let ancestor = surface.parentElement ?? surface.getRootNode().host;
      while (viewport && ancestor) {
        const style = view.getComputedStyle(ancestor);
        const clipX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
        const clipY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
        if (clipX || clipY) {
          const rect = ancestor.getBoundingClientRect();
          const xScale = ancestor.offsetWidth ? rect.width / ancestor.offsetWidth : 1;
          const yScale = ancestor.offsetHeight ? rect.height / ancestor.offsetHeight : 1;
          viewport = intersect(viewport, {
            left: clipX ? rect.left + ancestor.clientLeft * xScale : viewport.left,
            top: clipY ? rect.top + ancestor.clientTop * yScale : viewport.top,
            width: clipX ? ancestor.clientWidth * xScale : viewport.width,
            height: clipY ? ancestor.clientHeight * yScale : viewport.height
          });
        }
        ancestor = ancestor.parentElement ?? ancestor.getRootNode().host;
      }
      if (!viewport) return null;
      const value = getValue();
      const sourceGeometry = surface === source ? this.prepareSource(value, bounds, scaleX, scaleY) : null;
      if (surface === source && !sourceGeometry) return null;
      const editables = [];
      if (surface === live) {
        const top = viewport.top - viewport.height;
        const bottom = viewport.top + 2 * viewport.height;
        for (const element of live.querySelectorAll("[data-editable]")) {
          const from = Number(element.dataset.from);
          const to = Number(element.dataset.to);
          if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) continue;
          const rect = element.getBoundingClientRect();
          if (rect.bottom >= top && rect.top <= bottom && (rect.width || rect.height)) {
            editables.push({
              element,
              from,
              to,
              spansViewport: rect.height > 3 * viewport.height,
              visibleOffsets: void 0,
              selections: /* @__PURE__ */ new Map()
            });
          }
        }
      }
      return {
        value,
        viewport,
        source: sourceGeometry,
        editables,
        range: host.ownerDocument.createRange(),
        positions: /* @__PURE__ */ new Map(),
        carets: /* @__PURE__ */ new Map(),
        relative: /* @__PURE__ */ __name((rect) => ({ left: (rect.left - shellBounds.left) / shellScaleX, top: (rect.top - shellBounds.top) / shellScaleY, width: rect.width / shellScaleX, height: rect.height / shellScaleY }), "relative")
      };
    }
    measurePrepared(prepared, anchor, head) {
      if (!Number.isSafeInteger(anchor) || !Number.isSafeInteger(head) || anchor < 0 || head < 0 || anchor > prepared.value.length || head > prepared.value.length) return null;
      const source = prepared.source;
      const visible = source?.visibleOffsets;
      let bounds = null;
      if (!source) bounds = this.liveCaret(prepared, head);
      else if (!visible || head >= visible.from && head <= visible.to) bounds = this.sourceCaret(prepared, source, head);
      const caret = bounds ? intersect({ left: bounds.left, top: bounds.top, width: Math.max(1, bounds.width), height: bounds.height }, prepared.viewport) : null;
      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);
      const selection = from === to ? [] : source ? this.sourceSelection(prepared, source, from, to) : this.liveSelection(prepared, from, to);
      if (!caret && !selection.length) return null;
      return { caret: caret ? prepared.relative(caret) : null, selection: selection.map(prepared.relative), viewport: prepared.relative(prepared.viewport) };
    }
    prepareSource(value, sourceBounds, scaleX, scaleY) {
      const { source, host } = this.options;
      const doc = host.ownerDocument;
      const view = doc.defaultView;
      if (!view || !doc.body) return null;
      if (!this.mirror) {
        this.mirror = doc.createElement("div");
        this.mirror.setAttribute("aria-hidden", "true");
        this.mirror.inert = true;
        this.mirrorText = doc.createTextNode("");
        this.mirrorEnd = doc.createElement("span");
        this.mirrorEnd.textContent = "\u200B";
        this.mirror.append(this.mirrorText, this.mirrorEnd);
        doc.body.append(this.mirror);
      }
      const mirror = this.mirror;
      const text = this.mirrorText;
      const end = this.mirrorEnd;
      if (!text || !end) return null;
      const style = view.getComputedStyle(source);
      const signature = [source.clientWidth, source.wrap, ...mirrorProperties.map((property) => style.getPropertyValue(property))].join("");
      if (signature !== this.mirrorStyle) {
        mirror.style.cssText = "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;box-sizing:border-box;border:0;margin:0;height:auto;min-height:0;max-height:none;overflow:visible;";
        for (const property of mirrorProperties) mirror.style.setProperty(property, style.getPropertyValue(property));
        mirror.style.width = `${source.clientWidth}px`;
        mirror.style.whiteSpace = source.wrap === "off" ? "pre" : "pre-wrap";
        mirror.style.overflowWrap = source.wrap === "off" ? "normal" : "break-word";
        this.mirrorStyle = signature;
      }
      if (text.data !== value) text.data = value;
      const mirrorBounds = mirror.getBoundingClientRect();
      const mirrorScaleX = mirror.offsetWidth ? mirrorBounds.width / mirror.offsetWidth : 1;
      const mirrorScaleY = mirror.offsetHeight ? mirrorBounds.height / mirror.offsetHeight : 1;
      const left = sourceBounds.left + (source.clientLeft - source.scrollLeft) * scaleX;
      const top = sourceBounds.top + (source.clientTop - source.scrollTop) * scaleY;
      return {
        text,
        end,
        horizontal: style.writingMode === "horizontal-tb",
        visibleOffsets: void 0,
        selections: /* @__PURE__ */ new Map(),
        translate: /* @__PURE__ */ __name((rect) => ({
          left: left + (rect.left - mirrorBounds.left) / mirrorScaleX * scaleX,
          top: top + (rect.top - mirrorBounds.top) / mirrorScaleY * scaleY,
          width: rect.width / mirrorScaleX * scaleX,
          height: rect.height / mirrorScaleY * scaleY
        }), "translate")
      };
    }
    sourceCaret(prepared, source, offset) {
      const previous = prepared.carets.get(offset);
      if (previous !== void 0) return previous;
      prepared.range.setStart(source.text, offset);
      prepared.range.collapse(true);
      const bounds = offset === prepared.value.length ? source.end.getBoundingClientRect() : firstCaretRect(prepared.range);
      const caret = bounds && bounds.height > 0 ? source.translate(bounds) : null;
      prepared.carets.set(offset, caret);
      return caret;
    }
    sourceVisibleOffsets(prepared, source) {
      if (source.visibleOffsets !== void 0) return source.visibleOffsets;
      if (!source.horizontal) {
        source.visibleOffsets = null;
        return null;
      }
      source.visibleOffsets = visibleOffsetWindow(
        prepared.viewport,
        { from: 0, to: prepared.value.length },
        (offset) => this.sourceCaret(prepared, source, offset) ?? this.sourceRow(prepared.range, source, offset)
      );
      return source.visibleOffsets;
    }
    sourceRow(range, source, offset) {
      range.setStart(source.text, offset);
      range.setEnd(source.text, offset + 1);
      const bounds = firstCaretRect(range);
      return bounds ? source.translate(bounds) : null;
    }
    sourceSelection(prepared, source, from, to) {
      if (source.visibleOffsets) {
        from = Math.max(from, source.visibleOffsets.from);
        to = Math.min(to, source.visibleOffsets.to);
      }
      if (to <= from) return [];
      const key = `${from}:${to}`;
      const previous = source.selections.get(key);
      if (previous !== void 0) return previous;
      prepared.range.setStart(source.text, from);
      prepared.range.setEnd(source.text, to);
      const selection = visibleSelectionRects(prepared.range, prepared.viewport, source.translate);
      source.selections.set(key, selection);
      return selection;
    }
    position(prepared, offset, editable) {
      const mounted = editable ?? prepared.editables.find((item) => {
        const offsets = item.visibleOffsets ?? item;
        return offset >= offsets.from && offset <= offsets.to;
      });
      if (!mounted) return null;
      let position = prepared.positions.get(offset);
      if (position === void 0) {
        position = this.options.domPositionFromSource(offset);
        prepared.positions.set(offset, position);
      }
      if (position && position.node.isConnected && this.options.live.contains(position.node) && (!editable || editable.element.contains(position.node))) return position;
      if (editable && (offset === editable.from || offset === editable.to)) {
        return { node: editable.element, offset: offset === editable.from ? 0 : editable.element.childNodes.length, editable: editable.element };
      }
      return null;
    }
    liveCaret(prepared, head) {
      const previous = prepared.carets.get(head);
      if (previous !== void 0) return previous;
      const focus = this.position(prepared, head);
      let caret = null;
      if (focus) {
        let bounds = this.collapsedLiveRect(prepared.range, focus);
        if (!bounds && !focus.editable.textContent) bounds = focus.editable.querySelector("br")?.getBoundingClientRect() ?? null;
        if (bounds && bounds.height > 0) caret = bounds;
      }
      prepared.carets.set(head, caret);
      return caret;
    }
    liveSelection(prepared, from, to) {
      const selection = [];
      const seen = /* @__PURE__ */ new Set();
      for (const editable of prepared.editables) {
        let start = Math.max(from, editable.from);
        let end = Math.min(to, editable.to);
        if (editable.spansViewport && end - start > longRangeLength && editable.visibleOffsets === void 0) {
          const style = editable.element.ownerDocument.defaultView?.getComputedStyle(editable.element);
          editable.visibleOffsets = style?.writingMode === "horizontal-tb" ? visibleOffsetWindow(prepared.viewport, editable, (offset) => {
            const position = this.position(prepared, offset, editable);
            return position ? this.collapsedLiveRect(prepared.range, position) : null;
          }) : null;
        }
        if (editable.visibleOffsets) {
          start = Math.max(start, editable.visibleOffsets.from);
          end = Math.min(end, editable.visibleOffsets.to);
        }
        if (end <= start) continue;
        for (const rect of this.liveSelectionFragment(prepared, editable, start, end)) {
          const key = `${rect.left}:${rect.top}:${rect.width}:${rect.height}`;
          if (seen.has(key)) continue;
          seen.add(key);
          selection.push(rect);
        }
      }
      return selection;
    }
    collapsedLiveRect(range, position) {
      try {
        range.setStart(position.node, position.offset);
        range.collapse(true);
        return firstCaretRect(range) ?? null;
      } catch {
        return null;
      }
    }
    liveSelectionFragment(prepared, editable, start, end) {
      const key = `${start}:${end}`;
      const previous = editable.selections.get(key);
      if (previous !== void 0) return previous;
      const first = this.position(prepared, start, editable);
      const last = this.position(prepared, end, editable);
      let selection = [];
      if (first && last) {
        try {
          prepared.range.setStart(first.node, first.offset);
          prepared.range.setEnd(last.node, last.offset);
          selection = visibleSelectionRects(prepared.range, prepared.viewport);
        } catch {
        }
      }
      editable.selections.set(key, selection);
      return selection;
    }
  };

  // src/browser/presence.ts
  var labelLifetime = 1600;
  var motionDuration = 90;
  var defaultTtl = 3e4;
  var maximumTtl = 3e5;
  var tombstoneLifetime = 3e5;
  var tombstoneLimit = 256;
  function failure(reason, id) {
    return { ok: false, reason, ...id === void 0 ? {} : { id } };
  }
  __name(failure, "failure");
  function validId(value) {
    return typeof value === "string" && Boolean(value.trim()) && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value);
  }
  __name(validId, "validId");
  function parseCursorBatch(input, length) {
    try {
      if (!Array.isArray(input)) return { ok: false, reason: "invalid-cursor" };
      const items = input;
      const count = items.length;
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return { ok: false, reason: "invalid-cursor" };
      if (count > 64) return { ok: false, reason: "capacity-exceeded" };
      const ids = /* @__PURE__ */ new Set();
      const result = [];
      for (let index = 0; index < count; index++) {
        const item = items[index];
        if (!item || typeof item !== "object") return { ok: false, reason: "invalid-cursor" };
        const value = item;
        const { id, name, color, anchor, head, active, epoch, sequence, ttlMs } = value;
        if (!validId(id)) return { ok: false, reason: "invalid-cursor" };
        if (ids.has(id)) return { ok: false, reason: "duplicate-id", id };
        const invalid = /* @__PURE__ */ __name(() => ({ ok: false, reason: "invalid-cursor", id }), "invalid");
        if (typeof name !== "string" || !name.trim() || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return invalid();
        if (typeof color !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) return invalid();
        if (typeof anchor !== "number" || typeof head !== "number" || !Number.isSafeInteger(anchor) || !Number.isSafeInteger(head) || anchor < 0 || head < 0 || anchor > length || head > length) return invalid();
        if (active !== void 0 && typeof active !== "boolean") return invalid();
        if (epoch === void 0 !== (sequence === void 0)) return invalid();
        if (epoch !== void 0 && (typeof epoch !== "number" || !Number.isSafeInteger(epoch) || epoch < 0 || typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 0)) return invalid();
        if (ttlMs !== void 0 && (typeof ttlMs !== "number" || !Number.isSafeInteger(ttlMs) || ttlMs < 0 || ttlMs > maximumTtl)) return invalid();
        ids.add(id);
        result.push({ id, name, color, anchor, head, ...active === void 0 ? {} : { active }, ...epoch === void 0 ? {} : { epoch, sequence }, ...ttlMs === void 0 ? {} : { ttlMs } });
      }
      if (items.length !== count) return { ok: false, reason: "invalid-cursor" };
      return { ok: true, cursors: result };
    } catch {
      return { ok: false, reason: "invalid-cursor" };
    }
  }
  __name(parseCursorBatch, "parseCursorBatch");
  function sameContent(a, b) {
    return a.id === b.id && a.name === b.name && a.color === b.color && a.anchor === b.anchor && a.head === b.head && a.active !== false === (b.active !== false) && (a.ttlMs ?? defaultTtl) === (b.ttlMs ?? defaultTtl);
  }
  __name(sameContent, "sameContent");
  function sameVersion(a, b) {
    return a.epoch === b.epoch && a.sequence === b.sequence;
  }
  __name(sameVersion, "sameVersion");
  function orderCursor(cursor, reference, removed) {
    if (reference.epoch === void 0) return null;
    if (cursor.epoch === void 0 || cursor.sequence === void 0) return "stale-cursor";
    const order = cursor.epoch - reference.epoch || cursor.sequence - (reference.sequence ?? 0);
    if (order < 0 || order === 0 && removed) return "stale-cursor";
    if (order === 0 && !sameContent(cursor, reference)) return "version-conflict";
    return null;
  }
  __name(orderCursor, "orderCursor");
  function mapRemoteCursors(cursors, changes, length) {
    return cursors.map((cursor) => {
      const backward = cursor.anchor > cursor.head;
      const mapped = mapTransactionSelection({
        start: Math.min(cursor.anchor, cursor.head),
        end: Math.max(cursor.anchor, cursor.head),
        direction: backward ? "backward" : cursor.anchor === cursor.head ? "none" : "forward"
      }, changes);
      const start = Math.min(length, Math.max(0, mapped.start));
      const end = Math.min(length, Math.max(0, mapped.end));
      return { ...cursor, anchor: backward ? end : start, head: backward ? start : end };
    });
  }
  __name(mapRemoteCursors, "mapRemoteCursors");
  function presenceEase(progress) {
    const x = Math.min(1, Math.max(0, progress));
    if (x === 0 || x === 1) return x;
    let lower = 0;
    let upper = 1;
    for (let index = 0; index < 18; index++) {
      const t2 = (lower + upper) / 2;
      const curveX = 0.6 * (1 - t2) * (1 - t2) * t2 + t2 * t2 * t2;
      if (curveX < x) lower = t2;
      else upper = t2;
    }
    const t = (lower + upper) / 2;
    return 3 * (1 - t) * t * t + t * t * t;
  }
  __name(presenceEase, "presenceEase");
  function presenceLabelForeground(color) {
    const digits = color.length === 4 ? color.slice(1).split("").map((character) => character + character).join("") : color.slice(1);
    const channel = /* @__PURE__ */ __name((offset) => {
      const value = Number.parseInt(digits.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }, "channel");
    const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
  }
  __name(presenceLabelForeground, "presenceLabelForeground");
  function sameViewport(a, b) {
    return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
  }
  __name(sameViewport, "sameViewport");
  function overlap(a, b) {
    return a.left < b.left + b.width + 4 && a.left + a.width + 4 > b.left && a.top < b.top + b.height + 2 && a.top + a.height + 2 > b.top;
  }
  __name(overlap, "overlap");
  var PresenceController = class {
    static {
      __name(this, "PresenceController");
    }
    geometry;
    geometryStopped = false;
    hooks;
    overlay;
    roster;
    entries = /* @__PURE__ */ new Map();
    tombstones = /* @__PURE__ */ new Map();
    view;
    reducedMotion;
    cleanups = [];
    resizeObserver = null;
    mutationObserver = null;
    frame = null;
    layoutFrame = null;
    fadeTimer = null;
    expiryTimer = null;
    connected = false;
    lastMode = "";
    generation = 0;
    anchorClock = 0;
    showNames = false;
    hovered = null;
    lineValue = null;
    lineStarts = [0];
    constructor(hooks) {
      this.hooks = hooks;
      const view = hooks.host.ownerDocument.defaultView;
      if (!view) throw new Error("Presence needs a window.");
      this.view = view;
      this.geometry = new PresenceGeometry(hooks);
      const doc = hooks.host.ownerDocument;
      this.overlay = doc.createElement("div");
      this.overlay.className = "remote-presence";
      this.overlay.setAttribute("aria-hidden", "true");
      Object.assign(this.overlay.style, { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden" });
      this.roster = doc.createElement("ul");
      this.roster.className = "remote-presence-roster";
      this.roster.setAttribute("aria-label", "Remote cursors");
      this.reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)");
    }
    set(cursors, options = {}) {
      return this.apply(() => {
        if (!options || typeof options !== "object" || Array.isArray(options)) return null;
        return { cursors, replace: true, baseRevision: options.baseRevision, animate: options.animate, showNames: options.showNames };
      }).ok;
    }
    update(update) {
      return this.apply(() => update);
    }
    apply(read) {
      const revision = this.hooks.getRevision();
      const generation = this.generation;
      const length = this.hooks.getValue().length;
      let parsed = { ok: false, reason: "invalid-update" };
      let remove = [];
      let replace;
      let baseRevision;
      let animate;
      let showNames;
      let invalid = null;
      try {
        const input = read();
        if (!input || typeof input !== "object" || Array.isArray(input)) invalid = failure("invalid-update");
        else {
          const value = input;
          const cursors = value.cursors;
          const removals = value.remove;
          replace = value.replace;
          baseRevision = value.baseRevision;
          animate = value.animate;
          showNames = value.showNames;
          parsed = parseCursorBatch(cursors, Number.MAX_SAFE_INTEGER);
          if (removals !== void 0) {
            if (!Array.isArray(removals)) invalid = failure("invalid-remove");
            else {
              const ids2 = removals;
              const count2 = ids2.length;
              if (typeof count2 !== "number" || !Number.isSafeInteger(count2) || count2 < 0 || count2 > 64) invalid = failure("invalid-remove");
              else {
                const seen = /* @__PURE__ */ new Set();
                for (let index = 0; index < count2; index++) {
                  const id = ids2[index];
                  if (!validId(id) || seen.has(id)) {
                    invalid = failure("invalid-remove", typeof id === "string" ? id : void 0);
                    break;
                  }
                  seen.add(id);
                  remove.push(id);
                }
                if (ids2.length !== count2) invalid = failure("invalid-remove");
              }
            }
          }
        }
      } catch {
        invalid = failure("invalid-update");
      }
      if (this.generation !== generation || this.hooks.getRevision() !== revision) return failure("reentrant-change");
      if (invalid) return invalid;
      if (!parsed.ok) return failure(parsed.reason, parsed.id);
      if (replace !== void 0 && typeof replace !== "boolean" || animate !== void 0 && typeof animate !== "boolean" || showNames !== void 0 && typeof showNames !== "boolean") return failure("invalid-update");
      if (baseRevision !== void 0 && (typeof baseRevision !== "number" || !Number.isSafeInteger(baseRevision) || baseRevision < 0)) return failure("invalid-update");
      if (baseRevision !== void 0 && baseRevision !== revision) return failure("stale-revision");
      if (!this.hooks.host.isConnected) return failure("not-connected");
      const now2 = this.now();
      const incoming = parsed.cursors;
      const ids = new Set(incoming.map((cursor) => cursor.id));
      for (const id of remove) if (ids.has(id)) return failure("invalid-update", id);
      let count = replace ? 0 : Array.from(this.entries.values()).filter((entry) => entry.expiresAt > now2 && !remove.includes(entry.data.id)).length;
      for (const cursor of incoming) {
        const current = this.entries.get(cursor.id);
        const tombstone = this.tombstones.get(cursor.id);
        const expired = Boolean(current && current.expiresAt <= now2);
        const reference = (current && (!expired || now2 - current.expiresAt < tombstoneLifetime) ? current.wire : null) ?? (tombstone && now2 - tombstone.removedAt < tombstoneLifetime ? tombstone.wire : null);
        if (reference) {
          const reason = orderCursor(cursor, reference, expired || !current);
          if (reason) return failure(reason, cursor.id);
        }
        const heartbeat = cursor.epoch !== void 0 && current && !expired && sameVersion(cursor, current.wire) && sameContent(cursor, current.wire);
        if ((cursor.anchor > length || cursor.head > length) && !heartbeat) return failure("invalid-cursor", cursor.id);
        if (replace || !current || expired || remove.includes(cursor.id)) count += 1;
      }
      if (count > 64) return failure("capacity-exceeded");
      this.generation += 1;
      this.pruneTombstones(now2);
      let changed = this.expireEntries(now2);
      let moved = false;
      for (const [id] of this.entries) {
        if (remove.includes(id) || replace === true && !ids.has(id)) {
          this.removeEntry(id, now2);
          changed = true;
        }
      }
      for (const cursor of incoming) {
        const current = this.entries.get(cursor.id);
        if (!current) {
          this.tombstones.delete(cursor.id);
          this.entries.set(cursor.id, this.createEntry(cursor, now2));
          changed = true;
          moved = true;
        } else {
          const heartbeat = cursor.epoch !== void 0 && sameVersion(cursor, current.wire) && sameContent(cursor, current.wire);
          current.expiresAt = this.expiry(cursor, now2);
          if (heartbeat) {
            current.data = { ...cursor, anchor: current.data.anchor, head: current.data.head };
            current.wire = { ...cursor };
            continue;
          }
          const positionChanged = current.data.anchor !== cursor.anchor || current.data.head !== cursor.head;
          if (positionChanged && this.hovered === cursor.id) this.hovered = null;
          const nameChanged = current.data.name !== cursor.name;
          const identityChanged = nameChanged || current.data.color !== cursor.color;
          const activeChanged = current.data.active !== false !== (cursor.active !== false);
          const revealed = current.data.active === false && cursor.active !== false || identityChanged;
          if (positionChanged || !sameVersion(cursor, current.wire)) current.anchorGeneration = ++this.anchorClock;
          if (positionChanged || revealed) {
            current.changedAt = now2;
            moved = true;
          }
          changed = changed || positionChanged || identityChanged || activeChanged;
          current.data = { ...cursor };
          current.wire = { ...cursor };
          if (nameChanged || activeChanged) current.rosterItem.textContent = cursor.name + (cursor.active === false ? " (inactive)" : "");
        }
      }
      const namesChanged = showNames !== void 0 && showNames !== this.showNames;
      if (typeof showNames === "boolean") this.showNames = showNames;
      if (!this.entries.size) {
        this.disconnect();
        return { ok: true, count: 0 };
      }
      if (!this.connected) this.connect();
      else if (changed) this.refresh(moved && animate !== false);
      else if (namesChanged) {
        this.paint(now2);
        this.armFade(now2);
      }
      this.armExpiry(now2);
      return { ok: true, count: this.entries.size };
    }
    get() {
      if (this.expireEntries(this.now()) && this.entries.size) this.scheduleLayout();
      return Array.from(this.entries.values(), (entry) => ({ ...entry.data }));
    }
    captureAnchors() {
      return Array.from(this.entries.values(), (entry) => ({ id: entry.data.id, anchor: entry.data.anchor, head: entry.data.head, generation: entry.anchorGeneration }));
    }
    restoreAnchors(snapshot) {
      const length = this.hooks.getValue().length;
      let changed = false;
      for (const saved of snapshot) {
        const entry = this.entries.get(saved.id);
        if (!entry || entry.anchorGeneration !== saved.generation) continue;
        const anchor = Math.max(0, Math.min(length, saved.anchor));
        const head = Math.max(0, Math.min(length, saved.head));
        if (entry.data.anchor === anchor && entry.data.head === head) continue;
        entry.data = { ...entry.data, anchor, head };
        if (this.hovered === entry.data.id) this.hovered = null;
        entry.motion = null;
        changed = true;
      }
      if (changed) this.generation += 1;
    }
    mapChanges(changes) {
      this.generation += 1;
      const mapped = mapRemoteCursors(Array.from(this.entries.values(), (entry) => entry.data), changes, this.hooks.getValue().length);
      for (const cursor of mapped) {
        const entry = this.entries.get(cursor.id);
        if (entry) {
          if (this.hovered === cursor.id && (entry.data.anchor !== cursor.anchor || entry.data.head !== cursor.head)) this.hovered = null;
          entry.data = cursor;
          entry.motion = null;
        }
      }
    }
    connect() {
      if (this.connected || !this.entries.size || !this.hooks.host.isConnected) return;
      this.expireEntries(this.now());
      if (!this.entries.size) return;
      this.connected = true;
      if (this.geometryStopped) {
        this.geometry = new PresenceGeometry(this.hooks);
        this.geometryStopped = false;
      }
      this.hooks.shell.append(this.overlay, this.roster);
      const schedule = /* @__PURE__ */ __name(() => this.scheduleLayout(), "schedule");
      const listen = /* @__PURE__ */ __name((target, type, callback, capture = false) => {
        target.addEventListener(type, callback, capture);
        this.cleanups.push(() => target.removeEventListener(type, callback, capture));
      }, "listen");
      const doc = this.hooks.host.ownerDocument;
      listen(this.hooks.shell, "scroll", schedule, true);
      listen(doc, "scroll", schedule, true);
      listen(this.view, "scroll", schedule, true);
      listen(this.view, "resize", schedule);
      listen(doc.fonts, "loadingdone", schedule);
      listen(doc, "visibilitychange", () => {
        if (!doc.hidden) {
          schedule();
          return;
        }
        this.stopMotion();
        if (this.layoutFrame !== null) this.view.cancelAnimationFrame(this.layoutFrame);
        this.layoutFrame = null;
      });
      listen(this.reducedMotion, "change", schedule);
      listen(this.hooks.shell, "pointermove", (event) => this.hover(event));
      listen(this.hooks.shell, "pointerleave", () => {
        if (this.hovered !== null) {
          this.hovered = null;
          this.paint(this.now());
        }
      });
      if (this.view.visualViewport) {
        listen(this.view.visualViewport, "resize", schedule);
        listen(this.view.visualViewport, "scroll", schedule);
      }
      this.resizeObserver = new ResizeObserver(schedule);
      for (const node of [this.hooks.shell, this.hooks.source, this.hooks.live]) this.resizeObserver.observe(node);
      this.mutationObserver = new MutationObserver(schedule);
      this.mutationObserver.observe(this.hooks.live, { childList: true, subtree: true, characterData: true });
      this.mutationObserver.observe(this.hooks.host, { attributes: true, attributeFilter: ["mode", "class", "style", "disabled", "hidden", "dir"] });
      for (let ancestor = this.hooks.host.parentNode; ancestor; ancestor = ancestor.parentNode ?? (ancestor instanceof ShadowRoot ? ancestor.host : null)) {
        listen(ancestor, "scroll", schedule, true);
        if (ancestor instanceof Element) {
          this.resizeObserver.observe(ancestor);
          this.mutationObserver.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "hidden", "dir"] });
        }
      }
      this.refresh(false);
      this.armExpiry(this.now());
    }
    disconnect() {
      this.connected = false;
      this.geometry.disconnect();
      this.geometryStopped = true;
      this.cleanups.splice(0).forEach((cleanup) => cleanup());
      this.resizeObserver?.disconnect();
      this.mutationObserver?.disconnect();
      this.resizeObserver = null;
      this.mutationObserver = null;
      this.stopMotion();
      if (this.layoutFrame !== null) this.view.cancelAnimationFrame(this.layoutFrame);
      if (this.fadeTimer !== null) this.view.clearTimeout(this.fadeTimer);
      if (this.expiryTimer !== null) this.view.clearTimeout(this.expiryTimer);
      this.layoutFrame = null;
      this.fadeTimer = null;
      this.expiryTimer = null;
      this.hovered = null;
      this.lineValue = null;
      this.lineStarts = [0];
      this.overlay.remove();
      this.roster.remove();
    }
    refresh(animate = false) {
      if (!this.connected) return;
      const now2 = this.now();
      this.expireEntries(now2);
      if (!this.entries.size) return;
      const layoutPending = this.layoutFrame !== null;
      if (this.layoutFrame !== null) this.view.cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = null;
      const mode = this.hooks.getMode();
      const mayAnimate = animate && !layoutPending && !this.reducedMotion.matches && this.lastMode === mode;
      this.lastMode = mode;
      const entries = Array.from(this.entries.values());
      const measurements = this.geometry.measureBatch(entries.map((entry) => entry.data));
      const labelMetrics = [];
      this.indexLines(this.hooks.getValue());
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        this.advance(entry, now2);
        const previous = entry.measurement;
        const measurement = measurements[index] ?? null;
        entry.measurement = measurement;
        const caret = measurement?.caret;
        if (this.hovered === entry.data.id && (!caret || !previous?.caret || Math.abs(caret.left - previous.caret.left) > 0.5 || Math.abs(caret.top - previous.caret.top) > 0.5 || measurement && !sameViewport(previous.viewport, measurement.viewport))) this.hovered = null;
        entry.cursor.hidden = !caret;
        const color = entry.data.color.length === 4 ? "#" + entry.data.color.slice(1).split("").map((character) => character + character).join("") : entry.data.color;
        entry.cursor.style.setProperty("--remote-color", color);
        entry.cursor.style.setProperty("--remote-label-fg", presenceLabelForeground(color));
        entry.cursor.style.opacity = entry.data.active === false ? "0.4" : "1";
        const rectangles = measurement?.selection.slice(0, 256) ?? [];
        this.syncSelections(entry, rectangles, color, previous?.selection);
        if (!measurement || !caret) {
          entry.motion = null;
          entry.label.style.visibility = "hidden";
          entry.label.style.opacity = "0";
          continue;
        }
        entry.caret.style.height = `${caret.height}px`;
        if (entry.label.textContent !== entry.data.name) entry.label.textContent = entry.data.name;
        entry.label.style.maxWidth = `${Math.max(0, Math.min(140, measurement.viewport.width))}px`;
        entry.label.style.transition = this.reducedMotion.matches ? "none" : "opacity 120ms linear";
        labelMetrics.push(entry);
        const logicalRow = this.logicalRow(entry.data.head);
        const sameRow = previous?.caret && logicalRow === entry.logicalRow && Math.abs(previous.caret.top - caret.top) <= 1 && Math.abs(previous.caret.height - caret.height) <= 1 && sameViewport(previous.viewport, measurement.viewport);
        entry.logicalRow = logicalRow;
        const distance = Math.abs(entry.x - caret.left);
        entry.y = caret.top;
        if (mayAnimate && sameRow && distance > 0.5 && distance < 100) entry.motion = { from: entry.x, to: caret.left, started: now2 };
        else {
          entry.x = caret.left;
          entry.motion = null;
        }
      }
      for (const entry of labelMetrics) {
        entry.labelWidth = entry.label.offsetWidth || 100;
        entry.labelHeight = entry.label.offsetHeight || 19;
      }
      this.paint(now2);
      this.armFade(now2);
      this.armFrame();
    }
    now() {
      return this.view.performance.now();
    }
    expiry(cursor, now2) {
      return cursor.ttlMs === 0 ? Infinity : now2 + (cursor.ttlMs ?? defaultTtl);
    }
    createEntry(data, now2) {
      const doc = this.overlay.ownerDocument;
      const cursor = doc.createElement("div");
      cursor.className = "remote-presence-cursor";
      cursor.setAttribute("part", "remote-cursor");
      Object.assign(cursor.style, { position: "absolute", pointerEvents: "none", left: "0", top: "0" });
      const caret = doc.createElement("div");
      caret.className = "remote-presence-caret";
      caret.setAttribute("part", "remote-caret");
      Object.assign(caret.style, { position: "absolute", width: "2px", left: "0", top: "0" });
      const label = doc.createElement("span");
      label.className = "remote-presence-name";
      label.setAttribute("part", "remote-name");
      Object.assign(label.style, { position: "absolute", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none", opacity: "0", visibility: "hidden" });
      const rosterItem = doc.createElement("li");
      rosterItem.textContent = data.name + (data.active === false ? " (inactive)" : "");
      this.roster.append(rosterItem);
      cursor.append(caret, label);
      this.overlay.append(cursor);
      return { data: { ...data }, wire: { ...data }, cursor, caret, label, rosterItem, selections: [], changedAt: now2, expiresAt: this.expiry(data, now2), anchorGeneration: ++this.anchorClock, measurement: null, x: 0, y: 0, motion: null, logicalRow: -1, labelWidth: 100, labelHeight: 19 };
    }
    syncSelections(entry, rectangles, color, previous) {
      const tint = color + (entry.data.active === false ? "14" : "24");
      for (let index = 0; index < Math.max(rectangles.length, entry.selections.length); index++) {
        const rectangle = rectangles[index];
        let node = entry.selections[index];
        if (!node && rectangle) {
          node = this.overlay.ownerDocument.createElement("div");
          node.className = "remote-presence-selection";
          node.setAttribute("part", "remote-selection");
          Object.assign(node.style, { position: "absolute", pointerEvents: "none" });
          this.overlay.insertBefore(node, this.overlay.firstChild);
          entry.selections.push(node);
        }
        if (!node) continue;
        const hidden = !rectangle;
        if (node.hidden !== hidden) node.hidden = hidden;
        if (!rectangle) continue;
        if (node.style.getPropertyValue("--remote-selection-color") !== tint) node.style.setProperty("--remote-selection-color", tint);
        const old = previous?.[index];
        if (old && old.left === rectangle.left && old.top === rectangle.top && old.width === rectangle.width && old.height === rectangle.height) continue;
        Object.assign(node.style, { left: `${rectangle.left}px`, top: `${rectangle.top}px`, width: `${rectangle.width}px`, height: `${rectangle.height}px` });
      }
    }
    indexLines(value) {
      if (value === this.lineValue) return;
      this.lineValue = value;
      this.lineStarts = [0];
      for (let offset = value.indexOf("\n"); offset !== -1; offset = value.indexOf("\n", offset + 1)) this.lineStarts.push(offset + 1);
    }
    logicalRow(offset) {
      let lower = 0;
      let upper = this.lineStarts.length;
      while (lower < upper) {
        const middle = lower + upper >>> 1;
        if (this.lineStarts[middle] <= offset) lower = middle + 1;
        else upper = middle;
      }
      return lower;
    }
    advance(entry, now2) {
      if (!entry.motion) return;
      const progress = (now2 - entry.motion.started) / motionDuration;
      entry.x = entry.motion.from + (entry.motion.to - entry.motion.from) * presenceEase(progress);
      if (progress >= 1) {
        entry.x = entry.motion.to;
        entry.motion = null;
      }
    }
    paint(now2) {
      const occupied = [];
      const sorted = Array.from(this.entries.values()).sort((a, b) => Number(b.data.id === this.hovered) - Number(a.data.id === this.hovered) || Number(a.data.active === false) - Number(b.data.active === false) || (a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0));
      for (const entry of sorted) {
        const measured = entry.measurement;
        if (!measured?.caret) continue;
        this.advance(entry, now2);
        entry.cursor.style.transform = `translate3d(${entry.x}px, ${entry.y}px, 0)`;
        const visible = this.showNames || this.hovered === entry.data.id || entry.data.active !== false && now2 - entry.changedAt < labelLifetime;
        const width = Math.min(measured.viewport.width, entry.labelWidth);
        const height = Math.min(measured.viewport.height, entry.labelHeight);
        const left = Math.max(measured.viewport.left, Math.min(entry.x, measured.viewport.left + measured.viewport.width - width));
        let chosen = null;
        if (visible && width > 0 && height > 0) {
          for (let lane = 0; lane < 4; lane++) {
            const top = Math.max(measured.viewport.top, entry.y - height - 2 - lane * (height + 2));
            const candidate = { left, top, width, height };
            if (top + height <= measured.viewport.top + measured.viewport.height && !occupied.some((rect) => overlap(rect, candidate))) {
              chosen = candidate;
              break;
            }
          }
        }
        if (chosen) {
          occupied.push(chosen);
          entry.label.style.left = `${chosen.left - entry.x}px`;
          entry.label.style.top = `${chosen.top - entry.y}px`;
          entry.label.style.visibility = "visible";
          entry.label.style.opacity = "1";
        } else {
          if (visible || entry.data.active === false) entry.label.style.visibility = "hidden";
          entry.label.style.opacity = "0";
        }
      }
    }
    hover(event) {
      const bounds = this.hooks.shell.getBoundingClientRect();
      const scaleX = bounds.width ? this.hooks.shell.offsetWidth / bounds.width : 1;
      const scaleY = bounds.height ? this.hooks.shell.offsetHeight / bounds.height : 1;
      const x = (event.clientX - bounds.left) * scaleX;
      const y = (event.clientY - bounds.top) * scaleY;
      let found = null;
      let nearest = Infinity;
      for (const entry of this.entries.values()) {
        const caret = entry.measurement?.caret;
        if (!caret) continue;
        const distance = Math.abs(x - entry.x);
        if (distance <= 7 && y >= entry.y - 4 && y <= entry.y + caret.height + 4 && distance < nearest) {
          nearest = distance;
          found = entry.data.id;
        }
      }
      if (found === this.hovered) return;
      this.hovered = found;
      this.paint(this.now());
    }
    armFrame() {
      if (this.frame !== null || !this.connected || !Array.from(this.entries.values()).some((entry) => entry.motion)) return;
      this.frame = this.view.requestAnimationFrame(() => {
        this.frame = null;
        this.paint(this.now());
        this.armFrame();
      });
    }
    armFade(now2) {
      if (this.fadeTimer !== null) this.view.clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
      if (this.showNames) return;
      const remaining = Array.from(this.entries.values()).filter((entry) => entry.data.active !== false).map((entry) => entry.changedAt + labelLifetime - now2).filter((delay) => delay > 0);
      if (!remaining.length) return;
      this.fadeTimer = this.view.setTimeout(() => {
        this.fadeTimer = null;
        this.paint(this.now());
        this.armFade(this.now());
      }, Math.min(...remaining) + 1);
    }
    armExpiry(now2) {
      if (this.expiryTimer !== null) this.view.clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
      if (!this.connected) return;
      const remaining = Array.from(this.entries.values()).map((entry) => entry.expiresAt - now2).filter(Number.isFinite);
      if (!remaining.length) return;
      this.expiryTimer = this.view.setTimeout(() => {
        this.expiryTimer = null;
        const changed = this.expireEntries(this.now());
        if (changed && this.entries.size) this.refresh(false);
        this.armExpiry(this.now());
      }, Math.max(0, Math.min(...remaining)) + 1);
    }
    removeEntry(id, now2) {
      const entry = this.entries.get(id);
      if (!entry) return;
      if (entry.wire.epoch !== void 0) {
        this.tombstones.delete(id);
        this.tombstones.set(id, { wire: { ...entry.wire }, removedAt: now2 });
      }
      entry.cursor.remove();
      entry.rosterItem.remove();
      entry.selections.forEach((rectangle) => rectangle.remove());
      this.entries.delete(id);
      if (this.hovered === id) this.hovered = null;
      this.pruneTombstones(now2);
    }
    pruneTombstones(now2) {
      for (const [id, tombstone] of this.tombstones) if (now2 - tombstone.removedAt >= tombstoneLifetime) this.tombstones.delete(id);
      while (this.tombstones.size > tombstoneLimit) {
        const oldest = this.tombstones.keys().next().value;
        if (oldest === void 0) break;
        this.tombstones.delete(oldest);
      }
    }
    expireEntries(now2) {
      let changed = false;
      for (const [id, entry] of this.entries) if (entry.expiresAt <= now2) {
        this.removeEntry(id, Math.min(now2, entry.expiresAt));
        changed = true;
      }
      if (!changed) return false;
      this.generation += 1;
      if (!this.entries.size) this.disconnect();
      return true;
    }
    stopMotion() {
      if (this.frame !== null) this.view.cancelAnimationFrame(this.frame);
      this.frame = null;
      for (const entry of this.entries.values()) entry.motion = null;
    }
    scheduleLayout() {
      if (!this.connected) return;
      this.stopMotion();
      this.hovered = null;
      if (this.layoutFrame !== null) return;
      this.layoutFrame = this.view.requestAnimationFrame(() => {
        this.layoutFrame = null;
        this.refresh(false);
      });
    }
  };

  // src/markdown/block-syntax.ts
  function getSelectedLineRanges(value, selectionStart, selectionEnd, opts = {}) {
    const startLine = getLineRange(value, selectionStart);
    const endProbe = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
    const endLine = getLineRange(value, endProbe);
    const out = [];
    let cursor = startLine.start;
    while (cursor <= endLine.start) {
      const line = getLineRange(value, cursor);
      out.push(makeLineInfo(line.start, line.end, line.text, opts));
      if (line.end >= value.length) break;
      cursor = line.end + 1;
    }
    return out;
  }
  __name(getSelectedLineRanges, "getSelectedLineRanges");
  function makeLineInfo(start, end, text, opts = {}) {
    const indent = (/^(\s*)/.exec(text) || ["", ""])[1];
    const list = parseListItem(text, opts);
    const contentStart = list ? start + list.contentStart : start + indent.length;
    return { start, end, text, indent, marker: list?.markerText ?? null, contentStart };
  }
  __name(makeLineInfo, "makeLineInfo");
  function usesGfm(opts = {}) {
    return opts.gfm ?? opts.markdownFlavor !== "commonmark";
  }
  __name(usesGfm, "usesGfm");
  function parseListItem(line, opts = {}) {
    if (usesGfm(opts)) {
      const task = /^(\s*)([-+*])(\s+)\[( |x|X)\](\s+)(.*)$/.exec(line);
      if (task) {
        const markerText = `${task[2] ?? ""}${task[3] ?? ""}[${task[4] ?? ""}]${task[5] ?? ""}`;
        return { kind: "task-list-item", listType: "ul", indent: task[1] ?? "", marker: task[2] ?? "", markerText, checked: (task[4] ?? "").toLowerCase() === "x", content: task[6] ?? "", contentStart: (task[1] ?? "").length + markerText.length, fullMarkerStart: (task[1] ?? "").length, fullMarkerEnd: (task[1] ?? "").length + markerText.length };
      }
    }
    const ordered = /^(\s*)(\d+)([.)])(\s+)(.*)$/.exec(line);
    if (ordered) {
      const markerText = `${ordered[2] ?? ""}${ordered[3] ?? ""}${ordered[4] ?? ""}`;
      return { kind: "ordered-list-item", listType: "ol", indent: ordered[1] ?? "", marker: ordered[2] ?? "", number: Number(ordered[2] ?? ""), delimiter: ordered[3] ?? "", markerText, content: ordered[5] ?? "", contentStart: (ordered[1] ?? "").length + markerText.length, fullMarkerStart: (ordered[1] ?? "").length, fullMarkerEnd: (ordered[1] ?? "").length + markerText.length };
    }
    const bullet = /^(\s*)([-+*])(\s+)(.*)$/.exec(line);
    if (bullet) {
      const markerText = `${bullet[2] ?? ""}${bullet[3] ?? ""}`;
      return { kind: "bullet-list-item", listType: "ul", indent: bullet[1] ?? "", marker: bullet[2] ?? "", markerText, content: bullet[4] ?? "", contentStart: (bullet[1] ?? "").length + markerText.length, fullMarkerStart: (bullet[1] ?? "").length, fullMarkerEnd: (bullet[1] ?? "").length + markerText.length };
    }
    return null;
  }
  __name(parseListItem, "parseListItem");
  function parseHeading(line) {
    const m = /^(\s{0,3})(#{1,6})([ \t]+)(.*)$/.exec(line);
    if (!m) return null;
    let content = m[4] ?? "";
    if (/^#+[ \t]*$/.test(content)) content = "";
    else {
      const closing = /^(.*?)[ \t]+#+[ \t]*$/.exec(content);
      content = closing ? closing[1] ?? "" : content.replace(/[ \t]+$/, "");
    }
    const separator = m[3] ?? "";
    return {
      indent: m[1] ?? "",
      level: (m[2] ?? "").length,
      markerText: `${m[2] ?? ""}${separator}`,
      content,
      contentStart: (m[1] ?? "").length + (m[2] ?? "").length + separator.length
    };
  }
  __name(parseHeading, "parseHeading");
  function parseBlockquote(line) {
    const m = /^(\s*>\s?)(.*)$/.exec(line);
    if (!m) return null;
    let depth = 1;
    let fullContentStart = (m[1] ?? "").length;
    let nestedContent = m[2] ?? "";
    while (true) {
      const nested = /^(\s*>\s?)(.*)$/.exec(nestedContent);
      if (!nested) break;
      depth += 1;
      fullContentStart += (nested[1] ?? "").length;
      nestedContent = nested[2] ?? "";
    }
    return {
      markerText: m[1] ?? "",
      content: m[2] ?? "",
      contentStart: (m[1] ?? "").length,
      depth,
      fullContentStart
    };
  }
  __name(parseBlockquote, "parseBlockquote");
  function isHorizontalRule(line) {
    const t = line.trim();
    return /^([-*_])(?:\s*\1){2,}\s*$/.test(t);
  }
  __name(isHorizontalRule, "isHorizontalRule");
  function getFenceInfo(line) {
    const m = /^(\s{0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
    if (!m) return null;
    const marker = (m[2] ?? "")[0] || "`";
    const info = (m[3] ?? "").trim();
    if (marker === "`" && info.includes("`")) return null;
    return { marker, length: (m[2] ?? "").length, sequence: m[2] ?? "", info, language: info.split(/[ \t]+/, 1)[0] || "" };
  }
  __name(getFenceInfo, "getFenceInfo");
  function isFenceLine(line) {
    return Boolean(getFenceInfo(line));
  }
  __name(isFenceLine, "isFenceLine");
  function isFenceCloseLine(line, opener) {
    const info = getFenceInfo(line);
    return Boolean(info && opener && info.marker === opener.marker && info.length >= opener.length && info.language === "");
  }
  __name(isFenceCloseLine, "isFenceCloseLine");
  function parseSetextHeadingLevel(line) {
    const m = /^\s{0,3}(=+|-+)\s*$/.exec(line);
    if (!m) return null;
    return (m[1] ?? "")[0] === "=" ? 1 : 2;
  }
  __name(parseSetextHeadingLevel, "parseSetextHeadingLevel");
  function isInsideInlineCode(lineBeforeCursor) {
    return (lineBeforeCursor.match(/(?<!\\)`/g) || []).length % 2 === 1;
  }
  __name(isInsideInlineCode, "isInsideInlineCode");
  function classifyLine(value, offset, lineInfo, opts = {}) {
    if (isInsideFence(value, offset)) return { kind: "fenced-code" };
    const list = parseListItem(lineInfo.text, opts);
    if (list) return { kind: list.kind, list };
    const heading = parseHeading(lineInfo.text);
    if (heading) return { kind: "heading", heading };
    const quote = parseBlockquote(lineInfo.text);
    if (quote) return { kind: "blockquote", blockquote: quote };
    if (isHorizontalRule(lineInfo.text)) return { kind: "horizontal-rule" };
    if (usesGfm(opts) && isLikelyTableRow(lineInfo.text)) return { kind: "table" };
    return { kind: "paragraph" };
  }
  __name(classifyLine, "classifyLine");
  function isInsideFence(value, offset) {
    const source = normalizeLineEndings(value);
    const lines = getLines(source);
    let opener = null;
    for (const line of lines) {
      if (line.start >= offset) break;
      if (!opener) {
        const info = getFenceInfo(line.text);
        if (!info) continue;
        if (offset <= line.end) break;
        opener = info;
        continue;
      }
      if (isFenceCloseLine(line.text, opener)) {
        if (offset <= line.end) break;
        opener = null;
      }
    }
    return Boolean(opener);
  }
  __name(isInsideFence, "isInsideFence");
  function hasClosingFenceAfter(value, lineEnd, opener) {
    const rest = normalizeLineEndings(value).slice(lineEnd + 1);
    return getLines(rest).some((line) => isFenceCloseLine(line.text, opener));
  }
  __name(hasClosingFenceAfter, "hasClosingFenceAfter");

  // src/markdown/blocks.ts
  function headingSlug(value) {
    const text = String(value ?? "").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1").replace(/[`*_~]/g, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-");
    return text || "section";
  }
  __name(headingSlug, "headingSlug");
  function assignHeadingIds(blocks) {
    const used = /* @__PURE__ */ new Set();
    const nextSuffix = /* @__PURE__ */ new Map();
    for (const block of blocks) {
      if (block.type !== "heading" || !block.heading) continue;
      const base = headingSlug(block.heading.content);
      let suffix = nextSuffix.get(base) ?? 0;
      let id = suffix ? `${base}-${suffix}` : base;
      while (used.has(id)) {
        suffix += 1;
        id = `${base}-${suffix}`;
      }
      used.add(id);
      nextSuffix.set(base, suffix + 1);
      block.heading.id = id;
    }
    return blocks;
  }
  __name(assignHeadingIds, "assignHeadingIds");
  function parseBlocks(markdown, opts = {}) {
    const source = normalizeLineEndings(markdown);
    const lines = getLines(source);
    const blocks = [];
    const gfm = usesGfm(opts);
    for (let i = 0; i < lines.length; i += 1) {
      const line = requireItem(lines, i);
      const fenceInfo = getFenceInfo(line.text);
      if (fenceInfo && (line.newlineEnd > line.end || i + 1 < lines.length)) {
        const codeLines = [];
        let j = i + 1;
        while (j < lines.length && !isFenceCloseLine(requireItem(lines, j).text, fenceInfo)) {
          codeLines.push(requireItem(lines, j));
          j += 1;
        }
        const closing = j < lines.length ? requireItem(lines, j) : null;
        blocks.push({ type: "code-fence", from: line.start, to: (closing ?? codeLines.at(-1) ?? line).end, newlineEnd: (closing ?? codeLines.at(-1) ?? line).newlineEnd, opening: line, closing, codeLines, language: fenceInfo.language, fence: fenceInfo });
        i = closing ? j : j - 1;
        continue;
      }
      if (gfm && i + 1 < lines.length && isLikelyTableRow(line.text) && isTableDelimiter(requireItem(lines, i + 1).text)) {
        const header = { ...requireItem(lines, i), cells: parseTableLineRanges(requireItem(lines, i).text, requireItem(lines, i).start) };
        const delimiter = { ...requireItem(lines, i + 1), cells: parseTableLineRanges(requireItem(lines, i + 1).text, requireItem(lines, i + 1).start) };
        const rows = [];
        let j = i + 2;
        while (j < lines.length && requireItem(lines, j).text.trim() && isLikelyTableRow(requireItem(lines, j).text)) {
          rows.push({ ...requireItem(lines, j), cells: parseTableLineRanges(requireItem(lines, j).text, requireItem(lines, j).start) });
          j += 1;
        }
        blocks.push({ type: "table", from: line.start, to: (rows.at(-1) ?? delimiter).end, newlineEnd: (rows.at(-1) ?? delimiter).newlineEnd, header, delimiter, rows });
        i = j - 1;
        continue;
      }
      const setextLevel = i + 1 < lines.length ? parseSetextHeadingLevel(requireItem(lines, i + 1).text) : null;
      const canSetext = setextLevel && line.text.trim() && !parseHeading(line.text) && !parseListItem(line.text, opts) && !parseBlockquote(line.text) && !isHorizontalRule(line.text);
      if (canSetext) {
        blocks.push({ type: "heading", from: line.start, to: requireItem(lines, i + 1).end, newlineEnd: requireItem(lines, i + 1).newlineEnd, line, heading: { indent: "", level: setextLevel, markerText: requireItem(lines, i + 1).text, content: line.text.trim(), contentStart: 0 }, setext: requireItem(lines, i + 1) });
        i += 1;
        continue;
      }
      const heading = parseHeading(line.text);
      if (heading) {
        blocks.push({ type: "heading", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, heading });
        continue;
      }
      const list = parseListItem(line.text, opts);
      if (list) {
        blocks.push({ type: list.kind, from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, list });
        continue;
      }
      const quote = parseBlockquote(line.text);
      if (quote) {
        blocks.push({ type: "blockquote", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, quote });
        continue;
      }
      if (isHorizontalRule(line.text)) {
        blocks.push({ type: "horizontal-rule", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line });
        continue;
      }
      blocks.push({ type: line.text.trim() ? "paragraph" : "blank", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line });
    }
    if (blocks.length === 0) blocks.push({ type: "blank", from: 0, to: 0, newlineEnd: 0, line: { start: 0, end: 0, newlineEnd: 0, text: "" } });
    return assignHeadingIds(blocks);
  }
  __name(parseBlocks, "parseBlocks");

  // src/markdown/references.ts
  function parseReferenceDefinition(line) {
    const match = /^ {0,3}\[([^\]\n]+)\]:[ \t]*(.+?)\s*$/.exec(String(line ?? ""));
    if (!match) return null;
    const label = normalizeReferenceLabel(match[1] ?? "");
    if (!label) return null;
    const destination = splitLinkDestinationAndTitle(match[2] ?? "");
    if (!destination.url) return null;
    return { label, ...destination };
  }
  __name(parseReferenceDefinition, "parseReferenceDefinition");
  function extractReferenceDefinitions(markdown, inherited = null) {
    const references = new Map(inherited instanceof Map ? inherited : []);
    const source = normalizeLineEndings(markdown);
    const output = source.split("\n");
    const lineIndexes = new Map(getLines(source).map((line, index) => [line.start, index]));
    let paragraphOpen = false;
    for (const block of parseBlocks(source)) {
      if (block.type !== "paragraph") {
        paragraphOpen = false;
        continue;
      }
      const definition = paragraphOpen ? null : parseReferenceDefinition(block.line.text);
      if (!definition) {
        paragraphOpen = true;
        continue;
      }
      if (!references.has(definition.label)) references.set(definition.label, definition);
      const lineIndex = lineIndexes.get(block.line.start);
      if (lineIndex != null) output[lineIndex] = "";
    }
    return { markdown: output.join("\n"), references };
  }
  __name(extractReferenceDefinitions, "extractReferenceDefinitions");

  // src/markdown/tags.ts
  function normalizeTagKey(value) {
    return String(value ?? "").normalize("NFC").toLowerCase();
  }
  __name(normalizeTagKey, "normalizeTagKey");
  function isTagBodyCharacter(char) {
    return char != null && /[\p{L}\p{M}\p{N}_-]/u.test(char);
  }
  __name(isTagBodyCharacter, "isTagBodyCharacter");
  function isValidTagValue(value) {
    const tag = String(value ?? "");
    if (!tag || tag.startsWith("/") || tag.endsWith("/") || tag.includes("//")) return false;
    if (!tag.split("/").every((segment) => segment && [...segment].every(isTagBodyCharacter))) return false;
    return /[\p{L}\p{M}_-]/u.test(tag);
  }
  __name(isValidTagValue, "isValidTagValue");
  function isTagBoundary(source, index) {
    if (index === 0) return true;
    const before = source[index - 1] || "";
    if (!/\s|[\p{P}\p{S}]/u.test(before) || before === "#" || before === "/") return false;
    const tokenStart = Math.max(
      source.lastIndexOf(" ", index - 1),
      source.lastIndexOf("\n", index - 1),
      source.lastIndexOf("	", index - 1)
    ) + 1;
    const prefix = source.slice(tokenStart, index);
    return !/(?:^|[([{<])(?:[a-z][a-z\d+.-]*:\/\/|www\.)/i.test(prefix);
  }
  __name(isTagBoundary, "isTagBoundary");
  function parseTagAt(source, index) {
    const text = String(source ?? "");
    if (text[index] !== "#" || isBackslashEscaped(text, index) || !isTagBoundary(text, index)) return null;
    const match = /^([\p{L}\p{M}\p{N}_-]+(?:\/[\p{L}\p{M}\p{N}_-]+)*)/u.exec(text.slice(index + 1));
    const value = match?.[1] || "";
    if (!isValidTagValue(value) || text[index + 1 + value.length] === "/") return null;
    const cursor = index + 1 + value.length;
    return { value, key: normalizeTagKey(value), from: index, to: cursor };
  }
  __name(parseTagAt, "parseTagAt");
  function cloneTags(tags) {
    return (tags || []).map((tag) => ({
      value: tag.value,
      key: tag.key,
      count: tag.count,
      ranges: tag.ranges.map((range) => ({ from: range.from, to: range.to }))
    }));
  }
  __name(cloneTags, "cloneTags");
  function parseTags(markdown, opts = {}) {
    const source = normalizeLineEndings(markdown);
    const references = extractReferenceDefinitions(source).references;
    const lines = getLines(source);
    const excluded = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = requireItem(lines, i);
      const fence = getFenceInfo(line.text);
      if (fence && (line.newlineEnd > line.end || i + 1 < lines.length)) {
        let closingIndex = i + 1;
        while (closingIndex < lines.length && !isFenceCloseLine(requireItem(lines, closingIndex).text, fence)) closingIndex += 1;
        const last = lines[closingIndex] || lines.at(-1) || line;
        excluded.push({ from: line.start, to: last.newlineEnd });
        i = closingIndex < lines.length ? closingIndex : lines.length - 1;
        continue;
      }
      if (parseReferenceDefinition(line.text)) excluded.push({ from: line.start, to: line.newlineEnd });
    }
    excluded.sort((a, b) => a.from - b.from);
    const found = [];
    const scan = /* @__PURE__ */ __name((text, offset = 0) => {
      let excludedIndex = 0;
      const brackets = matchingBrackets(text);
      for (let i = 0; i < text.length; i += 1) {
        const absolute = offset + i;
        while (excludedIndex < excluded.length && requireItem(excluded, excludedIndex).to <= absolute) excludedIndex += 1;
        const blocked = excluded[excludedIndex];
        if (offset === 0 && blocked && blocked.from <= absolute && absolute < blocked.to) {
          i = blocked.to - 1;
          continue;
        }
        if (text[i] === "`") {
          const code = parseCodeSpanAt(text, i);
          if (code) {
            i = code.to - 1;
            continue;
          }
        }
        const link = parseInlineLinkAt(text, i, brackets) || parseReferenceLinkAt(text, references, i, brackets);
        if (link) {
          scan(link.label, absolute + (link.labelStart - link.from));
          i = link.to - 1;
          continue;
        }
        const tag = parseTagAt(text, i);
        if (!tag) continue;
        found.push({ ...tag, from: absolute, to: offset + tag.to });
        i = tag.to - 1;
      }
    }, "scan");
    scan(source);
    const indexed = /* @__PURE__ */ new Map();
    for (const tag of found) {
      const current = indexed.get(tag.key);
      if (current) {
        current.count += 1;
        current.ranges.push({ from: tag.from, to: tag.to });
      } else {
        indexed.set(tag.key, {
          value: tag.value,
          key: tag.key,
          count: 1,
          ranges: [{ from: tag.from, to: tag.to }]
        });
      }
    }
    return [...indexed.values()];
  }
  __name(parseTags, "parseTags");

  // src/security.ts
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  __name(escapeHtml, "escapeHtml");
  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
  __name(escapeAttribute, "escapeAttribute");
  function isProbablyUrl(text) {
    return /^(https?:\/\/|mailto:|tel:|\/|#|\.\/|\.\.\/)[^\s]+$/i.test(String(text ?? "").trim());
  }
  __name(isProbablyUrl, "isProbablyUrl");
  function isSafeUrl(url, { allowDataImage = false } = {}) {
    const raw = String(url ?? "").trim();
    if (!raw) return false;
    const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
    if (compact.startsWith("javascript:") || compact.startsWith("vbscript:") || compact.startsWith("file:")) return false;
    if (compact.startsWith("data:")) return allowDataImage && /^data:image\/(png|gif|jpe?g|webp);/i.test(compact);
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return /^(https?:|mailto:|tel:)/i.test(raw);
    return true;
  }
  __name(isSafeUrl, "isSafeUrl");
  function safeHref(url, opts = {}) {
    const raw = String(url ?? "").trim();
    return raw === "" ? "" : isSafeUrl(raw, opts) ? raw : "#";
  }
  __name(safeHref, "safeHref");
  function escapeMarkdownLabel(value) {
    return String(value ?? "").replace(/[\\\[\]]/g, "\\$&").replace(/\r\n?|\n/g, " ");
  }
  __name(escapeMarkdownLabel, "escapeMarkdownLabel");
  function markdownLinkDestination(value) {
    const raw = String(value ?? "");
    if (/[\r\n\u0000-\u001F\u007F]/.test(raw)) return null;
    return raw.replace(/[\s()<>"'\\]/gu, (char) => encodeURIComponent(char).replace(/[!'()*]/g, (nested) => `%${nested.charCodeAt(0).toString(16).toUpperCase()}`));
  }
  __name(markdownLinkDestination, "markdownLinkDestination");
  function codeLanguage(value) {
    const raw = String(value ?? "").trim();
    if (/[\r\n\u2028\u2029\u0000-\u0008\u000B-\u001F\u007F`~\\]/.test(raw)) return null;
    const language = raw.replace(/[ \t]+/g, "-");
    return /^[\p{L}\p{N}_+.-]*$/u.test(language) ? language : null;
  }
  __name(codeLanguage, "codeLanguage");

  // src/render/inline.ts
  function renderEmphasisMarkdown(source, markerHtml = () => "") {
    const spans = [];
    for (const pair of emphasisPairs(source)) {
      spans.push({
        from: pair.openStart,
        to: pair.openEnd,
        html: `${markerHtml(pair.marker)}<${pair.tag}>`
      });
      spans.push({
        from: pair.closeStart,
        to: pair.closeEnd,
        html: `</${pair.tag}>${markerHtml(pair.marker)}`
      });
    }
    spans.sort((a, b) => a.from - b.from || b.to - a.to);
    let html = "";
    let cursor = 0;
    for (const span of spans) {
      if (span.from < cursor) continue;
      html += escapeHtml(source.slice(cursor, span.from));
      html += span.html;
      cursor = span.to;
    }
    html += escapeHtml(source.slice(cursor));
    return html;
  }
  __name(renderEmphasisMarkdown, "renderEmphasisMarkdown");
  function tagHtml(tag) {
    return `<span class="md-tag" part="tag" data-md-tag="${escapeAttribute(tag.value)}" data-tag-key="${escapeAttribute(tag.key)}">#${escapeHtml(tag.value)}</span>`;
  }
  __name(tagHtml, "tagHtml");
  function decorateInline(raw, opts = {}) {
    const text = String(raw ?? "");
    const tokens = [];
    const prefix = placeholderPrefix(text);
    const brackets = matchingBrackets(text);
    const reserve = /* @__PURE__ */ __name((html2) => {
      const placeholder = `${prefix}${tokens.length}\uE001`;
      tokens.push([placeholder, html2]);
      return placeholder;
    }, "reserve");
    const token = /* @__PURE__ */ __name((t) => `<span class="md-token">${escapeHtml(t)}</span>`, "token");
    let prepared = "";
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "`") {
        const code = parseCodeSpanAt(text, i);
        if (code) {
          prepared += reserve(`${token(code.marker)}<code>${escapeHtml(code.content)}</code>${token(code.marker)}`);
          i = code.to - 1;
          continue;
        }
      }
      if (text[i] === "\\" && isEscapablePunctuation(text[i + 1])) {
        prepared += reserve((opts.hideEscapes ? "" : token("\\")) + escapeHtml(text[i + 1]));
        i += 2;
        i -= 1;
        continue;
      }
      const link = parseInlineLinkAt(text, i, brackets) || parseReferenceLinkAt(text, opts.references, i, brackets);
      if (link) {
        const safe = safeHref(link.url);
        const labelHtml = decorateInline(link.label, opts);
        const prefix2 = token(`${link.bang}[`);
        const inline = text[link.labelEnd + 1] === "(";
        const suffix = inline ? `${token("](")}<span class="md-url">${escapeHtml(link.url)}</span>${token(")")}` : token(text.slice(link.labelEnd, link.to));
        const rendered = link.bang ? `${prefix2}${labelHtml}${suffix}` : `${prefix2}<a href="${escapeAttribute(safe)}" tabindex="-1">${labelHtml}</a>${suffix}`;
        prepared += reserve(rendered);
        i = link.to - 1;
        continue;
      }
      const tag = opts.tagsEnabled === true ? parseTagAt(text, i) : null;
      if (tag) {
        prepared += reserve(tagHtml(tag));
        i = tag.to - 1;
        continue;
      }
      prepared += text[i];
    }
    if (usesGfm(opts)) {
      prepared = prepared.replace(/~~([^~\n]+)~~/g, (_, content) => reserve(`${token("~~")}<del>${decorateInline(content, opts)}</del>${token("~~")}`));
    }
    const html = renderEmphasisMarkdown(prepared, token);
    let restored = html;
    for (const [placeholder, reserved] of tokens.reverse()) {
      restored = restored.replaceAll(escapeHtml(placeholder), reserved).replaceAll(placeholder, reserved);
    }
    return restored || "<br>";
  }
  __name(decorateInline, "decorateInline");
  function renderInlineMarkdown(source, opts = {}) {
    let text = String(source ?? "");
    const tokens = [];
    const prefix = placeholderPrefix(text);
    const reserve = /* @__PURE__ */ __name((html) => {
      const token = `${prefix}${tokens.length}\uE001`;
      tokens.push([token, html]);
      return token;
    }, "reserve");
    let codeReserved = "";
    for (let i = 0; i < text.length; i += 1) {
      const code = parseCodeSpanAt(text, i);
      if (!code) {
        codeReserved += text[i];
        continue;
      }
      codeReserved += reserve(`<code>${escapeHtml(normalizeCodeSpanContent(code.content))}</code>`);
      i = code.to - 1;
    }
    text = codeReserved;
    let escapesReserved = "";
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "\\" && isEscapablePunctuation(text[i + 1])) {
        escapesReserved += reserve(escapeHtml(text[i + 1]));
        i += 1;
      } else escapesReserved += text[i];
    }
    text = escapesReserved;
    let linked = "";
    const brackets = matchingBrackets(text);
    for (let i = 0; i < text.length; i += 1) {
      const link = parseInlineLinkAt(text, i, brackets) || parseReferenceLinkAt(text, opts.references, i, brackets);
      if (!link) {
        linked += text[i];
        continue;
      }
      if (link.bang) {
        const safe = safeHref(link.url, { allowDataImage: false });
        linked += safe === "#" && String(link.url).trim() !== "#" ? link.full : reserve(`<img src="${escapeAttribute(safe)}" alt="${escapeAttribute(link.label)}"${link.title ? ` title="${escapeAttribute(link.title)}"` : ""}>`);
      } else {
        const safe = safeHref(link.url);
        const target = opts.linkTarget === "_blank" ? ' target="_blank" rel="noopener noreferrer"' : "";
        linked += safe === "#" && String(link.url).trim() !== "#" ? link.label : reserve(`<a href="${escapeAttribute(safe)}"${target}${link.title ? ` title="${escapeAttribute(link.title)}"` : ""}>${renderInlineMarkdown(link.label, opts)}</a>`);
      }
      i = link.to - 1;
    }
    text = linked;
    if (opts.tagsEnabled === true) {
      let tagged = "";
      for (let i = 0; i < text.length; i += 1) {
        const tag = parseTagAt(text, i);
        if (!tag) {
          tagged += text[i];
          continue;
        }
        tagged += reserve(tagHtml(tag));
        i = tag.to - 1;
      }
      text = tagged;
    }
    if (usesGfm(opts)) {
      text = text.replace(/~~([^~\n]+)~~/g, (_, content) => reserve(`<del>${renderInlineMarkdown(content, opts)}</del>`));
    }
    text = text.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?\])}])/g, (match, prefix2, url) => `${prefix2}${reserve(`<a href="${escapeAttribute(safeHref(url))}">${escapeHtml(url)}</a>`)}`);
    text = text.replace(/(?: {2,}|\\)\n/g, () => `${reserve("<br>")}
`);
    text = renderEmphasisMarkdown(text);
    for (const [token, html] of tokens.reverse()) text = text.replaceAll(escapeHtml(token), html).replaceAll(token, html);
    return text;
  }
  __name(renderInlineMarkdown, "renderInlineMarkdown");

  // src/browser/clipboard.ts
  function stripHtml(value) {
    const template = document.createElement("template");
    template.innerHTML = String(value ?? "");
    return template.content.textContent ?? "";
  }
  __name(stripHtml, "stripHtml");
  function escapeClipboardText(text, inTable) {
    const literal = text.replace(/[\\`*_{}\[\]()#+\-.!>~]/g, "\\$&");
    return inTable ? literal : literal.replace(/\|/g, "\\|");
  }
  __name(escapeClipboardText, "escapeClipboardText");
  function htmlToMarkdown(html) {
    const template = document.createElement("template");
    const source = String(html ?? "");
    template.innerHTML = source;
    const escapeMd = /* @__PURE__ */ __name((text, inTable) => escapeClipboardText((text ?? "").replace(/\u00a0/g, " "), inTable), "escapeMd");
    const mark = /* @__PURE__ */ __name((content, delimiter) => {
      const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(content);
      if (!match?.[2]) return content;
      return `${match[1] || ""}${delimiter}${match[2]}${delimiter}${match[3] || ""}`;
    }, "mark");
    const codeBlocks = [];
    const namespaces = /* @__PURE__ */ new Set();
    for (const text of [source, template.content.textContent ?? ""]) {
      for (const match of text.matchAll(/\uE000writemark-code-(\d+)-/g)) {
        if (match[1]) namespaces.add(match[1]);
      }
    }
    let namespace = 0;
    while (namespaces.has(String(namespace))) namespace += 1;
    const codePrefix = `\uE000writemark-code-${namespace}-`;
    const walk = /* @__PURE__ */ __name((node, depth = 0, inTable = false) => {
      if (node.nodeType === Node.TEXT_NODE) return escapeMd(node.nodeValue?.replace(/[\t\r\n ]+/g, " ") ?? "", inTable);
      if (depth > 256) {
        const reader = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const text = [];
        while (reader.nextNode()) {
          if (!reader.currentNode.parentElement?.closest("script,style,iframe,template,object,embed,svg,math,head")) text.push(escapeMd(reader.currentNode.nodeValue, inTable));
        }
        return text.join("");
      }
      if (!(node instanceof Element)) return "";
      const tag = node.tagName.toLowerCase();
      const children = /* @__PURE__ */ __name(() => Array.from(node.childNodes).map((child) => walk(child, depth + 1, inTable)).join(""), "children");
      const block = /* @__PURE__ */ __name((text) => `

${text.trim()}

`, "block");
      if (["script", "style", "iframe", "template", "object", "embed", "svg", "math", "head"].includes(tag)) return "";
      if (/mso-list\s*:\s*ignore/i.test(node.getAttribute("style") || "")) return "";
      if (tag === "br") return node.classList.contains("Apple-interchange-newline") ? "" : "  \n";
      if (/^h[1-6]$/.test(tag)) return block(`${"#".repeat(Number(tag[1]))} ${children().trim()}`);
      const weight = node instanceof HTMLElement ? node.style.fontWeight : "";
      if (tag === "strong" || tag === "b") {
        const content2 = weight === "normal" || weight === "400" ? children() : mark(children(), "**");
        return node instanceof HTMLElement && node.style.fontStyle === "italic" ? mark(content2, "*") : content2;
      }
      if (tag === "em" || tag === "i") return mark(children(), "*");
      if (tag === "del" || tag === "s") return mark(children(), "~~");
      if (tag === "hr") return block("---");
      if (tag === "code" && node.parentElement?.tagName?.toLowerCase() !== "pre") {
        return codeSpanMarkdown(node.textContent || "");
      }
      if (tag === "pre") {
        const content2 = normalizeLineEndings(node.textContent);
        if (inTable) return codeSpanMarkdown(content2.replace(/\s*\n\s*/g, " "));
        let longestRun = 2;
        for (const match of content2.matchAll(/`+/g)) longestRun = Math.max(longestRun, (match[0] ?? "").length);
        const fence = "`".repeat(longestRun + 1);
        codeBlocks.push(`${fence}
${content2}${content2.endsWith("\n") ? "" : "\n"}${fence}`);
        return block(`${codePrefix}${codeBlocks.length - 1}\uE001`);
      }
      if (tag === "blockquote") return block(children().trim().split("\n").map((line) => `> ${line}`).join("\n"));
      if (tag === "a") {
        const href = node.getAttribute("href") || "";
        const content2 = children();
        const label = content2.trim() || escapeMd(href, inTable);
        const destination = markdownLinkDestination(href);
        if (!href || destination == null || !isSafeUrl(href)) return content2 || label;
        const leading = /^\s*/.exec(content2)?.[0] || "";
        const trailing = /\s*$/.exec(content2)?.[0] || "";
        return `${leading}[${label}](${destination})${trailing}`;
      }
      if (tag === "img") {
        const src = node.getAttribute("src") || "";
        const alt = node.getAttribute("alt") || "";
        const destination = markdownLinkDestination(src);
        return src && destination != null && isSafeUrl(src, { allowDataImage: false }) ? `![${escapeMarkdownLabel(alt)}](${destination})` : escapeMd(alt, inTable);
      }
      if (tag === "ul" || tag === "ol") {
        const start = Number.parseInt(node.getAttribute("start") || "1", 10);
        let index = Number.isFinite(start) ? start : 1;
        const lines = [];
        for (const item of Array.from(node.children)) {
          const itemTag = item.tagName.toLowerCase();
          if (itemTag === "ul" || itemTag === "ol") {
            lines.push(walk(item, depth + 1, inTable).trim().split("\n").map((line) => `   ${line}`).join("\n"));
          } else if (itemTag === "li") {
            const marker = tag === "ol" ? `${index++}.` : "-";
            const content2 = Array.from(item.childNodes).map((child) => {
              if (child instanceof Element && /^(UL|OL)$/.test(child.tagName)) {
                return "\n" + walk(child, depth + 1, inTable).trim() + "\n\n";
              }
              return walk(child, depth + 1, inTable);
            }).join("").trim();
            const listContent = content2.startsWith(codePrefix) ? "\n" + content2 : content2;
            const [first = "", ...rest] = listContent.split("\n");
            lines.push(`${marker} ${first}` + rest.map((line) => "\n" + (line ? " ".repeat(marker.length + 1) + line : "")).join(""));
          }
        }
        return block(lines.join("\n"));
      }
      if (tag === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).filter((tr) => tr.closest("table") === node).map((tr) => Array.from(tr.children).filter((cell) => /^(TD|TH)$/.test(cell.tagName)).map((cell) => {
          const inline = Array.from(cell.childNodes).map((child) => walk(child, depth + 1, true)).join("");
          return escapeTableCellText(inline.trim().replace(/\s*\n\s*/g, " "));
        }));
        if (!rows.length) return "";
        const cols = Math.max(...rows.map((r) => r.length));
        const pad = /* @__PURE__ */ __name((r) => Array.from({ length: cols }, (_, i) => r[i] || ""), "pad");
        const header = pad(requireItem(rows, 0));
        const body = rows.slice(1).map(pad);
        return block([`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map((r) => `| ${r.join(" | ")} |`)].join("\n"));
      }
      if (tag === "p" && /mso-list\s*:/i.test(node.getAttribute("style") || "")) {
        const style = node.getAttribute("style") || "";
        const level = Number(/level(\d+)/i.exec(style)?.[1] || "1");
        const label = node.querySelector('[style*="mso-list:Ignore"], [style*="mso-list: Ignore"]')?.textContent?.trim() || "";
        const marker = /^[\dA-Za-z]+[.)]/.test(label) ? `${/^\d+/.exec(label)?.[0] || "1"}.` : "-";
        return `
${"   ".repeat(Math.min(20, Math.max(0, level - 1)))}${marker} ${children().trim()}
`;
      }
      if (["p", "div", "section", "article"].includes(tag)) return block(children());
      let content = children();
      if (weight === "bold" || Number(weight) >= 600) content = mark(content, "**");
      if (node instanceof HTMLElement && node.style.fontStyle === "italic") content = mark(content, "*");
      return content;
    }, "walk");
    return Array.from(template.content.childNodes).map((child) => walk(child)).join("").replace(/\n[ \t]+\n/g, "\n\n").replace(/\n{3,}/g, "\n\n").trim().replace(new RegExp(`(^[ >]*)${codePrefix}(\\d+)\uE001`, "gm"), (_match, prefix, index) => (codeBlocks[Number(index)] || "").split("\n").map((line) => prefix + line).join("\n"));
  }
  __name(htmlToMarkdown, "htmlToMarkdown");
  function tsvToMarkdownTable(text) {
    const literalCell = /* @__PURE__ */ __name((cell) => escapeTableCellText(escapeClipboardText(cell.trim(), true)), "literalCell");
    const rows = normalizeLineEndings(text).split("\n").filter((row) => row.length > 0).map((row) => row.split("	").map(literalCell));
    if (rows.length < 2 || rows.every((row) => row.length < 2)) return null;
    const cols = Math.max(...rows.map((row) => row.length));
    const pad = /* @__PURE__ */ __name((row) => Array.from({ length: cols }, (_, i) => row[i] || ""), "pad");
    const header = pad(requireItem(rows, 0));
    const body = rows.slice(1).map(pad);
    return [`| ${header.join(" | ")} |`, `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`, ...body.map((row) => `| ${row.join(" | ")} |`)].join("\n");
  }
  __name(tsvToMarkdownTable, "tsvToMarkdownTable");
  function safeClipboardGet(clipboard, type) {
    try {
      return clipboard?.getData?.(type) || "";
    } catch {
      return "";
    }
  }
  __name(safeClipboardGet, "safeClipboardGet");
  function looksLikeMarkdown(text) {
    const source = normalizeLineEndings(text).trim();
    if (!source) return false;
    return looksLikeBlockMarkdown(source) || /(^|\s)(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`\n]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m.test(source);
  }
  __name(looksLikeMarkdown, "looksLikeMarkdown");
  function looksLikeBlockMarkdown(text) {
    const source = normalizeLineEndings(text).trim();
    if (!source) return false;
    const lines = source.split("\n");
    if (lines.some((line) => /^(\s{0,3}#{1,6}\s+|\s*([-+*])\s+|\s*\d+[.)]\s+|\s*[-+*]\s+\[(?: |x|X)\]\s+|\s*>\s?|\s*```|\s*~~~)/.test(line))) return true;
    if (lines.some((line) => isHorizontalRule(line))) return true;
    if (lines.length >= 2 && isLikelyTableRow(requireItem(lines, 0)) && isTableDelimiter(requireItem(lines, 1))) return true;
    return false;
  }
  __name(looksLikeBlockMarkdown, "looksLikeBlockMarkdown");
  function markdownFromClipboardData(clipboard) {
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
  __name(markdownFromClipboardData, "markdownFromClipboardData");
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
  __name(expandMarkdownFormattingRange, "expandMarkdownFormattingRange");
  function textFromMarkdown(markdown, opts = {}) {
    const extracted = extractReferenceDefinitions(markdown, opts.references);
    const options = { ...DEFAULTS, ...opts, references: extracted.references };
    const inlineText = /* @__PURE__ */ __name((text) => stripHtml(renderInlineMarkdown(text, options)), "inlineText");
    const lines = [];
    for (const block of parseBlocks(extracted.markdown, options)) {
      if (block.type === "blank") {
        lines.push("");
        continue;
      }
      if (block.type === "heading") {
        lines.push(inlineText(block.heading.content));
        continue;
      }
      if (block.type === "horizontal-rule") continue;
      if (block.type === "blockquote") {
        lines.push(inlineText(block.quote.content));
        continue;
      }
      if (block.type === "bullet-list-item" || block.type === "ordered-list-item" || block.type === "task-list-item") {
        lines.push(inlineText(block.list.content));
        continue;
      }
      if (block.type === "code-fence") {
        lines.push(block.codeLines.map((l) => l.text).join("\n"));
        continue;
      }
      if (block.type === "table") {
        const tableRows = [block.header, ...block.rows];
        for (const row of tableRows) lines.push(row.cells.map((cell) => inlineText(unescapeTableCellText(cell.text))).join("	"));
        continue;
      }
      lines.push(inlineText(block.line.text));
    }
    while (lines[0] === "") lines.shift();
    while (lines.at(-1) === "") lines.pop();
    return lines.join("\n");
  }
  __name(textFromMarkdown, "textFromMarkdown");

  // src/render/live.ts
  var LiveRenderer = class {
    static {
      __name(this, "LiveRenderer");
    }
    constructor(api) {
      this.api = Object.freeze(api);
      this._blockCache = null;
      this._blockCacheValue = null;
      this._hasRenderedOnce = void 0;
      this._lastParseMode = void 0;
      this._liveBlocks = [];
      this._liveDirty = true;
      this._nativeLiveDomDirty = false;
      this._previewDirty = true;
      this._previewRenderTimer = 0;
      this._virtualMetricsCache = null;
      this._virtualScrollFrame = 0;
      this._virtualState = { active: false, start: 0, end: 0, total: 0, lineHeight: 24 };
    }
    get _liveEditor() {
      return this.api.getLiveEditor();
    }
    set _liveEditor(value) {
      this.api.setLiveEditor(value);
    }
    get _sourceTextarea() {
      return this.api.getSourceTextarea();
    }
    get _value() {
      return this.api.getValue();
    }
    get _selection() {
      return this.api.getSelection();
    }
    get _isComposing() {
      return this.api.getIsComposing();
    }
    get mode() {
      return this.api.getMode();
    }
    get preview() {
      return this.api.getPreview();
    }
    get _preview() {
      return this.api.getPreviewElement();
    }
    set _preview(value) {
      this.api.setPreview(value);
    }
    get _liveIndexDirty() {
      return this.api.getLiveIndexDirty();
    }
    set _liveIndexDirty(value) {
      this.api.setLiveIndexDirty(value);
    }
    get placeholder() {
      return this.api.getPlaceholder();
    }
    get _liveSelectionAPI() {
      return this.api.getLiveSelectionAPI();
    }
    get indentString() {
      return this.api.getIndentString();
    }
    get disabled() {
      return this.api.getDisabled();
    }
    set disabled(value) {
      this.api.setDisabled(value);
    }
    get readonly() {
      return this.api.getReadonly();
    }
    set readonly(value) {
      this.api.setReadonly(value);
    }
    _renderAll({ restoreSelection = true, previousValue = null, changes = null, force = false } = {}) {
      if (!this._liveEditor) return;
      this._hasRenderedOnce = true;
      if (this._sourceTextarea.value !== this._value) this._sourceTextarea.value = this._value;
      if (restoreSelection && this.api._isSourceActive()) {
        this._sourceTextarea.setSelectionRange(
          this._selection.start,
          this._selection.end,
          this._selection.direction
        );
      }
      if (this._isLiveVisible()) {
        if (this._isComposing) {
          this._liveDirty = true;
        } else {
          this._renderLive({ previousValue, changes, force });
          this._liveDirty = false;
          if (restoreSelection && !this.api._isSourceActive()) this.api._restoreLiveSelection(this._selection);
        }
      } else {
        this._liveDirty = true;
      }
      this._schedulePreviewRender({ immediate: force || !this._previewDirty });
    }
    _isLiveVisible() {
      return this.mode === "live";
    }
    _isPreviewVisible() {
      return this.mode === "preview" || this.mode === "split" || this.preview !== "none";
    }
    _renderDebounceMs() {
      const attribute = this.api.getAttribute("render-debounce-ms");
      if (attribute == null) return DEFAULTS.renderDebounceMs;
      const raw = Number(attribute);
      return Number.isFinite(raw) ? clamp(raw, 0, 1e3) : DEFAULTS.renderDebounceMs;
    }
    _schedulePreviewRender({ immediate = false } = {}) {
      this._previewDirty = true;
      if (!this._isPreviewVisible()) return;
      const run = /* @__PURE__ */ __name(() => {
        this._previewRenderTimer = 0;
        if (this._isPreviewVisible()) this._renderPreview();
      }, "run");
      if (immediate) {
        if (this._previewRenderTimer) globalThis.clearTimeout?.(this._previewRenderTimer);
        run();
        return;
      }
      if (this._previewRenderTimer) return;
      this._previewRenderTimer = globalThis.setTimeout?.(run, this._renderDebounceMs()) ?? 0;
    }
    _renderPreview() {
      if (!this._preview) return;
      try {
        this._preview.innerHTML = this.api.getHTML();
        for (const tag of this._preview.querySelectorAll(".md-tag")) {
          tag.tabIndex = 0;
          tag.setAttribute("role", "button");
        }
        this._previewDirty = false;
        this.api._dispatch("md-render", { html: this._preview.innerHTML });
      } catch (error) {
        this._preview.innerHTML = `<pre><code>${escapeHtml(this._value)}</code></pre>`;
        this.api._emitError("render", error, true);
      }
    }
    _getBlocks() {
      if (this._blockCacheValue === this._value && this._blockCache) return this._blockCache;
      const blocks = parseBlocks(this._value, this.api._parseOptions());
      this._setBlockCache(blocks, "full");
      return blocks;
    }
    _setBlockCache(blocks, mode = "full") {
      assignHeadingIds(blocks);
      this._blockCacheValue = this._value;
      this._blockCache = blocks;
      this._lastParseMode = mode;
    }
    _blocksForRender(previousValue, changes) {
      const incremental = this._tryIncrementalBlocks(previousValue, changes);
      if (incremental) {
        this._setBlockCache(incremental, "incremental");
        return incremental;
      }
      const blocks = parseBlocks(this._value, this.api._parseOptions());
      this._setBlockCache(blocks, "full");
      return blocks;
    }
    _renderLive({ previousValue = null, changes = null, force = false, virtualAnchorOffset = null } = {}) {
      this._nativeLiveDomDirty = false;
      const previousBlocks = this._liveBlocks || [];
      const blocks = this._blocksForRender(previousValue, changes);
      if (this._shouldVirtualize(blocks)) {
        this._renderLiveVirtual(blocks, { anchorOffset: virtualAnchorOffset ?? this._selection.start, force });
        this._liveBlocks = blocks;
        this.api._rebuildLiveIndex();
        this._syncLiveEditingHosts();
        return;
      }
      this._virtualState = { ...this._virtualState, active: false, start: 0, end: blocks.length, total: blocks.length };
      const patched = !force && this._tryPatchLiveBlocks(previousBlocks, blocks, changes, previousValue);
      if (!patched) this._renderLiveFull(blocks);
      this._liveBlocks = blocks;
      this.api._rebuildLiveIndex();
      this._syncLiveEditingHosts();
    }
    _adoptNativeLiveDom({ previousValue = null, changes = null } = {}) {
      if (this._sourceTextarea.value !== this._value) {
        this._sourceTextarea.value = this._value;
      }
      const blocks = this._blocksForRender(previousValue, changes);
      const metadataSynced = this._syncLiveMetadata(blocks);
      this._liveBlocks = blocks;
      this._nativeLiveDomDirty = true;
      this._liveDirty = !metadataSynced;
      if (metadataSynced) {
        this.api._rebuildLiveIndex();
        this._syncLiveEditingHosts();
      } else {
        this._liveIndexDirty = true;
      }
      this.api._debug(2, "live.dom.native-preserved", {
        metadataSynced
      });
      this._schedulePreviewRender();
    }
    _flushNativeLiveDom() {
      if (!this._nativeLiveDomDirty || this._isComposing || !this._isLiveVisible()) return;
      this._nativeLiveDomDirty = false;
      this._renderLive({ force: true });
      this._liveDirty = false;
    }
    _renderLiveFull(blocks) {
      const html = blocks.map((block) => this._renderLiveBlock(block)).join("");
      this._liveEditor.innerHTML = html || `<div class="live-placeholder">${escapeHtml(this.placeholder)}</div>`;
    }
    _tryPatchLiveBlocks(previousBlocks, blocks, changes, previousValue) {
      if (!previousValue || !changes?.length || !previousBlocks.length || !this._liveEditor?.children?.length || this._virtualState.active) return false;
      const children = Array.from(this._liveEditor.children);
      if (children.length !== previousBlocks.length) return false;
      const spans = changedSpans(changes);
      if (!spans) return false;
      const oldRange = this._expandedBlockRange(previousBlocks, spans.oldStart, spans.oldEnd, previousValue.length);
      const newRange = this._expandedBlockRange(blocks, spans.newStart, spans.newEnd, this._value.length);
      if (!oldRange || !newRange) return false;
      if (oldRange.end - oldRange.start > 250 || newRange.end - newRange.start > 250) return false;
      const fragment = this._liveFragmentForBlocks(blocks.slice(newRange.start, newRange.end));
      const reference = children[oldRange.end] || null;
      for (const node of children.slice(oldRange.start, oldRange.end)) node.remove();
      this._liveEditor.insertBefore(fragment, reference);
      if (!this._syncLiveMetadata(blocks)) {
        this._renderLiveFull(blocks);
      }
      return true;
    }
    _expandedBlockRange(blocks, start, end, valueLength = this._value.length) {
      if (!blocks.length) return { start: 0, end: 0 };
      const range = this._blockRangeForSourceRange(blocks, start, end, valueLength);
      if (!range) return null;
      return {
        start: clamp(range.start - 1, 0, blocks.length),
        end: clamp(range.end + 1, 0, blocks.length)
      };
    }
    _blockRangeForSourceRange(blocks, start, end, valueLength = this._value.length) {
      if (!blocks.length) return { start: 0, end: 0 };
      const rangeStart = clamp(Number(start) || 0, 0, valueLength);
      const rangeEnd = clamp(Number(end) || rangeStart, rangeStart, Math.max(rangeStart, valueLength));
      let first = -1;
      let last = -1;
      const pointRange = rangeStart === rangeEnd;
      for (let i = 0; i < blocks.length; i += 1) {
        const block = requireItem(blocks, i);
        const blockEnd = Math.max(block.newlineEnd ?? block.to ?? block.from, block.to ?? block.from, block.from);
        if (first === -1 && (pointRange ? blockEnd >= rangeStart : blockEnd > rangeStart)) first = i;
        if (first !== -1 && block.from <= rangeEnd) last = i;
        if (first !== -1 && block.from > rangeEnd) break;
      }
      if (first === -1) first = Math.max(0, blocks.length - 1);
      if (last === -1 || last < first) last = first;
      return { start: first, end: Math.min(blocks.length, last + 1) };
    }
    _liveFragmentForBlocks(blocks) {
      const template = document.createElement("template");
      template.innerHTML = blocks.map((block) => this._renderLiveBlock(block)).join("");
      return template.content;
    }
    _syncLiveMetadata(blocks) {
      const children = Array.from(this._liveEditor.children).filter((node) => node instanceof HTMLElement).filter((node) => !node.classList?.contains("md-virtual-spacer"));
      if (children.length !== blocks.length) return false;
      for (let i = 0; i < blocks.length; i += 1) {
        if (!this._syncLiveBlockNodeMetadata(requireItem(children, i), requireItem(blocks, i))) return false;
      }
      return true;
    }
    _setEditableMetadata(el, from, to, editable = this._lineEditable(), spellcheck = this._sourceTextarea?.spellcheck ? "true" : "false") {
      if (!el) return false;
      el.dataset.from = String(from);
      el.dataset.to = String(to);
      this._setLiveEditingHostState(el, editable);
      if (el.hasAttribute("spellcheck")) el.setAttribute("spellcheck", spellcheck);
      return true;
    }
    _setLiveEditingHostState(el, editable = this._lineEditable()) {
      if (!el) return;
      if (editable === "false" || this._liveSelectionAPI === false) {
        el.contentEditable = editable;
        return;
      }
      el.removeAttribute("contenteditable");
    }
    _syncLiveEditingHosts() {
      if (!this._liveEditor) return;
      const editable = this._lineEditable();
      this._liveEditor.querySelectorAll("[data-editable]").forEach((el) => this._setLiveEditingHostState(el, editable));
    }
    _liveDescendantEditableAttribute(editable = this._lineEditable()) {
      return editable === "false" || this._liveSelectionAPI === false ? ` contenteditable="${editable}"` : "";
    }
    _syncLiveBlockNodeMetadata(node, block) {
      if (!node || !block) return false;
      const blockFrom = block.from ?? block.line?.start ?? 0;
      const blockTo = block.to ?? block.line?.end ?? blockFrom;
      if (node.dataset) {
        node.dataset.kind = block.type;
        node.dataset.from = String(blockFrom);
        node.dataset.to = String(blockTo);
      }
      if (block.type === "table") {
        const cells = Array.from(node.querySelectorAll('.md-cell[data-editable="cell"]'));
        const cols = Math.max(block.header.cells.length, ...block.rows.map((row) => row.cells.length), 1);
        const headerCells = parseTableLineRanges(block.header.text, block.header.start, true);
        const bodyRows = block.rows.length ? block.rows.map((row) => ({ ...row, cells: parseTableLineRanges(row.text, row.start, true) })) : [{ end: block.delimiter.end, cells: Array.from({ length: cols }, () => ({ text: "", from: block.delimiter.end, to: block.delimiter.end })) }];
        const expected = [
          ...Array.from({ length: cols }, (_, col) => ({ cell: headerCells[col] ?? { from: block.header.end, to: block.header.end }, row: -1, col })),
          ...bodyRows.flatMap((row, rowIndex) => Array.from({ length: cols }, (_, col) => ({ cell: row.cells[col] ?? { from: row.end, to: row.end }, row: rowIndex, col })))
        ];
        if (cells.length !== expected.length) return false;
        cells.forEach((cell, index) => {
          const meta = requireItem(expected, index);
          cell.dataset.row = String(meta.row);
          cell.dataset.col = String(meta.col);
          this._setEditableMetadata(cell, meta.cell.from, meta.cell.to);
        });
        return true;
      }
      if (block.type === "code-fence") {
        node.dataset.language = String(block.language || "");
        const editables = Array.from(node.querySelectorAll("[data-editable]"));
        const virtualOffset = block.codeLines[0]?.start ?? (block.closing ? block.opening.newlineEnd ?? block.opening.end : block.opening.end);
        const lines = block.codeLines.length ? block.codeLines : [{ start: virtualOffset, end: virtualOffset }];
        if (editables.length !== lines.length) return false;
        editables.forEach((editable2, index) => this._setEditableMetadata(editable2, requireItem(lines, index).start ?? block.from, requireItem(lines, index).end, this._lineEditable(), "false"));
        return true;
      }
      if (block.type === "task-list-item") {
        const source = node.querySelector("[data-editable]");
        const checkbox = node.querySelector("[data-task-checkbox]");
        if (!source) return false;
        if (checkbox) checkbox.dataset.checkOffset = String(block.line.start + block.list.indent.length + `${block.list.marker} [`.length);
        return this._setEditableMetadata(source, block.line.start + block.list.contentStart, block.line.end);
      }
      if (block.type === "heading") {
        const heading = node.matches?.(".md-heading") ? node : node.querySelector(".md-heading");
        if (!heading) return false;
        heading.id = block.heading.id || "";
        return this._setEditableMetadata(heading, block.line.start, block.line.end);
      }
      const editable = node.matches?.("[data-editable]") ? node : node.querySelector("[data-editable]");
      if (editable && block.line) return this._setEditableMetadata(editable, block.line.start, block.line.end);
      return block.type === "horizontal-rule";
    }
    _lineAt(value, offset) {
      const line = getLineRange(value, offset);
      return { ...line, newlineEnd: line.end < value.length && value[line.end] === "\n" ? line.end + 1 : line.end };
    }
    _previousLineText(value, lineStart) {
      if (lineStart <= 0) return "";
      return getLineRange(value, lineStart - 1).text;
    }
    _nextLineText(value, lineEnd) {
      if (lineEnd >= value.length) return "";
      return getLineRange(value, lineEnd + 1).text;
    }
    _lineHasStructuralNeighbors(value, line) {
      const texts = [this._previousLineText(value, line.start), line.text, this._nextLineText(value, line.end)];
      return texts.some((text) => isFenceLine(text) || parseSetextHeadingLevel(text) || isLikelyTableRow(text) || isTableDelimiter(text));
    }
    _parseSingleLineBlock(line) {
      const heading = parseHeading(line.text);
      if (heading) return { type: "heading", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, heading };
      const list = parseListItem(line.text, this.api._parseOptions());
      if (list) return { type: list.kind, from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, list };
      const quote = parseBlockquote(line.text);
      if (quote) return { type: "blockquote", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line, quote };
      if (isHorizontalRule(line.text)) return { type: "horizontal-rule", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line };
      return { type: line.text.trim() ? "paragraph" : "blank", from: line.start, to: line.end, newlineEnd: line.newlineEnd, line };
    }
    _tryIncrementalBlocks(previousValue, changes) {
      const sorted = normalizeChanges(changes || []);
      if (!previousValue || sorted.length !== 1 || this._blockCacheValue !== previousValue || !this._blockCache) return null;
      const change = requireItem(sorted, 0);
      const removed = previousValue.slice(change.from, change.to);
      if (removed.includes("\n") || change.insert.includes("\n")) return null;
      const oldLine = this._lineAt(previousValue, change.from);
      const newLine = this._lineAt(this._value, change.from + change.insert.length);
      if (oldLine.start !== newLine.start || this._lineHasStructuralNeighbors(previousValue, oldLine) || this._lineHasStructuralNeighbors(this._value, newLine)) return null;
      const oldBlocks = this._blockCache;
      const index = oldBlocks.findIndex((block) => block.from === oldLine.start && block.to === oldLine.end && block.line);
      if (index === -1) return null;
      const oldBlock = requireItem(oldBlocks, index);
      if (oldBlock.type === "table" || oldBlock.type === "code-fence") return null;
      const newBlock = this._parseSingleLineBlock(newLine);
      const delta = this._value.length - previousValue.length;
      return oldBlocks.map((block, i) => {
        if (i < index) return block;
        if (i === index) return newBlock;
        return this._shiftBlockOffsets(block, delta);
      });
    }
    _shiftCell(cell, delta) {
      return cell ? { ...cell, from: cell.from + delta, to: cell.to + delta } : cell;
    }
    _shiftLineOffsets(line, delta) {
      if (!line) return line;
      const shifted = { ...line, start: line.start + delta, end: line.end + delta, newlineEnd: (line.newlineEnd ?? line.end) + delta };
      if (line.cells) shifted.cells = line.cells.map((cell) => this._shiftCell(cell, delta));
      return shifted;
    }
    _shiftBlockOffsets(block, delta) {
      const offsets = { from: block.from + delta, to: block.to + delta, newlineEnd: block.newlineEnd + delta };
      if (block.type === "table") return { ...block, ...offsets, header: this._shiftLineOffsets(block.header, delta), delimiter: this._shiftLineOffsets(block.delimiter, delta), rows: block.rows.map((row) => this._shiftLineOffsets(row, delta)) };
      if (block.type === "code-fence") return { ...block, ...offsets, opening: this._shiftLineOffsets(block.opening, delta), closing: block.closing ? this._shiftLineOffsets(block.closing, delta) : null, codeLines: block.codeLines.map((line) => this._shiftLineOffsets(line, delta)) };
      const shifted = { ...block, ...offsets, line: this._shiftLineOffsets(block.line, delta) };
      return shifted;
    }
    _shouldVirtualize(blocks) {
      return blocks.length > 2500 || this._value.length > DEFAULTS.largeDocChars * 2;
    }
    _virtualLineHeight() {
      return Math.max(18, this.api._computedLineHeight(this._liveEditor || this));
    }
    _virtualWindowSize(lineHeight = this._virtualLineHeight()) {
      const viewportRows = Math.ceil((this._liveEditor.clientHeight || 600) / lineHeight);
      return clamp(viewportRows + 180, 220, 520);
    }
    _estimatedBlockHeight(block, lineHeight, width) {
      const margin = Math.max(2, lineHeight * 0.12);
      if (block.type === "code-fence") {
        return 30 + 22 + Math.max(1, block.codeLines.length) * lineHeight + lineHeight * 0.75;
      }
      if (block.type === "table") {
        return (2 + block.rows.length) * (lineHeight + 14) + lineHeight * 0.7;
      }
      if (block.type === "horizontal-rule") return lineHeight * 2.2;
      const charsPerLine = Math.max(12, Math.floor((width - 32) / Math.max(1, lineHeight * 0.48)));
      const wrappedLines = Math.max(1, Math.ceil((block.line?.text?.length ?? 0) / charsPerLine));
      const headingScale = block.type === "heading" ? Math.max(1, 2.2 - (block.heading?.level ?? 6) * 0.2) : 1;
      return wrappedLines * lineHeight * headingScale + 2 + margin;
    }
    _virtualMetrics(blocks, lineHeight) {
      const width = this._liveEditor.clientWidth || 600;
      const cached = this._virtualMetricsCache;
      if (cached?.blocks === blocks && cached.lineHeight === lineHeight && cached.width === width) return cached;
      const offsets = [0];
      for (const block of blocks) offsets.push((offsets.at(-1) ?? 0) + this._estimatedBlockHeight(block, lineHeight, width));
      const metrics = { blocks, lineHeight, width, offsets };
      this._virtualMetricsCache = metrics;
      return metrics;
    }
    _virtualBlockIndexAtPixel(offsets, pixel) {
      let low = 0;
      let high = offsets.length - 2;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (requireItem(offsets, mid + 1) <= pixel) low = mid + 1;
        else if (requireItem(offsets, mid) > pixel) high = mid - 1;
        else return mid;
      }
      return clamp(low, 0, Math.max(0, offsets.length - 2));
    }
    _blockIndexForOffset(blocks, offset) {
      const safe = clamp(offset, 0, this._value.length);
      let low = 0;
      let high = blocks.length - 1;
      let best = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const block = requireItem(blocks, mid);
        if (safe < block.from) high = mid - 1;
        else {
          best = mid;
          if (safe <= Math.max(block.to, block.from)) return mid;
          low = mid + 1;
        }
      }
      return clamp(best, 0, Math.max(0, blocks.length - 1));
    }
    _renderLiveVirtual(blocks, { anchorOffset = this._selection.start, force = false, fromScroll = false } = {}) {
      const total = blocks.length;
      const lineHeight = this._virtualLineHeight();
      const { offsets } = this._virtualMetrics(blocks, lineHeight);
      const viewport = this._liveEditor.clientHeight || 600;
      const overscan = Math.max(viewport * 2, lineHeight * 40);
      const anchorIndex = fromScroll ? this._virtualBlockIndexAtPixel(offsets, this._liveEditor.scrollTop || 0) : this._blockIndexForOffset(blocks, anchorOffset);
      const anchorPixel = fromScroll ? this._liveEditor.scrollTop || 0 : requireItem(offsets, anchorIndex);
      const start = this._virtualBlockIndexAtPixel(offsets, Math.max(0, anchorPixel - overscan));
      const end = Math.min(total, this._virtualBlockIndexAtPixel(offsets, anchorPixel + viewport + overscan) + 1);
      if (!force && this._virtualState.active && start === this._virtualState.start && end === this._virtualState.end && total === this._virtualState.total) return;
      const topHeight = Math.round(requireItem(offsets, start));
      const bottomHeight = Math.round(requireItem(offsets, total) - requireItem(offsets, end));
      const top = `<div class="md-virtual-spacer" contenteditable="false" aria-hidden="true" style="block-size:${topHeight}px"></div>`;
      const bottom = `<div class="md-virtual-spacer" contenteditable="false" aria-hidden="true" style="block-size:${bottomHeight}px"></div>`;
      this._liveEditor.innerHTML = `${top}${blocks.slice(start, end).map((block) => this._renderLiveBlock(block)).join("")}${bottom}`;
      this._virtualState = { active: true, start, end, total, lineHeight };
    }
    _isSourceOffsetRendered(offset) {
      if (!this._virtualState.active) return true;
      const blocks = this._liveBlocks?.length ? this._liveBlocks : this._getBlocks();
      const index = this._blockIndexForOffset(blocks, offset);
      return index >= this._virtualState.start && index < this._virtualState.end;
    }
    _ensureVirtualSelectionVisible(selection) {
      if (!this._virtualState.active) return true;
      const blocks = this._liveBlocks?.length ? this._liveBlocks : this._getBlocks();
      const startIndex = this._blockIndexForOffset(blocks, Math.min(selection.start, selection.end));
      const endIndex = this._blockIndexForOffset(blocks, Math.max(selection.start, selection.end));
      if (startIndex >= this._virtualState.start && endIndex < this._virtualState.end) return true;
      if (endIndex - startIndex + 1 > this._virtualWindowSize()) return false;
      const focus = selection.direction === "backward" ? selection.start : selection.end;
      this._renderLiveVirtual(blocks, { anchorOffset: focus, force: true });
      this.api._rebuildLiveIndex();
      return startIndex >= this._virtualState.start && endIndex < this._virtualState.end;
    }
    _onLiveScroll() {
      if (!this._virtualState.active || this._virtualScrollFrame) return;
      this._virtualScrollFrame = requestAnimationFrame(() => {
        this._virtualScrollFrame = 0;
        if (!this._virtualState.active || !this._liveEditor) return;
        const blocks = this._liveBlocks?.length ? this._liveBlocks : this._getBlocks();
        const { offsets } = this._virtualMetrics(blocks, this._virtualLineHeight());
        const visibleStart = this._virtualBlockIndexAtPixel(offsets, this._liveEditor.scrollTop || 0);
        const visibleEnd = this._virtualBlockIndexAtPixel(offsets, (this._liveEditor.scrollTop || 0) + this._liveEditor.clientHeight);
        const padding = Math.min(4, Math.floor((this._virtualState.end - this._virtualState.start) / 4));
        const aboveSafe = this._virtualState.start === 0 || visibleStart >= this._virtualState.start + padding;
        const belowSafe = this._virtualState.end === this._virtualState.total || visibleEnd < this._virtualState.end - padding;
        if (aboveSafe && belowSafe) return;
        this._renderLiveVirtual(blocks, { fromScroll: true });
        this.api._rebuildLiveIndex();
      });
    }
    _renderLiveBlock(block) {
      const options = this.api._rendererOptions();
      const editableAttribute = this._liveDescendantEditableAttribute();
      const lineAttrs = /* @__PURE__ */ __name((line, kind, extra = "", attrs = "") => `class="md-line ${extra}" part="line" data-editable="line" data-kind="${kind}" data-from="${line.start}" data-to="${line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}"${attrs ? ` ${attrs}` : ""}`, "lineAttrs");
      if (block.type === "blank") {
        const placeholderAttrs = this._value.length === 0 ? `data-placeholder="${escapeAttribute(this.placeholder)}"` : "";
        const placeholderClass = this._value.length === 0 ? "md-empty-placeholder" : "";
        return `<div ${lineAttrs(block.line, "blank", placeholderClass, placeholderAttrs)}>${block.line.text ? decorateInline(block.line.text, options) : "<br>"}</div>`;
      }
      if (block.type === "heading") {
        const afterAnchor = block.setext && block.newlineEnd === block.to ? `<div class="md-line md-setext-after" part="line" data-editable="virtual-setext-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After heading"><br></div>` : "";
        const content2 = block.setext ? decorateInline(block.line.text, options) : this._renderHeadingLine(block.line.text, block.heading);
        return `<div ${lineAttrs(block.line, "heading", `md-heading md-h${block.heading.level}`, `id="${escapeAttribute(block.heading.id)}"`)}>${content2}</div>${afterAnchor}`;
      }
      if (block.type === "blockquote") {
        const depth = Math.max(1, Number(block.quote.depth) || 1);
        const visualDepth = Math.min(depth, 16);
        const markerEnd = block.quote.fullContentStart ?? block.quote.contentStart;
        const marker = `<span class="md-token">${escapeHtml(block.line.text.slice(0, markerEnd))}</span>`;
        const content2 = decorateInline(block.line.text.slice(markerEnd), options);
        return `<div ${lineAttrs(block.line, "blockquote", `md-quote md-quote-depth-${visualDepth}`, `data-quote-depth="${depth}"`)}>${marker}${content2}</div>`;
      }
      if (block.type === "horizontal-rule") {
        const afterAnchor = block.line.newlineEnd === block.line.end ? `<div class="md-line md-hr-after" part="line" data-editable="virtual-hr-after" data-kind="blank" data-from="${block.line.end}" data-to="${block.line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After horizontal rule"><br></div>` : "";
        return `<div class="md-line md-hr-line" part="line" data-kind="horizontal-rule" data-from="${block.line.start}" data-to="${block.line.end}" contenteditable="false" aria-label="Horizontal rule"></div>${afterAnchor}`;
      }
      if (block.type === "task-list-item") {
        const list = block.list;
        const checkOffset = block.line.start + list.indent.length + `${list.marker} [`.length;
        const contentFrom = block.line.start + list.contentStart;
        const taskName = textFromMarkdown(list.content, options) || "task";
        const checkboxLabel = `${list.checked ? "Mark task incomplete" : "Mark task complete"}: ${taskName}`;
        return `<div class="md-line md-task-line md-list" part="line" data-kind="task-list-item" data-from="${block.line.start}" data-to="${block.line.end}" style="--md-list-depth:${Math.floor(list.indent.length / Math.max(1, this.indentString.length))}"><input type="checkbox" part="checkbox" data-task-checkbox="true" data-check-offset="${checkOffset}" aria-label="${escapeAttribute(checkboxLabel)}" ${list.checked ? "checked" : ""} ${this.disabled || this.readonly ? "disabled" : ""}><span class="md-task-source" data-editable="line" data-from="${contentFrom}" data-to="${block.line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${this._renderTaskLine(list)}</span></div>`;
      }
      if (block.type === "bullet-list-item" || block.type === "ordered-list-item") {
        const list = block.list;
        const depth = Math.floor(list.indent.length / Math.max(1, this.indentString.length));
        return `<div ${lineAttrs(block.line, block.type, "md-list")} style="--md-list-depth:${depth}">${decorateInline(block.line.text, options)}</div>`;
      }
      if (block.type === "code-fence") return this._renderCodeFence(block);
      if (block.type === "table") return this._renderTable(block);
      const content = parseReferenceDefinition(block.line.text) ? escapeHtml(block.line.text) : decorateInline(block.line.text, options);
      return `<div ${lineAttrs(block.line, "paragraph")}>${content}</div>`;
    }
    _lineEditable() {
      return !this.disabled && !this.readonly && this.mode !== "preview" ? "true" : "false";
    }
    _renderHeadingLine(text, heading) {
      const markerEnd = heading.indent.length + heading.markerText.length;
      return `<span class="md-token">${escapeHtml(text.slice(0, markerEnd))}</span>${decorateInline(text.slice(markerEnd), this.api._rendererOptions())}`;
    }
    _renderTaskLine(list) {
      return decorateInline(list.content, this.api._rendererOptions());
    }
    _renderCodeFence(block) {
      const editableAttribute = this._liveDescendantEditableAttribute();
      const language = String(block.language || "").trim();
      const label = language || "code";
      const header = `<div class="md-code-header" part="code-header" contenteditable="false"><span class="md-code-label">${escapeHtml(label)}</span>${language ? `<span class="md-code-language">fenced block</span>` : ""}</div>`;
      const codeLines = block.codeLines.map((line) => `<div class="md-code-line" part="code-line" data-editable="line" data-kind="code-line" data-from="${line.start}" data-to="${line.end}"${editableAttribute} spellcheck="false">${escapeHtml(line.text) || "<br>"}</div>`).join("");
      const virtualOffset = block.codeLines[0]?.start ?? (block.closing ? block.opening.newlineEnd ?? block.opening.end : block.opening.end);
      const virtualLine = `<div class="md-code-line" part="code-line" data-editable="virtual-code" data-kind="code-line" data-from="${virtualOffset}" data-to="${virtualOffset}"${editableAttribute} spellcheck="false"><br></div>`;
      const afterAnchor = block.closing && block.newlineEnd === block.to ? `<div class="md-line md-code-after" part="line" data-editable="virtual-code-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After code block"><br></div>` : "";
      return `<div class="md-code-block" part="code-block" data-kind="code-fence" data-from="${block.from}" data-to="${block.to}" data-language="${escapeAttribute(language)}">${header}<div class="md-code-lines" part="code-lines">${codeLines || virtualLine}</div></div>${afterAnchor}`;
    }
    _renderTable(block) {
      const cols = Math.max(block.header.cells.length, ...block.rows.map((r) => r.cells.length), 1);
      const alignments = Array.from({ length: cols }, (_, i) => tableAlignmentFromDelimiter(block.delimiter.cells[i]?.text || ""));
      const editableAttribute = this._liveDescendantEditableAttribute();
      const renderCell = /* @__PURE__ */ __name((cell, tag, row, col) => `<${tag}${tableAlignmentStyle(alignments[col] || "")}><div class="md-cell" part="table-cell" data-editable="cell" data-row="${row}" data-col="${col}" data-from="${cell?.from ?? block.to}" data-to="${cell?.to ?? block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${decorateInline(unescapeTableCellText(cell?.text ?? ""), { ...this.api._rendererOptions(), hideEscapes: true })}</div></${tag}>`, "renderCell");
      const headerCells = parseTableLineRanges(block.header.text, block.header.start, true);
      const header = `<thead><tr>${Array.from({ length: cols }, (_, i) => renderCell(headerCells[i] ?? { text: "", from: block.header.end, to: block.header.end }, "th", -1, i)).join("")}</tr></thead>`;
      const bodyRows = block.rows.length ? block.rows.map((row) => ({ ...row, cells: parseTableLineRanges(row.text, row.start, true) })) : [{ end: block.delimiter.end, cells: Array.from({ length: cols }, () => ({ text: "", from: block.delimiter.end, to: block.delimiter.end })) }];
      const body = `<tbody>${bodyRows.map((row, r) => `<tr>${Array.from({ length: cols }, (_, i) => renderCell(row.cells[i] ?? { text: "", from: row.end, to: row.end }, "td", r, i)).join("")}</tr>`).join("")}</tbody>`;
      const afterAnchor = block.newlineEnd === block.to ? `<div class="md-line md-table-after" part="line" data-editable="virtual-table-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After table"><br></div>` : "";
      return `<div class="md-table-block" part="table" data-kind="table" data-from="${block.from}" data-to="${block.to}"><table class="md-table">${header}${body}</table></div>${afterAnchor}`;
    }
  };

  // src/core/text-edits.ts
  var lengthOf = /* @__PURE__ */ __name((piece) => piece.kind === "source" ? piece.to - piece.from : piece.text.length, "lengthOf");
  function slicePieces(pieces, from, to) {
    const result = [];
    let offset = 0;
    for (const piece of pieces) {
      const length = lengthOf(piece);
      const start = Math.max(0, from - offset);
      const end = Math.min(length, to - offset);
      if (start < end) {
        result.push(piece.kind === "source" ? { kind: "source", from: piece.from + start, to: piece.from + end } : { kind: "insert", text: piece.text.slice(start, end) });
      }
      offset += length;
      if (offset >= to) break;
    }
    return result;
  }
  __name(slicePieces, "slicePieces");
  function applyPieces(initial, changes) {
    let pieces = [...initial];
    let length = pieces.reduce((total, piece) => total + lengthOf(piece), 0);
    for (const change of [...changes].sort((a, b) => b.from - a.from)) {
      const from = clamp(change.from, 0, length);
      const to = clamp(change.to, from, length);
      const insert = normalizeLineEndings(change.insert);
      pieces = [...slicePieces(pieces, 0, from), ...insert ? [{ kind: "insert", text: insert }] : [], ...slicePieces(pieces, to, length)];
      length += insert.length - (to - from);
    }
    return pieces;
  }
  __name(applyPieces, "applyPieces");
  function composeTextChanges(before, first, second) {
    const initial = before.length ? [{ kind: "source", from: 0, to: before.length }] : [];
    const pieces = applyPieces(applyPieces(initial, first), second);
    const result = [];
    let from = 0;
    let inserted = [];
    for (const piece of pieces) {
      if (piece.kind === "insert") {
        inserted.push(piece.text);
        continue;
      }
      if (piece.from !== from || inserted.length) {
        result.push({ from, to: piece.from, insert: inserted.join("") });
        inserted = [];
      }
      from = piece.to;
    }
    if (from !== before.length || inserted.length) result.push({ from, to: before.length, insert: inserted.join("") });
    return result;
  }
  __name(composeTextChanges, "composeTextChanges");
  function inferSourceTextChanges(before, after, selection, inputType, data, selectionAfter) {
    if (before === after) return [];
    const start = selection.start;
    const end = selection.end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > before.length) return null;
    const candidate = /* @__PURE__ */ __name((from, to, insert) => {
      if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > before.length) return null;
      return before.slice(0, from) + insert + before.slice(to) === after ? [{ from, to, insert }] : null;
    }, "candidate");
    if (inputType.startsWith("delete")) {
      if (start !== end) return candidate(start, end, "");
      const removed = before.length - after.length;
      if (removed <= 0) return null;
      if (inputType.endsWith("Backward")) return candidate(start - removed, start, "");
      if (inputType.endsWith("Forward")) return candidate(start, start + removed, "");
      const from = selectionAfter.start;
      if (selectionAfter.start === selectionAfter.end && from <= start && from + removed >= start) return candidate(from, from + removed, "");
      return null;
    }
    if (!inputType.startsWith("insert")) return null;
    const supplied = data === null ? null : normalizeLineEndings(data);
    const insertedLength = after.length - before.length + end - start;
    if (insertedLength >= 0) {
      const insert = supplied ?? after.slice(start, start + insertedLength);
      const direct = candidate(start, end, insert);
      if (direct) return direct;
    }
    if (supplied !== null && selectionAfter.start === selectionAfter.end) {
      const from = selectionAfter.end - supplied.length;
      const to = from + before.length + supplied.length - after.length;
      if (from <= start && to >= end) return candidate(from, to, supplied);
    }
    return null;
  }
  __name(inferSourceTextChanges, "inferSourceTextChanges");

  // src/browser/input.ts
  var InputController = class {
    static {
      __name(this, "InputController");
    }
    _sourceInputIntent = null;
    _compositionChanges = null;
    _compositionValue = null;
    constructor(api) {
      this.api = Object.freeze(api);
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      this._compositionSnapshot = null;
      this._isComposing = false;
      this._pendingFenceOpening = null;
      this._webKitNativeInput = null;
    }
    get disabled() {
      return this.api.getDisabled();
    }
    set disabled(value) {
      this.api.setDisabled(value);
    }
    get readonly() {
      return this.api.getReadonly();
    }
    set readonly(value) {
      this.api.setReadonly(value);
    }
    get _sourceTextarea() {
      return this.api.getSourceTextarea();
    }
    get _value() {
      return this.api.getValue();
    }
    set _value(value) {
      this.api.setValue(value);
    }
    get _selection() {
      return this.api.getSelection();
    }
    set _selection(value) {
      this.api.setSelection(value);
    }
    get _redoStack() {
      return this.api.getRedoStack();
    }
    get _liveDirty() {
      return this.api.getLiveDirty();
    }
    get _ignoreSelectionChangeCount() {
      return this.api.getIgnoreSelectionChangeCount();
    }
    set _ignoreSelectionChangeCount(value) {
      this.api.setIgnoreSelectionChangeCount(value);
    }
    get _structuredSelection() {
      return this.api.getStructuredSelection();
    }
    set _structuredSelection(value) {
      this.api.setStructuredSelection(value);
    }
    get _liveSelectionAPI() {
      return this.api.getLiveSelectionAPI();
    }
    get _fallbackSelectionPending() {
      return this.api.getFallbackSelectionPending();
    }
    set _fallbackSelectionPending(value) {
      this.api.setFallbackSelectionPending(value);
    }
    get _fallbackEditable() {
      return this.api.getFallbackEditable();
    }
    set _fallbackEditable(value) {
      this.api.setFallbackEditable(value);
    }
    get shiftEnterBehavior() {
      return this.api.getShiftEnterBehavior();
    }
    _onSourceBeforeInput(event) {
      this._beforeInputSnapshot = null;
      this._sourceInputIntent = null;
      if (this.disabled || this.readonly) {
        event.preventDefault();
        return;
      }
      const composing = this._isComposing || event.isComposing;
      const inputType = event.inputType || "";
      if (!composing && (inputType === "historyUndo" || inputType === "historyRedo")) {
        event.preventDefault();
        inputType === "historyUndo" ? this.api._undo({ source: "user", inputType }) : this.api._redo({ source: "user", inputType });
        return;
      }
      const snapshot = this.api._snapshot();
      this._sourceInputIntent = { snapshot, inputType, data: event.data };
      if (!composing) this._beforeInputSnapshot = snapshot;
    }
    _onSourceInput(event) {
      const intent = this._sourceInputIntent;
      this._sourceInputIntent = null;
      if (this.disabled || this.readonly) {
        this._sourceTextarea.value = this._value;
        this._sourceTextarea.setSelectionRange(
          this._selection.start,
          this._selection.end,
          this._selection.direction
        );
        this._beforeInputSnapshot = null;
        this._sourceInputIntent = null;
        return;
      }
      const composing = this._isComposing || event?.isComposing;
      const before = composing ? null : this._beforeInputSnapshot || makeSnapshot(
        this._value,
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      const previousValue = this._value;
      this._value = normalizeLineEndings(this._sourceTextarea.value);
      this._pendingFenceOpening = null;
      if (this._sourceTextarea.value !== this._value) this._sourceTextarea.value = this._value;
      this._selection = { start: this._sourceTextarea.selectionStart, end: this._sourceTextarea.selectionEnd, direction: this._sourceTextarea.selectionDirection || "none" };
      const after = this.api._snapshot();
      const inputType = event?.inputType || intent?.inputType || "";
      const inferred = intent?.snapshot.value === previousValue ? inferSourceTextChanges(previousValue, this._value, intent.snapshot.selection, inputType, event?.data ?? intent.data, after.selection) : null;
      const changes = inferred ?? diffTextChange(previousValue, this._value);
      this._beforeInputSnapshot = null;
      if (previousValue === this._value) {
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      if (composing && inferred === null) this._compositionChanges = null;
      this._trackCompositionChanges(previousValue, this._value, changes);
      if (before) this.api._recordUndo(before, after, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward", changes });
      this._redoStack.length = 0;
      this.api._afterValueChanged({ source: "user", inputType: event?.inputType, restoreSelection: false, previousValue, changes });
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
    _onCompositionStart() {
      if (this.disabled || this.readonly || this._isComposing) return;
      this._compositionSnapshot = this.api._snapshot();
      this._compositionChanges = [];
      this._compositionValue = this._value;
      this._sourceInputIntent = null;
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      this._isComposing = true;
      this.api._closeCompletion();
    }
    _onCompositionEnd() {
      if (!this._isComposing) return;
      const before = this._compositionSnapshot;
      const after = this.api._snapshot();
      const changes = before && this._compositionValue === after.value && this._compositionChanges && applyTextChanges(before.value, this._compositionChanges) === after.value ? this._compositionChanges : null;
      this._compositionChanges = null;
      this._compositionValue = null;
      this._sourceInputIntent = null;
      this._isComposing = false;
      this._compositionSnapshot = null;
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      if (before && before.value !== after.value) this.api._recordUndo(before, after, "composition", changes ? { changes } : void 0);
      if (before && before.value !== after.value) this._redoStack.length = 0;
      if (this.api._isLiveVisible() && this._liveDirty) {
        this.api._renderAll({
          restoreSelection: true,
          previousValue: before?.value ?? this._value,
          changes: changes ?? (before ? diffTextChange(before.value, this._value) : null),
          force: true
        });
      }
      this.api._scheduleCompletionUpdate();
    }
    _trackCompositionChanges(previousValue, nextValue, changes) {
      if (!this._isComposing || !this._compositionSnapshot) return;
      if (this._compositionChanges === null || this._compositionValue !== previousValue) {
        this._compositionChanges = null;
        this._compositionValue = nextValue;
        return;
      }
      const composed = composeTextChanges(this._compositionSnapshot.value, this._compositionChanges, changes);
      this._compositionChanges = applyTextChanges(this._compositionSnapshot.value, composed) === nextValue ? composed : null;
      this._compositionValue = nextValue;
    }
    _onLiveBeforeInput(event) {
      if (this._isComposing || event?.isComposing) return;
      this._ignoreSelectionChangeCount = 0;
      this._structuredSelection = null;
      this._webKitNativeInput = null;
      const inputType = event?.inputType || "";
      const targetRange = this._sourceSelectionFromBeforeInput(event);
      const inputTarget = this._inputTargetFromBeforeInput(event, targetRange);
      this._beforeInputTarget = inputTarget;
      this.api._debug(1, "live.beforeinput", {
        inputType,
        cancelable: Boolean(event?.cancelable),
        composing: Boolean(event?.isComposing),
        targetSelection: targetRange?.selection || null,
        targetStart: this.api._debugEditableInfo(targetRange?.startEditable),
        targetEnd: this.api._debugEditableInfo(targetRange?.endEditable)
      });
      if (inputType.startsWith("insert") && targetRange?.selection) {
        this._selection = { ...targetRange.selection };
        this._structuredSelection = { ...targetRange.selection };
      }
      if (this._liveSelectionAPI === false && inputTarget) {
        const targetHasSelection = inputTarget.selection.start !== inputTarget.selection.end;
        const modelHasSelection = this._selection.start !== this._selection.end;
        if (!this._fallbackSelectionPending || targetHasSelection && !modelHasSelection) {
          this._selection = { ...inputTarget.selection };
        }
        this._fallbackEditable = inputTarget.editable;
      }
      if (this._value.length === 0 && inputType.startsWith("delete")) {
        event.preventDefault();
        this._beforeInputTarget = null;
        this.api._ensureEmptyLiveEditable();
        return;
      }
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly && (inputType === "historyUndo" || inputType === "historyRedo")) {
        event.preventDefault();
        this._beforeInputTarget = null;
        inputType === "historyUndo" ? this.api._undo({ source: "user", inputType }) : this.api._redo({ source: "user", inputType });
        return;
      }
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly && inputType === "insertText" && event.data != null && this._applyLiveMarkdownInsertBeforeInput(event, inputType)) {
        this._beforeInputTarget = null;
        return;
      }
      const preserveNativeFenceInsert = inputType === "insertText" && event.data != null && this._shouldPreserveNativeFenceInsert(this.api._getContext(), event.data);
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly && this.api._isAppleWebKitRuntime() && !this.api._isIOSWebKitRuntime() && event?.isTrusted && event?.cancelable && !preserveNativeFenceInsert && (inputType === "insertText" || inputType === "insertReplacementText") && event.data != null && this._applyFallbackBeforeInput(event, inputTarget)) {
        this._beforeInputTarget = null;
        return;
      }
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly && (inputType === "insertParagraph" || inputType === "insertLineBreak")) {
        event.preventDefault();
        this._beforeInputTarget = null;
        const ctx = this.api._getContext();
        const actionId = inputType === "insertLineBreak" && this.shiftEnterBehavior === "soft-break" && !this.api._isUnclosedFenceOpeningContext(ctx) ? "editor.insertSoftBreak" : "editor.smartEnter";
        this.api._runAction(actionId, void 0, {
          source: "user",
          inputType,
          apply: true
        });
        return;
      }
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly && inputType.startsWith("delete") && this._applyLiveDeletionBeforeInput(event, inputType, targetRange)) {
        this._beforeInputTarget = null;
        return;
      }
      if (!this.api._isSourceActive() && !this.disabled && !this.readonly) {
        const ctx = this.api._getContext();
        const hasSelection = ctx.selectionStart !== ctx.selectionEnd;
        const editable = this.api._closestEditable(event.target) || this.api._activeEditableFromSelection();
        const editableRange = this.api._editableSourceRange(editable);
        const selectionInsideTableCell = editable?.dataset.editable === "cell" && editableRange && ctx.selectionStart >= editableRange.from && ctx.selectionEnd <= editableRange.to;
        if (hasSelection && inputType.startsWith("insert") && event.data != null && !selectionInsideTableCell) {
          event.preventDefault();
          this._beforeInputTarget = null;
          const text = normalizeLineEndings(event.data);
          this.api._applyActionResult("editor.replaceSelection", insertionTransaction(ctx, "editor.replaceSelection", text, text.length, "typing"), { source: "user", inputType });
          return;
        }
      }
      if (this._liveSelectionAPI === false && this._applyFallbackBeforeInput(event, inputTarget)) {
        this._beforeInputTarget = null;
        return;
      }
      this._beforeInputSnapshot = this.api._snapshot();
    }
    _applyLiveMarkdownInsertBeforeInput(event, inputType) {
      const ctx = this.api._getContext();
      const candidate = this._liveMarkdownInsertCandidate(ctx, event.data);
      if (!candidate) return false;
      const { actionId, result, strategy, text } = candidate;
      event.preventDefault();
      if (!event.defaultPrevented) return false;
      this.api._debug(1, "live.insert.source-backed", {
        inputType,
        strategy,
        timing: "beforeinput",
        textLength: text.length,
        selectionBefore: {
          start: ctx.selectionStart,
          end: ctx.selectionEnd,
          direction: ctx.selectionDirection
        },
        selectionAfter: result.ok ? result.transaction?.selectionAfter : void 0
      });
      this.api._applyActionResult(actionId, result, {
        source: "user",
        inputType
      });
      return true;
    }
    _liveMarkdownInsertCandidate(ctx, input) {
      const text = normalizeLineEndings(input);
      if (!text || text.includes("\n")) return false;
      const nextValue = applyTextChanges(ctx.value, [{
        from: ctx.selectionStart,
        to: ctx.selectionEnd,
        insert: text
      }]);
      const nextCursor = ctx.selectionStart + text.length;
      const currentLine = getLineRange(ctx.value, ctx.selectionStart);
      const nextLine = getLineRange(nextValue, nextCursor);
      const smartDashBreak = /^(\s{0,3})[\u2013\u2014]-$/.exec(nextLine.text);
      if (smartDashBreak && currentLine.start === nextLine.start && ctx.selectionEnd <= currentLine.end) {
        const insert = `${smartDashBreak[1] ?? ""}---`;
        const cursor = currentLine.start + insert.length;
        return {
          actionId: "editor.replaceSelection",
          result: ok(tx(
            ctx,
            "editor.replaceSelection",
            [{ from: currentLine.start, to: currentLine.end, insert }],
            { start: cursor, end: cursor, direction: "none" },
            "markdownShortcut"
          )),
          strategy: "smart-punctuation-thematic-break",
          text
        };
      }
      if (this._shouldPreserveNativeFenceInsert(ctx, text)) return false;
      let actionId = "editor.replaceSelection";
      let result = text === " " ? this.api._markdownShortcut(ctx) : null;
      let strategy = "markdown-shortcut";
      if (!result?.ok || !result.transaction) {
        result = null;
        const currentBlock = parseBlocks(ctx.value, this.api._parseOptions()).find((block) => ctx.selectionStart >= block.from && ctx.selectionStart <= Math.max(block.to, block.from));
        const nextBlock = parseBlocks(nextValue, this.api._parseOptions()).find((block) => nextCursor >= block.from && nextCursor <= Math.max(block.to, block.from));
        if (nextBlock?.type === "code-fence" && currentBlock?.type !== "code-fence") return false;
        if (!nextBlock || !LIVE_STRUCTURAL_BLOCK_TYPES.has(nextBlock.type) || currentBlock?.type === nextBlock.type) return false;
        result = insertionTransaction(
          ctx,
          actionId,
          text,
          text.length,
          "markdownShortcut"
        );
        strategy = "structural-transition";
      } else {
        actionId = "editor.markdownShortcut";
      }
      return { actionId, result, strategy, text };
    }
    _shouldPreserveNativeFenceInsert(ctx, input) {
      const text = normalizeLineEndings(input);
      if (!ctx || !text || text.includes("\n")) return false;
      if (this.api._isUnclosedFenceOpeningContext(ctx)) return true;
      const nextValue = applyTextChanges(ctx.value, [{
        from: ctx.selectionStart,
        to: ctx.selectionEnd,
        insert: text
      }]);
      const nextCursor = ctx.selectionStart + text.length;
      const currentBlock = parseBlocks(ctx.value, this.api._parseOptions()).find((block) => ctx.selectionStart >= block.from && ctx.selectionStart <= Math.max(block.to, block.from));
      const nextBlock = parseBlocks(nextValue, this.api._parseOptions()).find((block) => nextCursor >= block.from && nextCursor <= Math.max(block.to, block.from));
      return nextBlock?.type === "code-fence" && currentBlock?.type !== "code-fence";
    }
    _applyLiveMarkdownInsertAfterInput(inputType, previousValue, nextValue) {
      if (!["insertText", "insertReplacementText"].includes(inputType) || previousValue === nextValue) return false;
      const changes = diffTextChange(previousValue, nextValue);
      if (changes.length !== 1) return false;
      const change = requireItem(changes, 0);
      const selectionBefore = {
        start: change.from,
        end: change.to,
        direction: "none"
      };
      const ctx = this.api._getContext(selectionBefore);
      const candidate = this._liveMarkdownInsertCandidate(ctx, change.insert);
      if (!candidate) return false;
      const { actionId, result, strategy, text } = candidate;
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      this._selection = { ...selectionBefore };
      this._structuredSelection = { ...selectionBefore };
      this.api._debug(1, "live.insert.source-backed", {
        inputType,
        strategy,
        timing: "input",
        textLength: text.length,
        selectionBefore: {
          start: ctx.selectionStart,
          end: ctx.selectionEnd,
          direction: ctx.selectionDirection
        },
        selectionAfter: result.ok ? result.transaction?.selectionAfter : void 0
      });
      const applied = this.api._applyActionResult(actionId, result, {
        source: "user",
        inputType
      });
      if (!applied?.ok) {
        this._structuredSelection = null;
        this._selection = { ...selectionBefore };
        this.api._renderAll({ restoreSelection: true, force: true });
      }
      return true;
    }
    _isPendingFenceOpening(value, cursor, previousValue = null) {
      const line = getLineRange(value, cursor);
      if (cursor !== line.end || line.end >= value.length || value[line.end] !== "\n") {
        return false;
      }
      const match = /^(\s*)(`{3,}|~{3,})([\w+-]*)$/.exec(line.text);
      if (!match) return false;
      const opener = getFenceInfo(line.text);
      if (!opener || isInsideFence(value, line.start)) return false;
      const activePending = this._pendingFenceOpening;
      if (activePending && activePending.start === line.start && activePending.marker === opener.marker) {
        return true;
      }
      const previousCursor = clamp(
        this._selection.start,
        0,
        previousValue?.length ?? 0
      );
      const previousLine = previousValue == null ? null : getLineRange(previousValue, previousCursor);
      const createdNow = previousLine && !getFenceInfo(previousLine.text);
      if (!createdNow && hasClosingFenceAfter(value, line.end, opener)) {
        return false;
      }
      this._pendingFenceOpening = {
        start: line.start,
        marker: opener.marker
      };
      return true;
    }
    _shouldUseAppleWebKitNativeDeletion(event, inputType, targetRange) {
      if (!event?.isTrusted || !this.api._isAppleWebKitRuntime()) return false;
      if (!inputType.startsWith("delete")) return false;
      const selection = targetRange?.selection;
      if (!selection || selection.start === selection.end) return false;
      const editables = [targetRange.startEditable, targetRange.endEditable];
      return editables.every((editable) => {
        if (!editable || editable.dataset.editable !== "line") return false;
        return !["task-list-item", "code-line", "horizontal-rule"].includes(
          editable.dataset.kind || ""
        );
      });
    }
    _applyLiveDeletionBeforeInput(event, inputType, targetRange) {
      if (targetRange && this._shouldUseAppleWebKitNativeDeletion(event, inputType, targetRange)) {
        const selection = targetRange.selection;
        this._webKitNativeInput = {
          changes: [{
            from: selection.start,
            to: selection.end,
            insert: ""
          }],
          inputType,
          selectionAfter: {
            start: selection.start,
            end: selection.start,
            direction: "none"
          }
        };
        this.api._debug(1, "live.delete.browser-owned", {
          inputType,
          reason: "webkit-native-selection",
          targetSelection: selection
        });
        return false;
      }
      if (!event?.cancelable) {
        this.api._debug(1, "live.delete.browser-owned", {
          inputType,
          reason: "beforeinput-not-cancelable"
        });
        return false;
      }
      const current = this.api._getCurrentSelection();
      const currentCollapsed = current.start === current.end;
      const targetSelection = targetRange?.selection || null;
      const backward = inputType.includes("Backward");
      const forward = inputType.includes("Forward");
      const caret = currentCollapsed && targetSelection ? backward ? targetSelection.end : targetSelection.start : backward ? current.start : current.end;
      if (inputType === "deleteContentBackward" && currentCollapsed) {
        const smartSelection = { start: caret, end: caret, direction: "none" };
        const result = this.api._smartBackspace(this.api._getContext(smartSelection));
        if (result?.ok && result.transaction) {
          event.preventDefault();
          if (!event.defaultPrevented) return false;
          this.api._debug(1, "live.delete.source-backed", {
            inputType,
            strategy: "smart-backspace",
            targetSelection,
            selectionAfter: result.ok ? result.transaction?.selectionAfter : void 0
          });
          this.api._applyActionResult("editor.smartBackspace", result, {
            source: "user",
            inputType
          });
          return true;
        }
      }
      let start = Math.min(current.start, current.end);
      let end = Math.max(current.start, current.end);
      if (targetSelection && targetSelection.start !== targetSelection.end) {
        start = targetSelection.start;
        end = targetSelection.end;
      } else if (start === end && backward && start > 0) {
        start = previousGraphemeOffset(this._value, start);
      } else if (start === end && forward && end < this._value.length) {
        end = nextGraphemeOffset(this._value, end);
      }
      const crossesTableBoundary = targetRange?.startEditable !== targetRange?.endEditable && (targetRange?.startEditable?.dataset?.editable === "cell" || targetRange?.endEditable?.dataset?.editable === "cell");
      event.preventDefault();
      if (!event.defaultPrevented) return false;
      if (crossesTableBoundary || start === end) {
        this.api._debug(1, "live.delete.noop", {
          inputType,
          reason: crossesTableBoundary ? "table-boundary" : "document-boundary",
          targetSelection
        });
        return true;
      }
      const selectionAfter = {
        start,
        end: start,
        direction: "none"
      };
      const changes = [{ from: start, to: end, insert: "" }];
      this.api._debug(1, "live.delete.source-backed", {
        inputType,
        strategy: targetSelection ? "target-range" : "model-selection",
        targetSelection,
        changes: this.api._debugTextChanges(changes),
        selectionAfter
      });
      this._applySourceBackedInput(inputType, changes, selectionAfter);
      return true;
    }
    _onLiveInput(event) {
      if (this.disabled || this.readonly) {
        this._beforeInputSnapshot = null;
        this._beforeInputTarget = null;
        this.api._renderAll({ restoreSelection: !this.disabled, force: true });
        return;
      }
      this._ignoreSelectionChangeCount = 0;
      this._structuredSelection = null;
      const webKitNativeInput = this._webKitNativeInput;
      this._webKitNativeInput = null;
      if (webKitNativeInput) {
        this._commitWebKitNativeInput(event, webKitNativeInput);
        return;
      }
      const inputTarget = this._beforeInputTarget;
      const editable = this.api._closestEditable(event.target) || inputTarget?.editable || this.api._activeEditableFromSelection();
      this._beforeInputTarget = null;
      this.api._debug(1, "live.input", {
        inputType: event?.inputType || "",
        composing: Boolean(this._isComposing || event?.isComposing),
        editable: this.api._debugEditableInfo(editable),
        beforeInputSelection: inputTarget?.selection || null
      });
      if (!editable) return;
      const composing = this._isComposing || event?.isComposing;
      const before = composing ? null : this._beforeInputSnapshot || makeSnapshot(
        this._value,
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      const from = Number(editable.dataset.from);
      const to = Number(editable.dataset.to);
      const raw = this.api._plainText(editable).replace(/\n/g, "");
      const liveSelection = this.api._getLiveSelection(editable);
      const changedDisplay = inputTarget ? diffTextChange(inputTarget.text, raw)[0] : null;
      const inferredDisplayCursor = changedDisplay ? changedDisplay.from + changedDisplay.insert.length : null;
      const compositionSourceCursor = composing && this._compositionSnapshot?.selection && event?.data != null ? this._compositionSnapshot.selection.start + String(event.data).length : null;
      const compositionDisplayStart = compositionSourceCursor != null ? this.api._displayOffsetFromSourceOffset(
        editable,
        this._compositionSnapshot?.selection.start ?? 0
      ) : null;
      const compositionDisplayCursor = compositionDisplayStart == null ? null : compositionDisplayStart + String(event.data).length;
      const tableDisplayCursor = editable.dataset.editable === "cell" ? compositionDisplayCursor ?? this.api._displayOffsetFromSelection(editable) ?? inferredDisplayCursor : null;
      const tableEdit = editable.dataset.editable === "cell" ? this.api._tableCellInputEdit(editable, raw, tableDisplayCursor) : null;
      if (tableEdit) {
        const previousValue2 = this._value;
        this._value = tableEdit.nextValue;
        this._selection = { start: tableEdit.cursor, end: tableEdit.cursor, direction: "none" };
        if (composing) {
          editable.dataset.from = String(tableEdit.cellFrom);
          editable.dataset.to = String(tableEdit.cellTo);
          const table = editable.closest(".md-table-block");
          if (table) {
            table.dataset.from = String(tableEdit.blockFrom);
            table.dataset.to = String(tableEdit.blockTo);
          }
        }
        const after2 = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
        this._beforeInputSnapshot = null;
        if (previousValue2 === this._value) {
          if (!this._isComposing) this.api._scheduleCompletionUpdate();
          return;
        }
        const changes2 = diffTextChange(previousValue2, this._value);
        if (composing) this._compositionChanges = null;
        this._trackCompositionChanges(previousValue2, this._value, changes2);
        if (before) this.api._recordUndo(before, after2, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward", changes: changes2 });
        this._redoStack.length = 0;
        this.api._afterValueChanged({
          source: "user",
          inputType: event?.inputType,
          restoreSelection: true,
          previousValue: previousValue2,
          changes: changes2,
          preserveLiveDom: this.api._isAppleWebKitRuntime()
        });
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      let insert = raw;
      let virtualPrefixLength = 0;
      if (editable.dataset.editable === "virtual-code" || editable.dataset.editable === "virtual-code-after" || editable.dataset.editable === "virtual-hr-after" || editable.dataset.editable === "virtual-setext-after" || editable.dataset.editable === "virtual-table-after") {
        const beforeSource = this._value.slice(0, from);
        if (!beforeSource.endsWith("\n")) {
          insert = `
${raw}`;
          virtualPrefixLength = 1;
        }
      }
      const previousValue = this._value;
      const nextValue = previousValue.slice(0, from) + insert + previousValue.slice(to);
      const liveCursor = liveSelection?.end != null ? liveSelection.end - from : inferredDisplayCursor ?? insert.length - virtualPrefixLength;
      const cursor = compositionSourceCursor == null ? clamp(from + virtualPrefixLength + liveCursor, from, from + insert.length) : clamp(compositionSourceCursor, from, from + insert.length);
      if (!composing && this._applyLiveMarkdownInsertAfterInput(
        event?.inputType || "",
        previousValue,
        nextValue
      )) return;
      const pendingFenceOpening = !composing && this._isPendingFenceOpening(nextValue, cursor, previousValue);
      if (pendingFenceOpening) {
        editable.dataset.to = String(from + insert.length);
      }
      const previousSelection = { ...this._selection };
      this._value = nextValue;
      this._selection = { start: cursor, end: cursor, direction: "none" };
      if (composing) editable.dataset.to = String(from + insert.length);
      const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
      this._beforeInputSnapshot = null;
      if (previousValue === this._value) {
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      const inferred = inferSourceTextChanges(previousValue, this._value, inputTarget?.selection ?? previousSelection, event?.inputType || "", event?.data ?? null, this._selection);
      const changes = inferred ?? [{ from, to, insert }];
      if (composing && inferred === null) this._compositionChanges = null;
      this._trackCompositionChanges(previousValue, this._value, changes);
      if (before) this.api._recordUndo(before, after, this.api._undoGroupForInput(event?.inputType), { coalesce: event?.inputType === "insertText" || event?.inputType === "deleteContentBackward", changes });
      this._redoStack.length = 0;
      this.api._afterValueChanged({
        source: "user",
        inputType: event?.inputType,
        restoreSelection: true,
        previousValue,
        changes,
        preserveLiveDom: this.api._isAppleWebKitRuntime() || pendingFenceOpening
      });
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
    _commitWebKitNativeInput(event, pending) {
      const inputType = event?.inputType || pending.inputType;
      const before = this._beforeInputSnapshot || makeSnapshot(
        this._value,
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      const previousValue = this._value;
      this._value = applyTextChanges(previousValue, pending.changes);
      this._selection = {
        start: clamp(pending.selectionAfter.start, 0, this._value.length),
        end: clamp(pending.selectionAfter.end, 0, this._value.length),
        direction: pending.selectionAfter.direction || "none"
      };
      const after = makeSnapshot(
        this._value,
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      this._beforeInputSnapshot = null;
      this._beforeInputTarget = null;
      if (previousValue === this._value) {
        if (!this._isComposing) this.api._scheduleCompletionUpdate();
        return;
      }
      this._trackCompositionChanges(previousValue, this._value, pending.changes);
      this.api._recordUndo(before, after, this.api._undoGroupForInput(inputType), {
        changes: pending.changes,
        coalesce: inputType === "deleteContentBackward" || inputType === "deleteContentForward"
      });
      this._redoStack.length = 0;
      this.api._afterValueChanged({
        source: "user",
        inputType,
        restoreSelection: false,
        previousValue,
        changes: pending.changes,
        preserveLiveDom: true
      });
      this.api._debug(1, "live.input.browser-owned", {
        inputType,
        changes: this.api._debugTextChanges(pending.changes),
        selectionAfter: { ...this._selection }
      });
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
    _sourceSelectionFromBeforeInput(event) {
      const range = event?.getTargetRanges?.()[0];
      if (!range) return null;
      const startElement = range.startContainer?.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer?.parentElement;
      const endElement = range.endContainer?.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer?.parentElement;
      const startEditable = this.api._closestEditable(startElement);
      const endEditable = this.api._closestEditable(endElement);
      if (!startEditable || !endEditable) return null;
      const start = this.api._sourceOffsetFromDom(startEditable, range.startContainer, range.startOffset);
      const end = this.api._sourceOffsetFromDom(endEditable, range.endContainer, range.endOffset);
      if (start == null || end == null) return null;
      return {
        selection: {
          start: Math.min(start, end),
          end: Math.max(start, end),
          direction: start <= end ? "forward" : "backward"
        },
        startEditable,
        endEditable
      };
    }
    _inputTargetFromBeforeInput(event, targetRange = this._sourceSelectionFromBeforeInput(event)) {
      if (!targetRange || targetRange.startEditable !== targetRange.endEditable) return null;
      const editable = targetRange.startEditable;
      return {
        editable,
        selection: targetRange.selection,
        text: this.api._plainText(editable)
      };
    }
    _applyFallbackBeforeInput(event, inputTarget) {
      const inputType = event?.inputType || "";
      const selection = this._selection;
      const editable = inputTarget?.editable || this._fallbackEditable;
      let start = Math.min(selection.start, selection.end);
      let end = Math.max(selection.start, selection.end);
      let insert = "";
      if (inputType.startsWith("insert") && event.data != null) {
        insert = normalizeLineEndings(event.data);
      } else if (inputType.startsWith("delete")) {
        if (start === end && inputTarget && inputTarget.selection.start !== inputTarget.selection.end) {
          start = inputTarget.selection.start;
          end = inputTarget.selection.end;
        } else if (start === end && inputType.includes("Backward") && start > 0) {
          start = previousGraphemeOffset(this._value, start);
        } else if (start === end && inputType.includes("Forward") && end < this._value.length) {
          end = nextGraphemeOffset(this._value, end);
        }
        if (start === end) return false;
      } else {
        return false;
      }
      if (editable?.dataset.editable === "cell") {
        const raw = this.api._plainText(editable);
        const displayStart = this.api._displayOffsetFromSourceOffset(editable, start);
        const displayEnd = this.api._displayOffsetFromSourceOffset(editable, end);
        const nextRaw = raw.slice(0, displayStart) + insert + raw.slice(displayEnd);
        const tableEdit = this.api._tableCellInputEdit(
          editable,
          nextRaw,
          displayStart + insert.length
        );
        if (!tableEdit) return false;
        event.preventDefault();
        this._applySourceBackedInput(
          inputType,
          diffTextChange(this._value, tableEdit.nextValue),
          { start: tableEdit.cursor, end: tableEdit.cursor, direction: "none" }
        );
        return true;
      }
      if (inputType.startsWith("insert") && ["virtual-code", "virtual-code-after", "virtual-hr-after", "virtual-setext-after", "virtual-table-after"].includes(editable?.dataset.editable || "") && !this._value.slice(0, start).endsWith("\n")) {
        insert = `
${insert}`;
      }
      event.preventDefault();
      this._applySourceBackedInput(inputType, [{ from: start, to: end, insert }], {
        start: start + insert.length,
        end: start + insert.length,
        direction: "none"
      });
      return true;
    }
    _applySourceBackedInput(inputType, changes, selectionAfter) {
      const before = this.api._snapshot();
      const previousValue = this._value;
      this._value = applyTextChanges(previousValue, changes);
      this._selection = {
        start: clamp(selectionAfter.start, 0, this._value.length),
        end: clamp(selectionAfter.end, 0, this._value.length),
        direction: selectionAfter.direction || "none"
      };
      const after = makeSnapshot(
        this._value,
        this._selection.start,
        this._selection.end,
        this._selection.direction
      );
      this._trackCompositionChanges(previousValue, this._value, changes);
      this.api._recordUndo(before, after, this.api._undoGroupForInput(inputType), {
        changes,
        coalesce: inputType === "insertText" || inputType === "deleteContentBackward" || inputType === "deleteContentForward"
      });
      this._redoStack.length = 0;
      this.api._afterValueChanged({
        source: "user",
        inputType,
        restoreSelection: true,
        previousValue,
        changes
      });
      this.api._debug(1, "live.input.source-backed", {
        inputType,
        changes: this.api._debugTextChanges(changes),
        selectionAfter: { ...this._selection }
      });
      if (!this._isComposing) this.api._scheduleCompletionUpdate();
    }
  };

  // src/core/state.ts
  var DocumentState = class {
    static {
      __name(this, "DocumentState");
    }
    _value = "";
    revision = 0;
    get value() {
      return this._value;
    }
    set value(value) {
      if (value !== this._value) {
        this._value = value;
        this.revision += 1;
      }
    }
    constructor() {
      this.value = "";
      this.defaultValue = "";
      this.selection = { start: 0, end: 0, direction: "none" };
      this.dirty = false;
    }
  };

  // src/core/history.ts
  var UndoHistory = class {
    static {
      __name(this, "UndoHistory");
    }
    constructor(maxEntries = 300, clock = now) {
      this.undoStack = [];
      this.redoStack = [];
      this.maxEntries = maxEntries;
      this.clock = clock;
    }
    record(before, after, group, { coalesce = false, changes } = {}) {
      if (!before || !after) return;
      if (before.value === after.value && sameSelection(before.selection, after.selection)) return;
      const supplied = changes ? normalizeChanges([...changes]) : null;
      const canonical = supplied && supplied.every((change, index) => Number.isSafeInteger(change.from) && Number.isSafeInteger(change.to) && change.from >= 0 && change.to >= change.from && change.to <= before.value.length && (!index || supplied[index - 1].to <= change.from)) && applyTextChanges(before.value, supplied) === after.value ? supplied : diffTextChanges(before.value, after.value);
      const latest = this.undoStack.at(-1);
      const timestamp = this.clock();
      if (coalesce && latest && latest.after.value === before.value && latest.group === group && timestamp - latest.timestamp < 900) {
        latest.changes = composeTextChanges(latest.before.value, latest.changes ?? diffTextChanges(latest.before.value, latest.after.value), canonical);
        latest.after = after;
        latest.timestamp = timestamp;
        return;
      }
      this.undoStack.push({ before, after, group, timestamp, changes: canonical });
      if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
    }
    undo(current) {
      const entry = this.undoStack.pop();
      if (!entry) return null;
      this.redoStack.push({ before: entry.before, after: current, group: entry.group, timestamp: this.clock(), changes: current.value === entry.after.value && entry.changes ? entry.changes : diffTextChanges(entry.before.value, current.value) });
      return entry.before;
    }
    redo(current) {
      const entry = this.redoStack.pop();
      if (!entry) return null;
      this.undoStack.push({ before: current, after: entry.after, group: entry.group, timestamp: this.clock(), changes: current.value === entry.before.value && entry.changes ? entry.changes : diffTextChanges(current.value, entry.after.value) });
      return entry.after;
    }
  };

  // src/browser/util.ts
  function displayShortcut(shortcut) {
    if (!shortcut) return "";
    const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
    return shortcut.replace(/Mod/g, isMac ? "\u2318" : "Ctrl").replace(/Alt/g, isMac ? "\u2325" : "Alt").replace(/Shift/g, isMac ? "\u21E7" : "Shift");
  }
  __name(displayShortcut, "displayShortcut");
  function uid(prefix = "mfe") {
    return `${prefix}-${Math.random().toString(36).slice(2)}`;
  }
  __name(uid, "uid");

  // src/browser/completions.ts
  var CompletionController = class {
    static {
      __name(this, "CompletionController");
    }
    constructor(api) {
      this.api = Object.freeze(api);
      this._providers = /* @__PURE__ */ new Map();
      this._completion = { status: "closed", open: false, providerId: null, match: null, items: [], activeIndex: 0, requestId: 0, abort: null };
      this._completionUpdateFrame = 0;
    }
    disconnect() {
      this._completion.abort?.abort();
      if (this._completionUpdateFrame) cancelAnimationFrame(this._completionUpdateFrame);
      this._completionUpdateFrame = 0;
    }
    _installBuiltInProviders() {
      this.api.registerProvider({ id: "slash", priority: 100, triggers: ["/"], match: /* @__PURE__ */ __name((ctx) => this._matchSlash(ctx), "match"), getItems: /* @__PURE__ */ __name((match) => this._getSlashItems(match), "getItems"), apply: /* @__PURE__ */ __name((item, match, ctx) => this._applySlashItem(item, match, ctx), "apply") });
      this.api.registerProvider({ id: "tags", priority: 80, triggers: ["#"], match: /* @__PURE__ */ __name((ctx) => this._matchTag(ctx), "match"), getItems: /* @__PURE__ */ __name((match, ctx, signal) => this._getTagItems(match, ctx, signal), "getItems"), apply: /* @__PURE__ */ __name((item, match, ctx) => this._applyTagItem(item, match, ctx), "apply") });
      this.api.registerProvider({ id: "code-language", priority: 60, triggers: ["```", "~~~"], match: /* @__PURE__ */ __name((ctx) => this._matchCodeLanguage(ctx), "match"), getItems: /* @__PURE__ */ __name((match) => this._getLanguageItems(match), "getItems"), apply: /* @__PURE__ */ __name((item, match, ctx) => this._applyCodeLanguageItem(item, match, ctx), "apply") });
    }
    _getLanguageItems(match) {
      const q = match.query.toLowerCase();
      const alias = ALIASES.get(q);
      return LANGUAGES.map((lang) => ({ lang, score: !q ? 0 : lang === q || lang === alias ? -100 : lang.startsWith(q) ? -50 : lang.includes(q) ? -10 : 0 })).filter((x) => !q || x.score < 0).sort((a, b) => a.score - b.score || a.lang.localeCompare(b.lang)).slice(0, 16).map((x) => ({ id: x.lang, label: x.lang, detail: "code language", kind: "code-language" }));
    }
    async _getTagItems(match, ctx, signal) {
      if (!this.api.tagsEnabled() || signal.aborted) return [];
      const queryKey = normalizeTagKey(match.query);
      const items = /* @__PURE__ */ new Map();
      for (const tag of this.api.getTagIndex()) {
        const hasOtherRange = tag.ranges.some((range) => range.from !== match.from || range.to !== match.to);
        if (!hasOtherRange || queryKey && !tag.key.startsWith(queryKey)) continue;
        items.set(tag.key, {
          id: `tag:${tag.key}`,
          label: `#${tag.value}`,
          detail: "in document",
          kind: "tag",
          value: tag.value,
          key: tag.key,
          document: true
        });
      }
      const provider = this.api.getTagProvider();
      const supplied = provider ? await provider.getItems({ query: match.query, documentTags: this.api.getTags(), context: ctx, signal }) : [];
      if (signal.aborted || !this.api.tagsEnabled()) return [];
      for (const suppliedItem of supplied || []) {
        const source = typeof suppliedItem === "string" ? { value: suppliedItem } : suppliedItem;
        const value = String(source?.value ?? source?.label ?? "").trim().replace(/^#/, "");
        if (!isValidTagValue(value)) continue;
        const key = normalizeTagKey(value);
        if (queryKey && !key.startsWith(queryKey)) continue;
        const documentItem = items.get(key);
        items.set(key, {
          ...source,
          id: String(source?.id || `tag:${key}`),
          label: String(source?.label || `#${value}`),
          detail: String(source?.detail || documentItem?.detail || "tag"),
          kind: String(source?.kind || "tag"),
          value,
          key,
          document: Boolean(documentItem)
        });
      }
      const output = [...items.values()].slice(0, 24);
      const exact = items.has(queryKey);
      if (provider?.allowCreate === true && isValidTagValue(match.query) && !exact) {
        output.push({
          id: `tag-create:${queryKey}`,
          label: `Add #${match.query} to catalog`,
          detail: "save for autocomplete",
          kind: "tag-create",
          value: match.query,
          key: queryKey
        });
      }
      return output;
    }
    _matchTag(ctx) {
      if (!this.api.tagsEnabled()) return null;
      if (ctx.block.kind === "fenced-code" || ctx.inline.insideInlineCode) return null;
      const cursor = ctx.selectionStart - ctx.currentLine.start;
      const before = ctx.currentLine.text.slice(0, cursor);
      const next = [...ctx.currentLine.text.slice(cursor)][0];
      if (next === "/" || isTagBodyCharacter(next)) return null;
      const hash = before.lastIndexOf("#");
      if (hash < 0 || isBackslashEscaped(before, hash) || !isTagBoundary(before, hash)) return null;
      const query = before.slice(hash + 1);
      if (query.startsWith("/") || query.includes("//")) return null;
      if (![...query].every((char) => char === "/" || isTagBodyCharacter(char))) return null;
      return {
        from: ctx.currentLine.start + hash,
        to: ctx.selectionStart,
        trigger: "#",
        query,
        providerId: "tags"
      };
    }
    _applyTagItem(item, match, ctx) {
      if (!this.api.tagsEnabled()) return fail("not-applicable");
      const value = String(item.value || "").replace(/^#/, "");
      if (!isValidTagValue(value)) return fail("not-applicable");
      const insert = `#${value} `;
      const cursor = match.from + insert.length;
      return ok(tx(
        ctx,
        "completion.accept",
        [{ from: match.from, to: match.to, insert }],
        { start: cursor, end: cursor, direction: "none" },
        "completion"
      ), item.kind === "tag-create" ? `Catalog addition selected for ${value}.` : `Tag ${value}.`);
    }
    _matchSlash(ctx) {
      if (ctx.block.kind === "fenced-code" || ctx.inline.insideInlineCode) return null;
      const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
      const m = /^(\s*)\/([\w-]*)$/.exec(before);
      if (!m) return null;
      return { from: ctx.currentLine.start + (m[1] ?? "").length, to: ctx.selectionStart, trigger: "/", query: m[2] ?? "", providerId: "slash" };
    }
    _getSlashItems(match) {
      const q = match.query.toLowerCase();
      const items = [];
      for (const action of this.api.actions()) {
        if (!action.visibleInSlash) continue;
        const hay = [action.label, action.description, ...action.aliases || [], ...action.keywords || []].filter(Boolean).join(" ").toLowerCase();
        if (q && !hay.includes(q)) continue;
        items.push({ id: action.id, label: action.label || action.id, detail: action.group, description: action.description || displayShortcut(action.defaultShortcut), kind: "slash-command", actionId: action.id });
      }
      return items.slice(0, 24);
    }
    _applySlashItem(item, match, ctx) {
      const repl = this._slashReplacementForAction(item.actionId);
      if (repl) {
        const insert = typeof repl.insert === "function" ? repl.insert(ctx) : repl.insert;
        const off = typeof repl.selectionOffset === "number" ? repl.selectionOffset : insert.length;
        return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert }], { start: match.from + off, end: match.from + off + (repl.selectionLength || 0), direction: "none" }, "slash"), item.label);
      }
      return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert: "" }], { start: match.from, end: match.from, direction: "none" }, "slash"), item.label);
    }
    _slashReplacementForAction(actionId) {
      const replacements = { "block.paragraph": { insert: "", selectionOffset: 0 }, "block.heading.1": { insert: "# ", selectionOffset: 2 }, "block.heading.2": { insert: "## ", selectionOffset: 3 }, "block.heading.3": { insert: "### ", selectionOffset: 4 }, "block.heading.4": { insert: "#### ", selectionOffset: 5 }, "block.heading.5": { insert: "##### ", selectionOffset: 6 }, "block.heading.6": { insert: "###### ", selectionOffset: 7 }, "block.bulletList": { insert: "- ", selectionOffset: 2 }, "block.orderedList": { insert: "1. ", selectionOffset: 3 }, "block.taskList": { insert: "- [ ] ", selectionOffset: 6 }, "block.blockquote": { insert: "> ", selectionOffset: 2 }, "block.codeFence": { insert: "```\n\n```", selectionOffset: 4 }, "block.horizontalRule": { insert: "---\n", selectionOffset: 4 }, "block.table": { insert: "| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |", selectionOffset: 2, selectionLength: "Column 1".length }, "inline.link": { insert: "[]()", selectionOffset: 1 }, "inline.image": { insert: "![]()", selectionOffset: 2 }, "inline.bold": { insert: "****", selectionOffset: 2 }, "inline.italic": { insert: "**", selectionOffset: 1 }, "inline.code": { insert: "``", selectionOffset: 1 }, "inline.strikethrough": { insert: "~~~~", selectionOffset: 2 } };
      return actionId ? replacements[actionId] || null : null;
    }
    _applyCodeLanguageItem(item, match, ctx) {
      const sequence = match.sequence || "```";
      const opening = `${sequence}${item.label}`;
      const hasLineBreak = ctx.currentLine.end < ctx.value.length && ctx.value[ctx.currentLine.end] === "\n";
      const shouldClose = hasLineBreak && this.api.isUnclosedFenceOpeningContext(ctx);
      const closing = `${match.indent || ""}${sequence}`;
      const insert = shouldClose ? `${opening}

${closing}` : opening;
      const cursor = match.from + opening.length + (shouldClose ? 1 : 0);
      return ok(tx(
        ctx,
        "completion.accept",
        [{ from: match.from, to: match.to, insert }],
        { start: cursor, end: cursor, direction: "none" },
        "completion"
      ), `Language ${item.label}.`);
    }
    _matchCodeLanguage(ctx) {
      if (ctx.block.kind === "fenced-code" && !this.api.isUnclosedFenceOpeningContext(ctx)) return null;
      const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
      const m = /^(\s*)(`{3,}|~{3,})([\w+-]*)$/.exec(before);
      if (!m || LANGUAGES.includes((m[3] ?? "").toLowerCase())) return null;
      return { from: ctx.currentLine.start + (m[1] ?? "").length, to: ctx.selectionStart, trigger: m[2] ?? "", sequence: m[2] ?? "", indent: m[1] ?? "", query: m[3] ?? "", providerId: "code-language" };
    }
    _scheduleCompletionUpdate({ immediate = false } = {}) {
      if (this.api.disabled() || this.api.readonly() || this.api.isComposing()) return;
      if (immediate) {
        if (this._completionUpdateFrame) cancelAnimationFrame(this._completionUpdateFrame);
        this._completionUpdateFrame = 0;
        this._maybeUpdateCompletions();
        return;
      }
      if (this._completionUpdateFrame) return;
      this._completionUpdateFrame = requestAnimationFrame(() => {
        this._completionUpdateFrame = 0;
        this._maybeUpdateCompletions();
      });
    }
    _maybeUpdateCompletions() {
      if (this.api.disabled() || this.api.readonly() || this.api.isComposing()) return;
      const ctx = this.api.getContext();
      if (ctx.selectionStart !== ctx.selectionEnd) {
        this._closeCompletion();
        return;
      }
      const providers = [...this._providers.values()].sort((a, b) => b.priority - a.priority);
      let selectedProvider = null;
      let selectedMatch = null;
      for (const provider of providers) {
        try {
          const match = provider.match(ctx);
          if (match) {
            selectedProvider = provider;
            selectedMatch = match;
            break;
          }
        } catch (error) {
          this.api.emitError("completion", error, true, { providerId: provider.id });
        }
      }
      if (!selectedProvider || !selectedMatch) {
        this._closeCompletion();
        return;
      }
      const requestId = this._completion.requestId + 1;
      this._completion.abort?.abort();
      const abort = new AbortController();
      this._completion = this._completion.open ? { ...this._completion, requestId, abort } : { status: "loading", open: false, providerId: selectedProvider.id, match: selectedMatch, items: [], activeIndex: 0, requestId, abort };
      try {
        Promise.resolve(selectedProvider.getItems(selectedMatch, ctx, abort.signal)).then((items) => {
          if (abort.signal.aborted || this._completion.requestId !== requestId) return;
          const normalized = this._normalizeCompletionItems(items);
          if (!normalized.length) {
            this._closeCompletion();
            return;
          }
          this._openCompletion(selectedProvider.id, selectedMatch, normalized);
        }).catch((error) => {
          if (!abort.signal.aborted) {
            this.api.emitError("completion", error, true, { providerId: selectedProvider.id });
            this._closeCompletion();
          }
        });
      } catch (error) {
        this.api.emitError("completion", error, true, { providerId: selectedProvider.id });
        this._closeCompletion();
      }
    }
    _normalizeCompletionItems(items) {
      const seen = /* @__PURE__ */ new Set();
      const out = [];
      for (const item of items || []) {
        if (!item?.id || !item?.label) continue;
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
      }
      return out;
    }
    _openCompletion(providerId, match, items) {
      const wasOpen = this._completion.open;
      const preferred = clamp(this._completion.activeIndex, 0, items.length - 1);
      this._completion = { status: "open", open: true, providerId, match, items, activeIndex: preferred, requestId: this._completion.requestId, abort: this._completion.abort || new AbortController() };
      this._completion.activeIndex = this._enabledCompletionIndex(preferred, 1);
      if (!wasOpen) this.api.startPositionTracking();
      this.api.render();
      if (!wasOpen) this.api.dispatch("md-completion-open", { providerId, match, items });
    }
    _closeCompletion() {
      const wasOpen = this._completion.open;
      const detail = { providerId: this._completion.providerId, match: this._completion.match };
      this._completion.abort?.abort();
      this._completion = { status: "closed", open: false, providerId: null, match: null, items: [], activeIndex: 0, requestId: this._completion.requestId + 1, abort: null };
      this.api.stopPositionTracking();
      this.api.render();
      if (wasOpen) this.api.dispatch("md-completion-close", detail);
    }
    _enabledCompletionIndex(start, direction = 1) {
      const n = this._completion.items.length;
      if (!n) return -1;
      const step = direction < 0 ? -1 : 1;
      for (let distance = 0; distance < n; distance += 1) {
        const index = (start + distance * step + n) % n;
        if (!this._completion.items[index]?.disabled) return index;
      }
      return -1;
    }
    _moveCompletion(delta) {
      const n = this._completion.items.length;
      if (!n) return;
      const start = this._completion.activeIndex < 0 ? delta < 0 ? n - 1 : 0 : this._completion.activeIndex + delta;
      const index = this._enabledCompletionIndex((start + n) % n, delta);
      if (index >= 0) this._setCompletionIndex(index, delta);
    }
    _setCompletionIndex(index, direction = 1) {
      const n = this._completion.items.length;
      if (!n) return;
      this._completion.activeIndex = this._enabledCompletionIndex(clamp(index, 0, n - 1), direction);
      this.api.render();
    }
    _acceptCompletion(source = "action") {
      if (!this._completion.open || !this._completion.items.length) return fail("not-applicable");
      const provider = this._providers.get(this._completion.providerId || "");
      const item = this._completion.items[this._completion.activeIndex];
      if (!provider || !item || item.disabled) return fail("not-applicable");
      const ctx = this.api.getContext();
      const sourceRevision = this.api.getRevision();
      let result;
      try {
        const currentMatch = provider.match(ctx);
        const shownMatch = this._completion.match;
        const exactMatch = Boolean(
          currentMatch && shownMatch && currentMatch.from === shownMatch.from && currentMatch.to === shownMatch.to && currentMatch.query === shownMatch.query && currentMatch.trigger === shownMatch.trigger
        );
        const currentTagQuery = normalizeTagKey(currentMatch?.query || "");
        const shownTagQuery = normalizeTagKey(shownMatch?.query || "");
        const itemTagKey = normalizeTagKey(String(item.value || "").replace(/^#/, ""));
        const safeTagRefinement = Boolean(
          provider.id === "tags" && currentMatch && shownMatch && currentMatch.from === shownMatch.from && currentMatch.trigger === shownMatch.trigger && currentMatch.to >= shownMatch.to && currentTagQuery.startsWith(shownTagQuery) && itemTagKey.startsWith(currentTagQuery)
        );
        if (!currentMatch || !exactMatch && !safeTagRefinement) {
          this._closeCompletion();
          this._scheduleCompletionUpdate({ immediate: true });
          return fail("not-applicable");
        }
        result = provider.apply(item, currentMatch, ctx);
      } catch (error) {
        this.api.emitError("completion", error, true, { providerId: provider.id });
        this._closeCompletion();
        return fail("provider-error", String(error instanceof Error ? error.message : error));
      }
      this._closeCompletion();
      if (this.api.getRevision() !== sourceRevision) return fail("reentrant-change");
      if (result?.ok && result.transaction) {
        const before = this.api.snapshot();
        const beforeRevision = this.api.getRevision();
        const expectedRevision = beforeRevision + (applyTextChanges(before.value, result.transaction.changes) === before.value ? 0 : 1);
        const applied = this.api.applyTransaction({
          ...result.transaction,
          source: source === "pointer" ? "pointer" : "keyboard",
          actionId: "completion.accept",
          origin: { kind: "completion", id: provider.id }
        }, {
          source: source === "pointer" ? "pointer" : "keyboard"
        });
        if (!applied) return fail("change-canceled");
        if (this.api.getRevision() !== expectedRevision) return okNoop();
        const after = this.api.snapshot();
        this.api.dispatch("md-completion-accept", { providerId: provider.id, item, before, after, origin: { kind: "completion", id: provider.id }, beforeRevision, revision: expectedRevision });
        if (result.announcement) this.api.announce(result.announcement);
        return okNoop(result.announcement);
      }
      return result || fail("not-applicable");
    }
  };

  // src/actions/blocks.ts
  function toggleParagraph(ctx) {
    const changes = [];
    for (const line of ctx.selectedLines) {
      const list = parseListItem(line.text, ctx.config);
      const heading = parseHeading(line.text);
      const quote = parseBlockquote(line.text);
      if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" });
      else if (heading) changes.push({ from: line.start, to: line.start + heading.contentStart, insert: heading.indent });
      else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: "" });
    }
    if (!changes.length) return fail("not-applicable");
    const d = changes.reduce((sum, c) => c.from < ctx.selectionStart ? sum + c.insert.length - (c.to - c.from) : sum, 0);
    return ok(tx(ctx, "block.paragraph", changes, { start: Math.max(0, ctx.selectionStart + d), end: Math.max(0, ctx.selectionEnd + d), direction: ctx.selectionDirection || "none" }, "block"), "Converted to paragraph.");
  }
  __name(toggleParagraph, "toggleParagraph");
  function toggleHeading(ctx, level) {
    const marker = `${"#".repeat(level)} `;
    const lines = ctx.selectedLines;
    const allSame = lines.every((line) => {
      const h = parseHeading(line.text);
      return h && h.level === level;
    });
    const changes = [];
    for (const line of lines) {
      const h = parseHeading(line.text);
      const list = parseListItem(line.text, ctx.config);
      const quote = parseBlockquote(line.text);
      if (allSame && h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent });
      else if (h) changes.push({ from: line.start, to: line.start + h.contentStart, insert: h.indent + marker });
      else if (list) changes.push({ from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: marker });
      else if (quote) changes.push({ from: line.start, to: line.start + quote.contentStart, insert: marker });
      else changes.push({ from: line.start, to: line.start, insert: marker });
    }
    let ds = 0;
    let de = 0;
    for (const c of changes) {
      const diff = c.insert.length - (c.to - c.from);
      if (c.from < ctx.selectionStart) ds += diff;
      if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff;
    }
    return ok(tx(ctx, `block.heading.${level}`, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allSame ? "Converted to paragraph." : `Heading level ${level}.`);
  }
  __name(toggleHeading, "toggleHeading");
  function toggleList(ctx, type) {
    const markerFor = /* @__PURE__ */ __name((i) => type === "ordered" ? `${i + 1}. ` : type === "task" ? "- [ ] " : "- ", "markerFor");
    const lines = ctx.selectedLines;
    const allList = lines.every((line) => parseListItem(line.text, ctx.config));
    const changes = [];
    lines.forEach((line, i) => {
      const list = parseListItem(line.text, ctx.config);
      const h = parseHeading(line.text);
      const quote = parseBlockquote(line.text);
      let c;
      if (allList && list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: "" };
      else if (list) c = { from: line.start + list.fullMarkerStart, to: line.start + list.fullMarkerEnd, insert: markerFor(i) };
      else if (h) c = { from: line.start, to: line.start + h.contentStart, insert: h.indent + markerFor(i) };
      else if (quote) c = { from: line.start, to: line.start + quote.contentStart, insert: markerFor(i) };
      else {
        const indent = (line.text.match(/^\s*/) || [""])[0];
        c = { from: line.start + indent.length, to: line.start + indent.length, insert: markerFor(i) };
      }
      changes.push(c);
    });
    let ds = 0;
    let de = 0;
    for (const c of changes) {
      const diff = c.insert.length - (c.to - c.from);
      if (c.from < ctx.selectionStart) ds += diff;
      if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff;
    }
    const id = `block.${type === "bullet" ? "bulletList" : type === "ordered" ? "orderedList" : "taskList"}`;
    return ok(tx(ctx, id, changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allList ? "Removed list." : type === "ordered" ? "Numbered list." : type === "task" ? "Task list." : "Bullet list.");
  }
  __name(toggleList, "toggleList");
  function toggleTaskDone(ctx) {
    const list = ctx.block.list;
    if (!list || list.kind !== "task-list-item") return fail("not-applicable");
    const checkboxStart = ctx.currentLine.start + list.indent.length + `${list.marker} [`.length;
    const next = list.checked ? " " : "x";
    return ok(tx(ctx, "block.taskDone", [{ from: checkboxStart, to: checkboxStart + 1, insert: next }], { start: ctx.selectionStart, end: ctx.selectionEnd, direction: ctx.selectionDirection || "none" }, "block"), next === "x" ? "Task checked." : "Task unchecked.");
  }
  __name(toggleTaskDone, "toggleTaskDone");
  function toggleBlockquote(ctx) {
    const lines = ctx.selectedLines;
    const allQuote = lines.every((line) => parseBlockquote(line.text));
    const changes = lines.map((line) => {
      const quote = parseBlockquote(line.text);
      return allQuote && quote ? { from: line.start, to: line.start + quote.contentStart, insert: "" } : { from: line.start, to: line.start, insert: "> " };
    });
    let ds = 0;
    let de = 0;
    for (const c of changes) {
      const diff = c.insert.length - (c.to - c.from);
      if (c.from < ctx.selectionStart) ds += diff;
      if (c.from < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += diff;
    }
    return ok(tx(ctx, "block.blockquote", changes, { start: Math.max(0, ctx.selectionStart + ds), end: Math.max(0, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "block"), allQuote ? "Removed blockquote." : "Blockquote.");
  }
  __name(toggleBlockquote, "toggleBlockquote");
  function toggleCodeFence(ctx, args = {}) {
    const language = codeLanguage(args.language);
    if (language == null) return fail("invalid-language");
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    let longestRun = 2;
    for (const match of selected.matchAll(/`+/g)) longestRun = Math.max(longestRun, (match[0] ?? "").length);
    const marker = "`".repeat(longestRun + 1);
    const insert = `${marker}${language}
${selected}
${marker}`;
    const cursor = ctx.selectionStart + marker.length + language.length + 1 + selected.length;
    return ok(tx(ctx, "block.codeFence", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "block"), "Code block.");
  }
  __name(toggleCodeFence, "toggleCodeFence");
  function insertHorizontalRule(ctx) {
    const lead = ctx.selectionStart > 0 && ctx.value[ctx.selectionStart - 1] !== "\n" ? "\n" : "";
    const trail = ctx.selectionStart < ctx.value.length && ctx.value[ctx.selectionStart] !== "\n" ? "\n" : "\n";
    const insert = `${lead}---${trail}`;
    return insertionTransaction(ctx, "block.horizontalRule", insert, insert.length, "block");
  }
  __name(insertHorizontalRule, "insertHorizontalRule");
  function insertTable(ctx, args = {}) {
    const rows = clamp(Number(args.rows) || 2, 1, 20);
    const cols = clamp(Number(args.cols) || 3, 2, 12);
    const header = `| ${Array.from({ length: cols }, (_, i) => `Column ${i + 1}`).join(" | ")} |`;
    const delimiter = `| ${Array.from({ length: cols }, () => "---").join(" | ")} |`;
    const body = Array.from({ length: rows }, (_, r) => `| ${Array.from({ length: cols }, (_2, c) => `Cell ${r * cols + c + 1}`).join(" | ")} |`);
    const insert = [header, delimiter, ...body].join("\n");
    const cursor = ctx.selectionStart + header.indexOf("Column 1");
    return ok(tx(ctx, "block.table", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor + "Column 1".length, direction: "none" }, "block"), "Table inserted.");
  }
  __name(insertTable, "insertTable");
  function setCodeLanguageResult(ctx, block, language) {
    const opening = block?.opening;
    if (!opening) return fail("not-applicable");
    const clean = codeLanguage(language);
    if (clean == null) return fail("invalid-language");
    const fence = getFenceInfo(opening.text);
    if (!fence) return fail("not-applicable");
    const indent = /^\s{0,3}/.exec(opening.text)?.[0] ?? "";
    const insert = `${indent}${fence.sequence}${clean}`;
    const cursor = opening.start + insert.length;
    return ok(tx(ctx, "code.setLanguage", [{ from: opening.start, to: opening.end, insert }], { start: cursor, end: cursor, direction: "none" }, "code"), clean ? `Language ${clean}.` : "Language cleared.");
  }
  __name(setCodeLanguageResult, "setCodeLanguageResult");

  // src/actions/editing.ts
  function deleteSelectionResult(ctx, actionId = "editor.deleteSelection") {
    const start = Math.min(ctx.selectionStart, ctx.selectionEnd);
    const end = Math.max(ctx.selectionStart, ctx.selectionEnd);
    if (start === end) return fail("not-applicable");
    return ok(tx(ctx, actionId, [{ from: start, to: end, insert: "" }], { start, end: start, direction: "none" }, "delete"), "Deleted selection.");
  }
  __name(deleteSelectionResult, "deleteSelectionResult");
  function markdownShortcut(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd || ctx.inline.insideInlineCode || ctx.block.kind === "fenced-code") return fail("not-applicable");
    const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start);
    const after = ctx.currentLine.text.slice(ctx.selectionStart - ctx.currentLine.start);
    if (after.trim()) return fail("not-applicable");
    const task = /^(\s*)(\[\]|\[ \]|\[x\]|\[X\])$/.exec(before);
    if (task) {
      const checked = /x/i.test(task[2] ?? "") ? "x" : " ";
      const insert = `${task[1] ?? ""}- [${checked}] `;
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
  __name(markdownShortcut, "markdownShortcut");
  function smartDelete(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return deleteSelectionResult(ctx, "editor.smartDelete");
    const lineOffset = ctx.selectionStart - ctx.currentLine.start;
    if (lineOffset === ctx.currentLine.text.length && ctx.currentLine.end < ctx.value.length && ctx.value[ctx.currentLine.end] === "\n") {
      return ok(tx(ctx, "editor.smartDelete", [{ from: ctx.currentLine.end, to: ctx.currentLine.end + 1, insert: "" }], { start: ctx.currentLine.end, end: ctx.currentLine.end, direction: "none" }, "smartDelete"), "Joined line.");
    }
    return fail("not-applicable");
  }
  __name(smartDelete, "smartDelete");
  function smartBackspace(ctx) {
    if (ctx.selectionStart !== ctx.selectionEnd) return deleteSelectionResult(ctx, "editor.smartBackspace");
    const lineOffset = ctx.selectionStart - ctx.currentLine.start;
    const list = ctx.block.list;
    if (list) {
      if (list.content.trim() === "" && lineOffset >= list.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", list.contentStart, "Exited list.");
      if (lineOffset === list.contentStart) {
        const from = ctx.currentLine.start + list.fullMarkerStart;
        const to = ctx.currentLine.start + list.fullMarkerEnd;
        return ok(tx(ctx, "editor.smartBackspace", [{ from, to, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace"), "Removed list marker.");
      }
    }
    const heading = ctx.block.heading;
    if (heading && lineOffset === heading.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", heading.contentStart, "Converted to paragraph.");
    const quote = ctx.block.blockquote;
    if (quote && lineOffset === quote.contentStart) return removePrefixFromLine(ctx, "editor.smartBackspace", quote.contentStart, "Exited blockquote.");
    if (lineOffset === 0 && ctx.currentLine.start > 0 && ctx.value[ctx.currentLine.start - 1] === "\n") {
      const joinAt = ctx.currentLine.start - 1;
      return ok(tx(ctx, "editor.smartBackspace", [{ from: joinAt, to: ctx.currentLine.start, insert: "" }], { start: joinAt, end: joinAt, direction: "none" }, "smartBackspace"), "Joined line.");
    }
    if (lineOffset > 0 && /^\s+$/.test(ctx.currentLine.text.slice(0, lineOffset))) {
      const amount = lineOutdentAmount(ctx.currentLine.text.slice(0, lineOffset));
      if (amount > 0) {
        const from = ctx.selectionStart - amount;
        return ok(tx(ctx, "editor.smartBackspace", [{ from, to: ctx.selectionStart, insert: "" }], { start: from, end: from, direction: "none" }, "smartBackspace"));
      }
    }
    return fail("not-applicable");
  }
  __name(smartBackspace, "smartBackspace");
  function smartOutdent(ctx) {
    const any = ctx.selectedLines.some((line) => lineOutdentAmount(line.text, ctx.config.indentString) > 0);
    if (any) return outdentLines(ctx);
    return fail("not-applicable");
  }
  __name(smartOutdent, "smartOutdent");
  function lineOutdentAmount(text, indentString = "  ") {
    if (text.startsWith("	")) return 1;
    const indent = (text.match(/^ +/) || [""])[0].length;
    if (indent >= indentString.length && indentString !== "	") return indentString.length;
    if (indent >= 4) return 4;
    if (indent >= 2) return 2;
    if (indent >= 1) return 1;
    return 0;
  }
  __name(lineOutdentAmount, "lineOutdentAmount");
  function indentLines(ctx, indent) {
    const changes = [];
    let ds = 0;
    let de = 0;
    for (const line of ctx.selectedLines) {
      if (!parseListItem(line.text, ctx.config) && ctx.block.kind !== "fenced-code") continue;
      changes.push({ from: line.start, to: line.start, insert: indent });
      if (line.start < ctx.selectionStart) ds += indent.length;
      if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de += indent.length;
    }
    if (!changes.length) return fail("not-applicable");
    return ok(tx(ctx, "editor.smartTab", changes, { start: ctx.selectionStart + ds, end: ctx.selectionEnd + de, direction: ctx.selectionDirection || "none" }, "indent"), "Indented.");
  }
  __name(indentLines, "indentLines");
  function outdentLines(ctx) {
    const changes = [];
    let ds = 0;
    let de = 0;
    for (const line of ctx.selectedLines) {
      const amount = lineOutdentAmount(line.text, ctx.config.indentString);
      if (amount <= 0) continue;
      changes.push({ from: line.start, to: line.start + amount, insert: "" });
      if (line.start < ctx.selectionStart) ds -= amount;
      if (line.start < ctx.selectionEnd || ctx.selectionStart === ctx.selectionEnd) de -= amount;
    }
    if (!changes.length) return fail("not-applicable");
    const base = ctx.selectedLines[0]?.start ?? 0;
    return ok(tx(ctx, "editor.smartOutdent", changes, { start: Math.max(base, ctx.selectionStart + ds), end: Math.max(base, ctx.selectionEnd + de), direction: ctx.selectionDirection || "none" }, "outdent"), "Outdented.");
  }
  __name(outdentLines, "outdentLines");

  // src/actions/inline.ts
  function wrapInline(ctx, prefix, suffix, label) {
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    if (selected) {
      const insert2 = `${prefix}${selected}${suffix}`;
      const cursor2 = ctx.selectionStart + insert2.length;
      return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert: insert2 }], { start: cursor2, end: cursor2, direction: "none" }, "inline"), `${label}.`);
    }
    const insert = `${prefix}${suffix}`;
    const cursor = ctx.selectionStart + prefix.length;
    return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), `${label}.`);
  }
  __name(wrapInline, "wrapInline");
  function wrapCode(ctx) {
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    const insert = codeSpanMarkdown(selected);
    const cursor = selected ? ctx.selectionStart + insert.length : ctx.selectionStart + 1;
    return ok(tx(ctx, "inline.code", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Inline code.");
  }
  __name(wrapCode, "wrapCode");
  function insertLink(ctx, args = {}) {
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    const url = markdownLinkDestination(args.url ?? "");
    if (url == null) return fail("invalid-url");
    const label = escapeMarkdownLabel(selected);
    const insert = `[${label}](${url})`;
    const cursor = selected ? url ? ctx.selectionStart + insert.length : ctx.selectionStart + label.length + 3 : ctx.selectionStart + 1;
    return ok(tx(ctx, "inline.link", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Link.");
  }
  __name(insertLink, "insertLink");
  function insertImage(ctx, args = {}) {
    const alt = escapeMarkdownLabel(args.alt ?? "");
    const src = markdownLinkDestination(args.src ?? "");
    if (src == null) return fail("invalid-url");
    const insert = `![${alt}](${src})`;
    const cursor = alt ? ctx.selectionStart + insert.length : ctx.selectionStart + 2;
    return ok(tx(ctx, "inline.image", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Image.");
  }
  __name(insertImage, "insertImage");

  // src/actions/tables.ts
  function serializeTableBlock(headerCells, delimiterCells, rows) {
    const serialize = /* @__PURE__ */ __name((cells) => tableRowSourceParts(cells).text, "serialize");
    return [serialize(headerCells), serialize(delimiterCells), ...rows.map(serialize)].join("\n");
  }
  __name(serializeTableBlock, "serializeTableBlock");
  function tableCellTexts(line, cols) {
    const cells = parseTableLineRanges(line.text, line.start, true);
    return Array.from({ length: cols }, (_, i) => unescapeTableCellText(cells[i]?.text ?? ""));
  }
  __name(tableCellTexts, "tableCellTexts");
  function tablePositionForOffset(block, offset) {
    if (!block) return null;
    const safe = clamp(Number(offset) || 0, block.from, block.to);
    const lines = [
      { line: block.header, row: -1 },
      { line: block.delimiter, row: -2 },
      ...block.rows.map((line, row) => ({ line, row }))
    ];
    const match = lines.find((entry) => safe >= entry.line.start && safe <= entry.line.end) || lines.find((entry) => safe >= entry.line.start && safe <= entry.line.newlineEnd) || lines.at(-1);
    if (!match) return null;
    const cells = match.line.cells || [];
    let col = cells.findIndex((cell) => safe >= cell.from && safe <= cell.to);
    if (col === -1 && cells.length) {
      let bestDistance = Infinity;
      cells.forEach((cell, index) => {
        const distance = safe < cell.from ? cell.from - safe : safe > cell.to ? safe - cell.to : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          col = index;
        }
      });
    }
    return { row: match.row, col: Math.max(0, col), line: match.line };
  }
  __name(tablePositionForOffset, "tablePositionForOffset");
  function tableColumnResult(ctx, block, col, mode) {
    const cols = Math.max(block.header.cells.length, ...block.rows.map((r) => r.cells.length), 1);
    const target = clamp(Number(col) || 0, 0, cols - 1);
    const header = tableCellTexts(block.header, cols);
    const delimiter = tableCellTexts(block.delimiter, cols);
    const rows = block.rows.map((row) => tableCellTexts(row, cols));
    if (mode === "delete") {
      if (cols <= 1) return fail("not-applicable", "Cannot delete the only column.");
      for (const list of [header, delimiter, ...rows]) list.splice(target, 1);
    } else {
      const at = target + 1;
      header.splice(at, 0, `Column ${cols + 1}`);
      delimiter.splice(at, 0, "---");
      for (const row of rows) row.splice(at, 0, "");
    }
    const insert = serializeTableBlock(header, delimiter, rows.length ? rows : [Array.from({ length: header.length }, () => "")]);
    const cursor = block.from + (insert.split("\n")[0] || "").length;
    return ok(tx(ctx, mode === "delete" ? "table.deleteColumn" : "table.insertColumnAfter", [{ from: block.from, to: block.to, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), mode === "delete" ? "Column deleted." : "Column inserted.");
  }
  __name(tableColumnResult, "tableColumnResult");
  function tableDeleteRowResult(ctx, block, row) {
    if (!block.rows.length) return fail("not-applicable");
    const index = clamp(Number(row) || 0, 0, block.rows.length - 1);
    const line = requireItem(block.rows, index);
    let from = line.start;
    let to = line.newlineEnd;
    if (to <= line.end && line.start > block.delimiter.end && ctx.value[line.start - 1] === "\n") {
      from = line.start - 1;
      to = line.end;
    } else if (to <= from) {
      to = line.end;
    }
    const cursor = from;
    return ok(tx(ctx, "table.deleteRow", [{ from, to, insert: "" }], { start: cursor, end: cursor, direction: "none" }, "table"), "Row deleted.");
  }
  __name(tableDeleteRowResult, "tableDeleteRowResult");
  function tableRowSourceParts(cells) {
    const escaped = cells.map((cell) => escapeTableCellText(cell));
    const offsets = [];
    let text = "| ";
    escaped.forEach((cell, index) => {
      offsets[index] = { from: text.length, to: text.length + cell.length };
      text += cell;
      text += index === escaped.length - 1 ? " |" : " | ";
    });
    return { text, offsets };
  }
  __name(tableRowSourceParts, "tableRowSourceParts");
  function tableBlockSourceWithOffsets(headerCells, delimiterCells, rows) {
    const parts = [
      tableRowSourceParts(headerCells),
      tableRowSourceParts(delimiterCells),
      ...rows.map((row) => tableRowSourceParts(row))
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
  __name(tableBlockSourceWithOffsets, "tableBlockSourceWithOffsets");
  function tableRowInsertionResult(ctx, block, line, placement = "after-row") {
    if (!block) return fail("not-applicable");
    const cols = Math.max(block.header.cells.length, ...block.rows.map((r) => r.cells.length), 1);
    const insert = `
| ${Array.from({ length: cols }, () => "").join(" | ")} |`;
    const insertionLine = placement === "after-delimiter" ? block.delimiter : line || block.rows.at(-1) || block.delimiter;
    const from = insertionLine.end;
    const cursor = from + 3;
    return ok(tx(ctx, "table.insertRowAfter", [{ from, to: from, insert }], { start: cursor, end: cursor, direction: "none" }, "table"), "Table row inserted.");
  }
  __name(tableRowInsertionResult, "tableRowInsertionResult");

  // src/actions/registry.ts
  function installBuiltInActions(api) {
    const r = /* @__PURE__ */ __name((a) => api.registerAction(a), "r");
    r({ id: "editor.insertText", label: "Insert text", group: "Editor", structural: false, run: /* @__PURE__ */ __name((ctx, args = {}) => insertionTransaction(ctx, "editor.insertText", normalizeLineEndings(args.text ?? ""), normalizeLineEndings(args.text ?? "").length, "insertText"), "run") });
    r({ id: "editor.replaceSelection", label: "Replace selection", group: "Editor", structural: false, run: /* @__PURE__ */ __name((ctx, args = {}) => insertionTransaction(ctx, "editor.replaceSelection", normalizeLineEndings(args.text ?? ""), normalizeLineEndings(args.text ?? "").length, "replaceSelection"), "run") });
    r({ id: "editor.insertParagraph", label: "Insert paragraph", group: "Editor", defaultShortcut: "Enter", run: /* @__PURE__ */ __name((ctx) => insertionTransaction(ctx, "editor.insertParagraph", "\n", 1, "insertParagraph"), "run") });
    r({ id: "editor.insertSoftBreak", label: "Insert soft break", group: "Editor", defaultShortcut: "Shift+Enter", run: /* @__PURE__ */ __name((ctx) => insertionTransaction(ctx, "editor.insertSoftBreak", "  \n", 3, "insertSoftBreak"), "run") });
    r({ id: "editor.smartEnter", label: "Smart enter", group: "Editor", defaultShortcut: "Enter", run: /* @__PURE__ */ __name((ctx) => api.smartEnter(ctx), "run") });
    r({ id: "editor.smartTab", label: "Indent", group: "Editor", defaultShortcut: "Tab", run: /* @__PURE__ */ __name((ctx) => api.smartTab(ctx), "run") });
    r({ id: "editor.smartOutdent", label: "Outdent", group: "Editor", defaultShortcut: "Shift+Tab", run: /* @__PURE__ */ __name((ctx) => smartOutdent(ctx), "run") });
    r({ id: "editor.smartBackspace", label: "Smart backspace", group: "Editor", defaultShortcut: "Backspace", run: /* @__PURE__ */ __name((ctx) => smartBackspace(ctx), "run") });
    r({ id: "editor.smartDelete", label: "Smart delete", group: "Editor", defaultShortcut: "Delete", run: /* @__PURE__ */ __name((ctx) => smartDelete(ctx), "run") });
    r({ id: "editor.markdownShortcut", label: "Markdown shortcut", group: "Editor", defaultShortcut: "Space", run: /* @__PURE__ */ __name((ctx) => markdownShortcut(ctx), "run") });
    r({ id: "editor.deleteSelection", label: "Delete selection", group: "Editor", run: /* @__PURE__ */ __name((ctx) => deleteSelectionResult(ctx, "editor.deleteSelection"), "run") });
    r({ id: "editor.selectAllExpand", label: "Expand selection", group: "Editor", defaultShortcut: "Mod+A", viewSafe: true, readonlySafe: true, run: /* @__PURE__ */ __name(() => {
      api.expandSelection();
      return okNoop("Selection expanded.");
    }, "run") });
    r({ id: "history.undo", label: "Undo", group: "History", defaultShortcut: "Mod+Z", run: /* @__PURE__ */ __name((_ctx, _args, options) => api.undo({ source: options?.source || "api" }) ? { ...okNoop("Undo."), actionHandled: true } : fail("not-applicable"), "run") });
    r({ id: "history.redo", label: "Redo", group: "History", defaultShortcut: "Mod+Shift+Z", run: /* @__PURE__ */ __name((_ctx, _args, options) => api.redo({ source: options?.source || "api" }) ? { ...okNoop("Redo."), actionHandled: true } : fail("not-applicable"), "run") });
    r({ id: "block.paragraph", label: "Paragraph", description: "Convert current block to paragraph", group: "Blocks", aliases: ["p", "text", "clear"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleParagraph(ctx), "run") });
    for (let level = 1; level <= 6; level += 1) r({ id: `block.heading.${level}`, label: `Heading ${level}`, description: `Convert to heading level ${level}`, group: "Blocks", aliases: [`h${level}`, `heading${level}`], keywords: ["title", "section"], defaultShortcut: level <= 3 ? `Mod+Alt+${level}` : void 0, visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleHeading(ctx, level), "run") });
    r({ id: "block.bulletList", label: "Bullet list", description: "Create an unordered list", group: "Blocks", aliases: ["bullet", "ul", "list"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleList(ctx, "bullet"), "run") });
    r({ id: "block.orderedList", label: "Numbered list", description: "Create an ordered list", group: "Blocks", aliases: ["number", "numbered", "ol"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleList(ctx, "ordered"), "run") });
    r({ id: "block.taskList", label: "Task list", description: "Create a task list", group: "Blocks", aliases: ["todo", "task", "checkbox"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleList(ctx, "task"), "run") });
    r({ id: "block.taskDone", label: "Toggle task done", description: "Toggle task checkbox state", group: "Blocks", aliases: ["done", "check"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleTaskDone(ctx), "run") });
    r({ id: "block.blockquote", label: "Blockquote", description: "Create a blockquote", group: "Blocks", aliases: ["quote", "blockquote"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => toggleBlockquote(ctx), "run") });
    r({ id: "block.codeFence", label: "Code block", description: "Create a fenced code block", group: "Insert", aliases: ["code", "pre", "fence"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx, args) => toggleCodeFence(ctx, args), "run") });
    r({ id: "block.horizontalRule", label: "Horizontal rule", description: "Insert horizontal rule", group: "Insert", aliases: ["hr", "divider", "rule"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => insertHorizontalRule(ctx), "run") });
    r({ id: "block.table", label: "Table", description: "Insert a markdown table", group: "Insert", aliases: ["table", "grid"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx, args = {}) => insertTable(ctx, args), "run") });
    r({ id: "table.insertRowAfter", label: "Insert table row", group: "Table", run: /* @__PURE__ */ __name((ctx) => {
      const block = api.findBlockAtOffset(ctx.selectionStart, "table");
      return block ? tableRowInsertionResult(ctx, block, ctx.currentLine, "after-row") : fail("not-applicable");
    }, "run") });
    r({ id: "table.insertColumnAfter", label: "Insert table column", group: "Table", run: /* @__PURE__ */ __name((ctx) => {
      const block = api.findBlockAtOffset(ctx.selectionStart, "table");
      const pos = block ? tablePositionForOffset(block, ctx.selectionStart) : null;
      return block ? tableColumnResult(ctx, block, pos?.col ?? 0, "insert-after") : fail("not-applicable");
    }, "run") });
    r({ id: "table.deleteRow", label: "Delete table row", group: "Table", run: /* @__PURE__ */ __name((ctx) => {
      const block = api.findBlockAtOffset(ctx.selectionStart, "table");
      const pos = block ? tablePositionForOffset(block, ctx.selectionStart) : null;
      return block ? tableDeleteRowResult(ctx, block, pos && pos.row >= 0 ? pos.row : 0) : fail("not-applicable");
    }, "run") });
    r({ id: "table.deleteColumn", label: "Delete table column", group: "Table", run: /* @__PURE__ */ __name((ctx) => {
      const block = api.findBlockAtOffset(ctx.selectionStart, "table");
      const pos = block ? tablePositionForOffset(block, ctx.selectionStart) : null;
      return block ? tableColumnResult(ctx, block, pos?.col ?? 0, "delete") : fail("not-applicable");
    }, "run") });
    r({ id: "code.setLanguage", label: "Set code language", group: "Code", run: /* @__PURE__ */ __name((ctx, args = {}) => {
      const block = api.findBlockAtOffset(ctx.selectionStart, "code-fence");
      return block ? setCodeLanguageResult(ctx, block, String(args.language ?? "")) : fail("not-applicable");
    }, "run") });
    r({ id: "inline.bold", label: "Bold", description: "Strong emphasis", group: "Inline", aliases: ["bold", "strong"], defaultShortcut: "Mod+B", visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => wrapInline(ctx, "**", "**", "Bold"), "run") });
    r({ id: "inline.italic", label: "Italic", description: "Emphasis", group: "Inline", aliases: ["italic", "em"], defaultShortcut: "Mod+I", visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => wrapInline(ctx, "*", "*", "Italic"), "run") });
    r({ id: "inline.code", label: "Inline code", description: "Inline code span", group: "Inline", aliases: ["inline-code", "codespan"], defaultShortcut: "Mod+E", visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => wrapCode(ctx), "run") });
    r({ id: "inline.strikethrough", label: "Strikethrough", description: "Strikethrough text", group: "Inline", aliases: ["strike", "s"], defaultShortcut: "Mod+Shift+X", visibleInSlash: true, run: /* @__PURE__ */ __name((ctx) => wrapInline(ctx, "~~", "~~", "Strikethrough"), "run") });
    r({ id: "inline.link", label: "Link", description: "Insert or wrap a link", group: "Inline", aliases: ["link", "url"], defaultShortcut: "Mod+K", visibleInSlash: true, run: /* @__PURE__ */ __name((ctx, args = {}) => insertLink(ctx, args), "run") });
    r({ id: "inline.image", label: "Image", description: "Insert an image", group: "Inline", aliases: ["image", "img", "picture"], visibleInSlash: true, run: /* @__PURE__ */ __name((ctx, args = {}) => insertImage(ctx, args), "run") });
    r({ id: "view.live", label: "Live mode", group: "View", viewSafe: true, readonlySafe: true, run: /* @__PURE__ */ __name(() => {
      api.setMode("live");
      return okNoop("Live mode.");
    }, "run") });
    r({ id: "view.source", label: "Source mode", group: "View", viewSafe: true, readonlySafe: true, run: /* @__PURE__ */ __name(() => {
      api.setMode("source");
      return okNoop("Source mode.");
    }, "run") });
    r({ id: "completion.close", label: "Close completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => {
      api.closeCompletion();
      return okNoop("Completion closed.");
    }, "run") });
    r({ id: "completion.next", label: "Next completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => {
      api.moveCompletion(1);
      return okNoop();
    }, "run") });
    r({ id: "completion.previous", label: "Previous completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => {
      api.moveCompletion(-1);
      return okNoop();
    }, "run") });
    r({ id: "completion.first", label: "First completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => {
      api.setCompletionIndex(0, 1);
      return okNoop();
    }, "run") });
    r({ id: "completion.last", label: "Last completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => {
      api.setCompletionIndex(api.completionCount() - 1, -1);
      return okNoop();
    }, "run") });
    r({ id: "completion.accept", label: "Accept completion", group: "Completion", viewSafe: true, run: /* @__PURE__ */ __name(() => api.acceptCompletion("action"), "run") });
  }
  __name(installBuiltInActions, "installBuiltInActions");

  // src/component/styles.css
  var styles_default = ':host {\n  color-scheme: light dark;\n  --md-editor-font:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    sans-serif;\n  --md-editor-mono-font:\n    ui-monospace,\n    SFMono-Regular,\n    Menlo,\n    Monaco,\n    Consolas,\n    "Liberation Mono",\n    monospace;\n  --md-editor-font-size: 15px;\n  --md-editor-line-height: 1.55;\n  --md-editor-bg: Canvas;\n  --md-editor-fg: CanvasText;\n  --md-editor-muted: color-mix(in srgb, CanvasText 55%, Canvas 45%);\n  --md-editor-token: color-mix(in srgb, CanvasText 42%, Canvas 58%);\n  --md-editor-border: color-mix(in srgb, CanvasText 22%, Canvas 78%);\n  --md-editor-border-focus: Highlight;\n  --md-editor-radius: 10px;\n  --md-editor-padding: 14px;\n  --md-editor-min-height: 220px;\n  --md-editor-max-height: none;\n  --md-editor-focus-ring: 0 0 0 3px color-mix(in srgb, Highlight 32%, transparent);\n  --md-editor-active-line-ring: none;\n  --md-editor-active-line-bg: transparent;\n  --md-editor-active-cell-ring: var(--md-editor-active-line-ring);\n  --md-editor-active-cell-bg: var(--md-editor-active-line-bg);\n  --md-editor-popup-bg: Canvas;\n  --md-editor-popup-fg: CanvasText;\n  --md-editor-popup-border: color-mix(in srgb, CanvasText 24%, Canvas 76%);\n  --md-editor-popup-shadow: 0 12px 30px rgb(0 0 0 / 0.16);\n  --md-editor-preview-bg: color-mix(in srgb, Canvas 96%, CanvasText 4%);\n  --md-editor-preview-fg: CanvasText;\n  --md-editor-code-bg: color-mix(in srgb, CanvasText 8%, Canvas 92%);\n  --md-editor-code-header-bg: color-mix(in srgb, CanvasText 5%, Canvas 95%);\n  --md-editor-code-accent: color-mix(in srgb, CanvasText 45%, Canvas 55%);\n  --md-editor-tag-bg: color-mix(in srgb, Highlight 14%, Canvas 86%);\n  --md-editor-tag-fg: color-mix(in srgb, Highlight 78%, CanvasText 22%);\n  --md-editor-tag-border: color-mix(in srgb, Highlight 28%, transparent);\n  --md-editor-danger: #b00020;\n  --md-editor-transition-duration: 140ms;\n  --md-editor-transition-ease: cubic-bezier(.2,.8,.2,1);\n  display: block;\n  font-family: var(--md-editor-font);\n  color: var(--md-editor-fg);\n}\n:host([hidden]) {\n  display: none;\n}\n.container {\n  display: grid;\n  gap: 8px;\n  font-size: var(--md-editor-font-size);\n}\n.label:empty {\n  display: none;\n}\n.label {\n  font-weight: 650;\n  color: var(--md-editor-fg);\n}\n.workspace {\n  display: grid;\n  gap: 10px;\n}\n:host([mode="split"]) .workspace,\n:host([preview="side"]) .workspace {\n  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);\n  align-items: stretch;\n}\n.editor-shell {\n  position: relative;\n  min-width: 0;\n}\n.live-editor,\ntextarea,\n.preview {\n  box-sizing: border-box;\n  inline-size: 100%;\n  min-block-size: var(--md-editor-min-height);\n  max-block-size: var(--md-editor-max-height);\n  border: 1px solid var(--md-editor-border);\n  border-radius: var(--md-editor-radius);\n  padding: var(--md-editor-padding);\n  background: var(--md-editor-bg);\n  color: var(--md-editor-fg);\n  line-height: var(--md-editor-line-height);\n  overflow: auto;\n  transition:\n    border-color var(--md-editor-transition-duration) var(--md-editor-transition-ease),\n    box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease),\n    background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease);\n}\n.live-editor:focus,\n.live-editor:focus-within,\ntextarea:focus {\n  outline: none;\n  border-color: var(--md-editor-border-focus);\n  box-shadow: var(--md-editor-focus-ring);\n}\n.live-editor[aria-disabled=true],\ntextarea:disabled {\n  opacity: 0.62;\n  cursor: not-allowed;\n}\ntextarea {\n  display: none;\n  resize: vertical;\n  font-family: var(--md-editor-mono-font);\n  font-size: var(--md-editor-font-size);\n  tab-size: 2;\n}\n:host([mode="source"]) .live-editor {\n  display: none;\n}\n:host([mode="source"]) textarea {\n  display: block;\n}\n:host([mode="split"]) .live-editor {\n  display: none;\n}\n:host([mode="split"]) textarea {\n  display: block;\n}\n:host([mode="preview"]) .live-editor {\n  display: none;\n}\n:host([mode="preview"]) textarea {\n  display: none;\n}\n.preview {\n  display: none;\n  background: var(--md-editor-preview-bg);\n  color: var(--md-editor-preview-fg);\n}\n:host([mode="preview"]) .preview,\n:host([mode="split"]) .preview,\n:host([preview="below"]) .preview,\n:host([preview="side"]) .preview,\n:host([preview="inline-split"]) .preview {\n  display: block;\n}\n:host([preview="none"]):not([mode=split]):not([mode=preview]) .preview {\n  display: none;\n}\n.live-placeholder {\n  color: var(--md-editor-muted);\n  pointer-events: none;\n}\n.md-empty-placeholder::before {\n  content: attr(data-placeholder);\n  position: absolute;\n  color: var(--md-editor-muted);\n  pointer-events: none;\n}\n.md-virtual-spacer {\n  display: block;\n  pointer-events: none;\n  user-select: none;\n  inline-size: 1px;\n  min-block-size: 0;\n}\n.md-line {\n  position: relative;\n  min-block-size: 1.35em;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  border-radius: 6px;\n  padding: 1px 2px;\n  outline: none;\n  transition: background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease), box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease);\n}\n.md-line:focus,\n.md-task-source:focus,\n.md-code-line:focus {\n  box-shadow: var(--md-editor-active-line-ring);\n  background: var(--md-editor-active-line-bg);\n}\n.md-cell:focus {\n  box-shadow: var(--md-editor-active-cell-ring);\n  background: var(--md-editor-active-cell-bg);\n}\n.md-line + .md-line,\n.md-code-block + .md-line,\n.md-table-block + .md-line {\n  margin-block-start: 0.14rem;\n}\n.md-token {\n  color: var(--md-editor-token);\n  font-weight: 500;\n}\n.md-url {\n  color: var(--md-editor-muted);\n  text-decoration: underline;\n}\n.md-tag {\n  padding: 0.04em 0.28em;\n  border: 1px solid var(--md-editor-tag-border);\n  border-radius: 0.35em;\n  background: var(--md-editor-tag-bg);\n  color: var(--md-editor-tag-fg);\n}\n.preview .md-tag {\n  cursor: pointer;\n}\n.preview .md-tag:focus-visible {\n  outline: 2px solid var(--md-editor-border-focus);\n  outline-offset: 2px;\n}\n.md-heading {\n  font-family: var(--md-editor-font);\n  font-weight: 760;\n  line-height: 1.18;\n  margin-block: 0.22em;\n}\n.md-h1 {\n  font-size: 2.0em;\n}\n.md-h2 {\n  font-size: 1.6em;\n}\n.md-h3 {\n  font-size: 1.35em;\n}\n.md-h4 {\n  font-size: 1.18em;\n}\n.md-h5 {\n  font-size: 1.05em;\n}\n.md-h6 {\n  font-size: 1em;\n}\n.md-list {\n  padding-inline-start: calc(var(--md-list-depth, 0) * 1.4em + 2px);\n}\n.md-task-line {\n  display: flex;\n  align-items: baseline;\n  gap: 0.35em;\n}\n.md-task-line input {\n  transform: translateY(0.12em);\n}\n.md-task-source {\n  flex: 1;\n  min-width: 0;\n  white-space: pre-wrap;\n  outline: none;\n  border-radius: 6px;\n}\n.md-quote {\n  --md-quote-depth: 1;\n  border-radius: 0;\n  padding-inline-start: calc(var(--md-quote-depth) * 1em + 0.35em);\n  color: color-mix(in srgb, CanvasText 80%, Canvas 20%);\n  background-image:\n    repeating-linear-gradient(\n      to right,\n      var(--md-editor-border) 0 4px,\n      transparent 4px 1em);\n  background-position: left top;\n  background-repeat: no-repeat;\n  background-size: calc(var(--md-quote-depth) * 1em) 100%;\n}\n.md-quote:dir(rtl) {\n  background-image:\n    repeating-linear-gradient(\n      to left,\n      var(--md-editor-border) 0 4px,\n      transparent 4px 1em);\n  background-position: right top;\n}\n.md-quote-depth-2 {\n  --md-quote-depth: 2;\n}\n.md-quote-depth-3 {\n  --md-quote-depth: 3;\n}\n.md-quote-depth-4 {\n  --md-quote-depth: 4;\n}\n.md-quote-depth-5 {\n  --md-quote-depth: 5;\n}\n.md-quote-depth-6 {\n  --md-quote-depth: 6;\n}\n.md-quote-depth-7 {\n  --md-quote-depth: 7;\n}\n.md-quote-depth-8 {\n  --md-quote-depth: 8;\n}\n.md-quote-depth-9 {\n  --md-quote-depth: 9;\n}\n.md-quote-depth-10 {\n  --md-quote-depth: 10;\n}\n.md-quote-depth-11 {\n  --md-quote-depth: 11;\n}\n.md-quote-depth-12 {\n  --md-quote-depth: 12;\n}\n.md-quote-depth-13 {\n  --md-quote-depth: 13;\n}\n.md-quote-depth-14 {\n  --md-quote-depth: 14;\n}\n.md-quote-depth-15 {\n  --md-quote-depth: 15;\n}\n.md-quote-depth-16 {\n  --md-quote-depth: 16;\n}\n.md-quote + .md-quote {\n  margin-block-start: 0;\n}\n.md-hr-line {\n  display: block;\n  min-block-size: 1.35em;\n  padding-block: 0.55em;\n  color: var(--md-editor-token);\n  cursor: text;\n}\n.md-hr-line::after {\n  content: "";\n  display: block;\n  border-block-start: 1px solid var(--md-editor-border);\n}\n.md-hr-line .md-token {\n  display: none;\n}\n.md-code-block {\n  margin-block: 0.55em;\n  border: 1px solid var(--md-editor-border);\n  border-radius: var(--md-editor-radius);\n  background: var(--md-editor-code-bg);\n  overflow: hidden;\n  transition:\n    border-color var(--md-editor-transition-duration) var(--md-editor-transition-ease),\n    background-color var(--md-editor-transition-duration) var(--md-editor-transition-ease),\n    box-shadow var(--md-editor-transition-duration) var(--md-editor-transition-ease);\n}\n.md-code-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-block-size: 30px;\n  padding: 5px 10px;\n  border-block-end: 1px solid color-mix(in srgb, var(--md-editor-border) 82%, transparent);\n  background: var(--md-editor-code-header-bg);\n  color: var(--md-editor-code-accent);\n  font-family: var(--md-editor-mono-font);\n  font-size: 0.82em;\n  user-select: none;\n}\n.md-code-label {\n  text-transform: lowercase;\n  letter-spacing: 0.015em;\n}\n.md-code-language {\n  color: var(--md-editor-muted);\n}\n.md-code-lines {\n  padding: 10px 12px;\n  font-family: var(--md-editor-mono-font);\n  white-space: pre;\n  overflow-x: auto;\n}\n.md-code-line {\n  min-height: 1.35em;\n  outline: none;\n  white-space: pre;\n  border-radius: 5px;\n}\n.md-code-line:empty::before {\n  content: "\\200b";\n}\n.md-code-fence {\n  display: none;\n}\n.md-table-block {\n  overflow: auto;\n  margin-block: 0.5em;\n}\n.md-table {\n  border-collapse: collapse;\n  inline-size: 100%;\n  table-layout: fixed;\n}\n.md-table th,\n.md-table td {\n  border: 1px solid var(--md-editor-border);\n  padding: 6px 8px;\n  vertical-align: top;\n}\n.md-table th {\n  background: color-mix(in srgb, CanvasText 7%, Canvas 93%);\n  font-weight: 700;\n}\n.md-cell {\n  min-height: 1.35em;\n  outline: none;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n.preview :first-child {\n  margin-block-start: 0;\n}\n.preview :last-child {\n  margin-block-end: 0;\n}\n.preview pre {\n  overflow: auto;\n  padding: 10px;\n  border-radius: 6px;\n  background: var(--md-editor-code-bg);\n}\n.preview code {\n  font-family: var(--md-editor-mono-font);\n  font-size: 0.95em;\n}\n.preview :not(pre) > code {\n  padding: 0.1em 0.3em;\n  border-radius: 4px;\n  background: var(--md-editor-code-bg);\n}\n.preview blockquote {\n  border-inline-start: 4px solid var(--md-editor-border);\n  margin-inline-start: 0;\n  padding-inline-start: 1em;\n  color: var(--md-editor-muted);\n}\n.preview img {\n  max-inline-size: 100%;\n  block-size: auto;\n}\n.preview .md-table-wrap {\n  overflow: auto;\n}\n.preview table {\n  border-collapse: collapse;\n  inline-size: 100%;\n}\n.preview th,\n.preview td {\n  border: 1px solid var(--md-editor-border);\n  padding: 6px 8px;\n}\n.completion-popup {\n  position: absolute;\n  z-index: 20;\n  box-sizing: border-box;\n  min-inline-size: min(240px, calc(100vw - 16px));\n  max-inline-size: min(420px, calc(100vw - 16px));\n  max-block-size: min(320px, 50vh);\n  overflow: auto;\n  border: 1px solid var(--md-editor-popup-border);\n  border-radius: var(--md-editor-radius);\n  background: var(--md-editor-popup-bg);\n  color: var(--md-editor-popup-fg);\n  box-shadow: var(--md-editor-popup-shadow);\n  padding: 4px;\n}\n.completion-popup[hidden] {\n  display: none;\n}\n.remote-presence {\n  z-index: 8;\n  user-select: none;\n  border-radius: var(--md-editor-radius);\n}\n.remote-presence-roster {\n  position: absolute;\n  inline-size: 1px;\n  block-size: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n.remote-presence-cursor {\n  z-index: 2;\n}\n.remote-presence,\n.remote-presence-cursor,\n.remote-presence-caret,\n.remote-presence-selection {\n  transition: none !important;\n  animation: none !important;\n}\n.remote-presence-cursor[hidden] {\n  display: none;\n}\n.remote-presence-caret {\n  background: var(--remote-color);\n  border-radius: 1px;\n  box-shadow: 0 0 0 0.5px var(--md-editor-fg);\n}\n.remote-presence-caret::before {\n  content: "";\n  position: absolute;\n  inset-block-start: -2px;\n  inset-inline-start: -1px;\n  inline-size: 4px;\n  block-size: 3px;\n  border-radius: 2px;\n  background: var(--remote-color);\n}\n.remote-presence-selection {\n  border-radius: 2px;\n  background: var(--remote-selection-color);\n}\n.remote-presence-name {\n  box-sizing: border-box;\n  padding: 3px 6px;\n  border-radius: 4px 4px 4px 0;\n  background: var(--remote-color);\n  color: var(--remote-label-fg, #fff);\n  box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);\n  font: 600 11px/1.25 var(--md-editor-font);\n  letter-spacing: 0;\n}\n@keyframes md-editor-pop {\n  from {\n    opacity: 0;\n    transform: translateY(-3px) scale(.985);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n.completion-item {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 4px 12px;\n  padding: 8px 10px;\n  border-radius: 6px;\n  cursor: pointer;\n}\n.completion-item[aria-selected=true] {\n  background: color-mix(in srgb, Highlight 18%, transparent);\n}\n.completion-item[aria-disabled=true] {\n  cursor: not-allowed;\n  opacity: 0.58;\n}\n.completion-label {\n  font-weight: 650;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.completion-detail,\n.completion-description {\n  color: var(--md-editor-muted);\n  font-size: 0.9em;\n}\n.completion-description {\n  grid-column: 1 / -1;\n}\n.validation {\n  min-block-size: 1.2em;\n  color: var(--md-editor-danger);\n  font-size: 0.92em;\n}\n.validation:empty {\n  display: none;\n}\n.sr-only {\n  position: absolute;\n  inline-size: 1px;\n  block-size: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n@media (max-width: 720px) {\n  :host([mode="split"]) .workspace,\n  :host([preview="side"]) .workspace {\n    grid-template-columns: 1fr;\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  *,\n  *::before,\n  *::after {\n    scroll-behavior: auto !important;\n    transition-duration: 0.001ms !important;\n    animation-duration: 0.001ms !important;\n  }\n  .remote-presence-name {\n    transition: none !important;\n  }\n}\n';

  // src/component/template.ts
  function renderTemplate(ids) {
    return `<style>${styles_default}</style>
      <div class="container" part="container">
        <label class="label" part="label" id="${ids.label}" for="${ids.source}"></label>
        <div class="workspace">
          <div class="editor-shell" part="editor">
            <div class="live-editor" part="live-editor" id="${ids.live}" role="textbox" aria-multiline="true" tabindex="0" aria-controls="${ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${ids.validation}"></div>
            <textarea part="textarea" id="${ids.source}" aria-controls="${ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${ids.validation}" rows="12"></textarea>
            <div class="completion-popup" part="completion-popup" id="${ids.completion}" role="listbox" hidden></div>
          </div>
          <div class="preview" part="preview" aria-label="Rendered markdown preview" tabindex="-1"></div>
        </div>
        <div class="validation" part="error" id="${ids.validation}"></div>
        <div class="sr-only" part="status" id="${ids.status}" aria-live="polite" aria-atomic="true"></div>
      </div>`;
  }
  __name(renderTemplate, "renderTemplate");

  // src/render/html.ts
  function isListBlock(block) {
    return ["bullet-list-item", "ordered-list-item", "task-list-item"].includes(block?.type || "");
  }
  __name(isListBlock, "isListBlock");
  function listIndentWidth(block) {
    return String(block?.list?.indent ?? "").replace(/\t/g, "    ").length;
  }
  __name(listIndentWidth, "listIndentWidth");
  function lineIndentWidth(line) {
    return (/^[ \t]*/.exec(String(line?.text ?? ""))?.[0] ?? "").replace(/\t/g, "    ").length;
  }
  __name(lineIndentWidth, "lineIndentWidth");
  function stripContinuationIndent(text, width) {
    let remaining = Math.max(0, width);
    let index = 0;
    const source = String(text ?? "");
    while (index < source.length && remaining > 0) {
      if (source[index] === " ") {
        index += 1;
        remaining -= 1;
        continue;
      }
      if (source[index] === "	") {
        index += 1;
        remaining = Math.max(0, remaining - 4);
        continue;
      }
      break;
    }
    return source.slice(index);
  }
  __name(stripContinuationIndent, "stripContinuationIndent");
  function renderListFromBlocks(blocks, start, options) {
    const first = blocks[start];
    if (!isListBlock(first)) throw new Error("Expected a list block.");
    const baseIndent = listIndentWidth(first);
    const listType = first.list.listType;
    const sameLevel = /* @__PURE__ */ __name((block) => isListBlock(block) && block.list.listType === listType && listIndentWidth(block) === baseIndent, "sameLevel");
    const items = [];
    let loose = false;
    let index = start;
    let stopList = false;
    while (sameLevel(blocks[index])) {
      const block = blocks[index];
      if (!isListBlock(block)) break;
      const contentIndent = baseIndent + block.list.contentStart - block.list.indent.length;
      const item = {
        block,
        content: [{ type: "paragraph", lines: [block.list.content] }]
      };
      index += 1;
      let pendingBlank = false;
      while (index < blocks.length) {
        const next = requireItem(blocks, index);
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
          item.content.push({ type: "child", html: child.html });
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
            item.content.push({ type: "paragraph", lines: [stripContinuationIndent(next.line.text, contentIndent)] });
            pendingBlank = false;
          } else {
            const last = item.content.at(-1);
            if (last?.type === "paragraph") last.lines.push(stripContinuationIndent(next.line.text, contentIndent));
            else item.content.push({ type: "paragraph", lines: [stripContinuationIndent(next.line.text, contentIndent)] });
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
    const startAttribute = tag === "ol" && Number.isFinite(startNumber) && startNumber !== 1 ? ` start="${startNumber}"` : "";
    const html = items.map((item) => {
      const checkbox = item.block.list.kind === "task-list-item" ? `<input type="checkbox" disabled${item.block.list.checked ? " checked" : ""}> ` : "";
      let paragraphIndex = 0;
      const content = item.content.map((part, index2) => {
        if (part.type === "child") return `
${part.html}`;
        const prefix = paragraphIndex === 0 ? checkbox : "";
        const text = `${prefix}${renderInlineMarkdown(part.lines.join("\n"), options)}`;
        const paragraph = loose || paragraphIndex > 0 ? `<p>${text}</p>` : text;
        paragraphIndex += 1;
        return (item.content[index2 - 1]?.type === "child" ? "\n" : "") + paragraph;
      }).join("");
      return `<li>${content}${item.content.at(-1)?.type === "child" ? "\n" : ""}</li>`;
    }).join("");
    return { html: `<${tag}${startAttribute}>${html}</${tag}>`, nextIndex: index };
  }
  __name(renderListFromBlocks, "renderListFromBlocks");
  function renderMarkdown(markdown, opts = {}) {
    const extracted = extractReferenceDefinitions(markdown, opts.references);
    const options = { ...DEFAULTS, ...opts, references: extracted.references };
    const blocks = parseBlocks(extracted.markdown, options);
    const out = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const block = requireItem(blocks, i);
      if (block.type === "blank") continue;
      if (block.type === "heading") {
        out.push(`<h${block.heading.level} id="${escapeAttribute(block.heading.id)}">${renderInlineMarkdown(block.heading.content, options)}</h${block.heading.level}>`);
        continue;
      }
      if (block.type === "horizontal-rule") {
        out.push("<hr>");
        continue;
      }
      if (block.type === "blockquote") {
        const quotes = [block];
        let j = i + 1;
        while (j < blocks.length && requireItem(blocks, j).type === "blockquote") {
          quotes.push(requireItem(blocks, j));
          j += 1;
        }
        const body = quotes.map((q) => q.quote?.content || "").join("\n");
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
        out.push(`<pre><code${lang}>${escapeHtml(block.codeLines.map((l) => l.text).join("\n"))}</code></pre>`);
        continue;
      }
      if (block.type === "table") {
        const header = block.header.cells;
        const rows = block.rows;
        const alignments = block.delimiter.cells.map((cell) => tableAlignmentFromDelimiter(cell.text));
        out.push(`<div class="md-table-wrap"><table><thead><tr>${header.map((c, i2) => `<th${tableAlignmentStyle(alignments[i2] || "")}>${renderInlineMarkdown(unescapeTableCellText(c.text), options)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${header.map((_, i2) => `<td${tableAlignmentStyle(alignments[i2] || "")}>${renderInlineMarkdown(unescapeTableCellText(r.cells[i2]?.text ?? ""), options)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      if (block.type === "paragraph") {
        const paragraphs = [block];
        let j = i + 1;
        while (j < blocks.length && requireItem(blocks, j).type === "paragraph") {
          paragraphs.push(requireItem(blocks, j));
          j += 1;
        }
        out.push(`<p>${renderInlineMarkdown(paragraphs.map((p) => p.line?.text || "").join("\n"), options)}</p>`);
        i = j - 1;
        continue;
      }
      out.push(`<p>${renderInlineMarkdown(block.line.text, options)}</p>`);
    }
    return out.join("\n");
  }
  __name(renderMarkdown, "renderMarkdown");

  // src/component/element.ts
  var WritemarkEditorElement = class extends HTMLElement {
    static {
      __name(this, "WritemarkEditorElement");
    }
    _nativeTextareaBridge = null;
    _presenceController = null;
    _presenceMappedValue = "";
    _presenceSnapshots = /* @__PURE__ */ new WeakMap();
    _pendingPresenceAfter = null;
    _pendingPresenceRestore = null;
    static formAssociated = true;
    static get observedAttributes() {
      return REFLECTED_ATTRIBUTES;
    }
    constructor() {
      super();
      this._document = new DocumentState();
      this._history = new UndoHistory();
      this._inputController = new InputController({
        getDisabled: /* @__PURE__ */ __name(() => this.disabled, "getDisabled"),
        setDisabled: /* @__PURE__ */ __name((value) => {
          this.disabled = value;
        }, "setDisabled"),
        getReadonly: /* @__PURE__ */ __name(() => this.readonly, "getReadonly"),
        setReadonly: /* @__PURE__ */ __name((value) => {
          this.readonly = value;
        }, "setReadonly"),
        _undo: /* @__PURE__ */ __name((...args) => this._undo(...args), "_undo"),
        _redo: /* @__PURE__ */ __name((...args) => this._redo(...args), "_redo"),
        _snapshot: /* @__PURE__ */ __name((...args) => this._snapshot(...args), "_snapshot"),
        getSourceTextarea: /* @__PURE__ */ __name(() => this._sourceTextarea, "getSourceTextarea"),
        getValue: /* @__PURE__ */ __name(() => this._value, "getValue"),
        setValue: /* @__PURE__ */ __name((value) => {
          this._value = value;
        }, "setValue"),
        getSelection: /* @__PURE__ */ __name(() => this._selection, "getSelection"),
        setSelection: /* @__PURE__ */ __name((value) => {
          this._selection = value;
        }, "setSelection"),
        _scheduleCompletionUpdate: /* @__PURE__ */ __name((...args) => this._scheduleCompletionUpdate(...args), "_scheduleCompletionUpdate"),
        _recordUndo: /* @__PURE__ */ __name((...args) => this._recordUndo(...args), "_recordUndo"),
        _undoGroupForInput: /* @__PURE__ */ __name((...args) => this._undoGroupForInput(...args), "_undoGroupForInput"),
        getRedoStack: /* @__PURE__ */ __name(() => this._redoStack, "getRedoStack"),
        _afterValueChanged: /* @__PURE__ */ __name((...args) => this._afterValueChanged(...args), "_afterValueChanged"),
        _closeCompletion: /* @__PURE__ */ __name((...args) => this._closeCompletion(...args), "_closeCompletion"),
        _isLiveVisible: /* @__PURE__ */ __name((...args) => this._isLiveVisible(...args), "_isLiveVisible"),
        getLiveDirty: /* @__PURE__ */ __name(() => this._liveDirty, "getLiveDirty"),
        _renderAll: /* @__PURE__ */ __name((...args) => this._renderAll(...args), "_renderAll"),
        getIgnoreSelectionChangeCount: /* @__PURE__ */ __name(() => this._ignoreSelectionChangeCount, "getIgnoreSelectionChangeCount"),
        setIgnoreSelectionChangeCount: /* @__PURE__ */ __name((value) => {
          this._ignoreSelectionChangeCount = value;
        }, "setIgnoreSelectionChangeCount"),
        getStructuredSelection: /* @__PURE__ */ __name(() => this._structuredSelection, "getStructuredSelection"),
        setStructuredSelection: /* @__PURE__ */ __name((value) => {
          this._structuredSelection = value;
        }, "setStructuredSelection"),
        _debug: /* @__PURE__ */ __name((...args) => this._debug(...args), "_debug"),
        _debugEditableInfo: /* @__PURE__ */ __name((...args) => this._debugEditableInfo(...args), "_debugEditableInfo"),
        getLiveSelectionAPI: /* @__PURE__ */ __name(() => this._liveSelectionAPI, "getLiveSelectionAPI"),
        getFallbackSelectionPending: /* @__PURE__ */ __name(() => this._fallbackSelectionPending, "getFallbackSelectionPending"),
        setFallbackSelectionPending: /* @__PURE__ */ __name((value) => {
          this._fallbackSelectionPending = value;
        }, "setFallbackSelectionPending"),
        getFallbackEditable: /* @__PURE__ */ __name(() => this._fallbackEditable, "getFallbackEditable"),
        setFallbackEditable: /* @__PURE__ */ __name((value) => {
          this._fallbackEditable = value;
        }, "setFallbackEditable"),
        _ensureEmptyLiveEditable: /* @__PURE__ */ __name((...args) => this._ensureEmptyLiveEditable(...args), "_ensureEmptyLiveEditable"),
        _isSourceActive: /* @__PURE__ */ __name((...args) => this._isSourceActive(...args), "_isSourceActive"),
        _getContext: /* @__PURE__ */ __name((...args) => this._getContext(...args), "_getContext"),
        _isAppleWebKitRuntime: /* @__PURE__ */ __name((...args) => this._isAppleWebKitRuntime(...args), "_isAppleWebKitRuntime"),
        _isIOSWebKitRuntime: /* @__PURE__ */ __name((...args) => this._isIOSWebKitRuntime(...args), "_isIOSWebKitRuntime"),
        getShiftEnterBehavior: /* @__PURE__ */ __name(() => this.shiftEnterBehavior, "getShiftEnterBehavior"),
        _isUnclosedFenceOpeningContext: /* @__PURE__ */ __name((...args) => this._isUnclosedFenceOpeningContext(...args), "_isUnclosedFenceOpeningContext"),
        _runAction: /* @__PURE__ */ __name((...args) => this._runAction(...args), "_runAction"),
        _closestEditable: /* @__PURE__ */ __name((...args) => this._closestEditable(...args), "_closestEditable"),
        _activeEditableFromSelection: /* @__PURE__ */ __name((...args) => this._activeEditableFromSelection(...args), "_activeEditableFromSelection"),
        _editableSourceRange: /* @__PURE__ */ __name((...args) => this._editableSourceRange(...args), "_editableSourceRange"),
        _applyActionResult: /* @__PURE__ */ __name((...args) => this._applyActionResult(...args), "_applyActionResult"),
        _markdownShortcut: /* @__PURE__ */ __name((...args) => this._markdownShortcut(...args), "_markdownShortcut"),
        _parseOptions: /* @__PURE__ */ __name((...args) => this._parseOptions(...args), "_parseOptions"),
        _getCurrentSelection: /* @__PURE__ */ __name((...args) => this._getCurrentSelection(...args), "_getCurrentSelection"),
        _smartBackspace: /* @__PURE__ */ __name((...args) => this._smartBackspace(...args), "_smartBackspace"),
        _debugTextChanges: /* @__PURE__ */ __name((...args) => this._debugTextChanges(...args), "_debugTextChanges"),
        _plainText: /* @__PURE__ */ __name((...args) => this._plainText(...args), "_plainText"),
        _getLiveSelection: /* @__PURE__ */ __name((...args) => this._getLiveSelection(...args), "_getLiveSelection"),
        _displayOffsetFromSourceOffset: /* @__PURE__ */ __name((...args) => this._displayOffsetFromSourceOffset(...args), "_displayOffsetFromSourceOffset"),
        _displayOffsetFromSelection: /* @__PURE__ */ __name((...args) => this._displayOffsetFromSelection(...args), "_displayOffsetFromSelection"),
        _tableCellInputEdit: /* @__PURE__ */ __name((...args) => this._tableCellInputEdit(...args), "_tableCellInputEdit"),
        _sourceOffsetFromDom: /* @__PURE__ */ __name((...args) => this._sourceOffsetFromDom(...args), "_sourceOffsetFromDom")
      });
      this._liveRenderer = new LiveRenderer({
        getLiveEditor: /* @__PURE__ */ __name(() => this._liveEditor, "getLiveEditor"),
        setLiveEditor: /* @__PURE__ */ __name((value) => {
          this._liveEditor = value;
        }, "setLiveEditor"),
        getSourceTextarea: /* @__PURE__ */ __name(() => this._sourceTextarea, "getSourceTextarea"),
        getValue: /* @__PURE__ */ __name(() => this._value, "getValue"),
        _isSourceActive: /* @__PURE__ */ __name((...args) => this._isSourceActive(...args), "_isSourceActive"),
        getSelection: /* @__PURE__ */ __name(() => this._selection, "getSelection"),
        getIsComposing: /* @__PURE__ */ __name(() => this._isComposing, "getIsComposing"),
        _restoreLiveSelection: /* @__PURE__ */ __name((...args) => this._restoreLiveSelection(...args), "_restoreLiveSelection"),
        getMode: /* @__PURE__ */ __name(() => this.mode, "getMode"),
        getPreview: /* @__PURE__ */ __name(() => this.preview, "getPreview"),
        getAttribute: /* @__PURE__ */ __name((...args) => this.getAttribute(...args), "getAttribute"),
        getPreviewElement: /* @__PURE__ */ __name(() => this._preview, "getPreviewElement"),
        setPreview: /* @__PURE__ */ __name((value) => {
          this._preview = value;
        }, "setPreview"),
        getHTML: /* @__PURE__ */ __name((...args) => this.getHTML(...args), "getHTML"),
        _dispatch: this._dispatch.bind(this),
        _emitError: /* @__PURE__ */ __name((...args) => this._emitError(...args), "_emitError"),
        _parseOptions: /* @__PURE__ */ __name((...args) => this._parseOptions(...args), "_parseOptions"),
        _rebuildLiveIndex: /* @__PURE__ */ __name((...args) => this._rebuildLiveIndex(...args), "_rebuildLiveIndex"),
        getLiveIndexDirty: /* @__PURE__ */ __name(() => this._liveIndexDirty, "getLiveIndexDirty"),
        setLiveIndexDirty: /* @__PURE__ */ __name((value) => {
          this._liveIndexDirty = value;
        }, "setLiveIndexDirty"),
        _debug: /* @__PURE__ */ __name((...args) => this._debug(...args), "_debug"),
        getPlaceholder: /* @__PURE__ */ __name(() => this.placeholder, "getPlaceholder"),
        getLiveSelectionAPI: /* @__PURE__ */ __name(() => this._liveSelectionAPI, "getLiveSelectionAPI"),
        _computedLineHeight: /* @__PURE__ */ __name((...args) => this._computedLineHeight(...args), "_computedLineHeight"),
        _rendererOptions: /* @__PURE__ */ __name((...args) => this._rendererOptions(...args), "_rendererOptions"),
        getIndentString: /* @__PURE__ */ __name(() => this.indentString, "getIndentString"),
        getDisabled: /* @__PURE__ */ __name(() => this.disabled, "getDisabled"),
        setDisabled: /* @__PURE__ */ __name((value) => {
          this.disabled = value;
        }, "setDisabled"),
        getReadonly: /* @__PURE__ */ __name(() => this.readonly, "getReadonly"),
        setReadonly: /* @__PURE__ */ __name((value) => {
          this.readonly = value;
        }, "setReadonly")
      });
      this._selectionController = new SelectionController({
        hasComponentFocus: /* @__PURE__ */ __name((...args) => this._hasComponentFocus(...args), "hasComponentFocus"),
        readSelectionCandidates: /* @__PURE__ */ __name((...args) => this._liveSelectionCandidates(...args), "readSelectionCandidates"),
        isIOSWebKitRuntime: /* @__PURE__ */ __name((...args) => this._isIOSWebKitRuntime(...args), "isIOSWebKitRuntime"),
        isAppleWebKitRuntime: /* @__PURE__ */ __name((...args) => this._isAppleWebKitRuntime(...args), "isAppleWebKitRuntime"),
        getDisabled: /* @__PURE__ */ __name(() => this.disabled, "getDisabled"),
        getReadonly: /* @__PURE__ */ __name(() => this.readonly, "getReadonly"),
        getMode: /* @__PURE__ */ __name(() => this.mode, "getMode"),
        _closeCompletion: /* @__PURE__ */ __name((...args) => this._closeCompletion(...args), "_closeCompletion"),
        getSelection: /* @__PURE__ */ __name(() => this._selection, "getSelection"),
        setSelection: /* @__PURE__ */ __name((value) => {
          this._selection = value;
        }, "setSelection"),
        setSelectionRange: /* @__PURE__ */ __name((...args) => this.setSelectionRange(...args), "setSelectionRange"),
        getOwnerDocument: /* @__PURE__ */ __name(() => this.ownerDocument, "getOwnerDocument"),
        _emitSelectionChange: /* @__PURE__ */ __name((...args) => this._emitSelectionChange(...args), "_emitSelectionChange"),
        getIsComposing: /* @__PURE__ */ __name(() => this._isComposing, "getIsComposing"),
        setIsComposing: /* @__PURE__ */ __name((value) => {
          this._isComposing = value;
        }, "setIsComposing"),
        _scheduleCompletionUpdate: /* @__PURE__ */ __name((...args) => this._scheduleCompletionUpdate(...args), "_scheduleCompletionUpdate"),
        getValue: /* @__PURE__ */ __name(() => this._value, "getValue"),
        _activeEditableFromEvent: /* @__PURE__ */ __name((...args) => this._activeEditableFromEvent(...args), "_activeEditableFromEvent"),
        getShadow: /* @__PURE__ */ __name(() => this._shadow, "getShadow"),
        _debug: /* @__PURE__ */ __name((...args) => this._debug(...args), "_debug"),
        _debugEditableInfo: /* @__PURE__ */ __name((...args) => this._debugEditableInfo(...args), "_debugEditableInfo"),
        getSourceTextarea: /* @__PURE__ */ __name(() => this._sourceTextarea, "getSourceTextarea"),
        getPreview: /* @__PURE__ */ __name(() => this._preview, "getPreview"),
        getLiveEditor: /* @__PURE__ */ __name(() => this._liveEditor, "getLiveEditor"),
        setLiveEditor: /* @__PURE__ */ __name((value) => {
          this._liveEditor = value;
        }, "setLiveEditor"),
        getVirtualState: /* @__PURE__ */ __name(() => this._virtualState, "getVirtualState"),
        _ensureVirtualSelectionVisible: /* @__PURE__ */ __name((...args) => this._ensureVirtualSelectionVisible(...args), "_ensureVirtualSelectionVisible"),
        getIsConnected: /* @__PURE__ */ __name(() => this.isConnected, "getIsConnected"),
        _lineEditable: /* @__PURE__ */ __name((...args) => this._lineEditable(...args), "_lineEditable"),
        _syncLiveEditingHosts: /* @__PURE__ */ __name((...args) => this._syncLiveEditingHosts(...args), "_syncLiveEditingHosts"),
        _isSourceOffsetRendered: /* @__PURE__ */ __name((...args) => this._isSourceOffsetRendered(...args), "_isSourceOffsetRendered"),
        getLiveBlocks: /* @__PURE__ */ __name(() => this._liveBlocks, "getLiveBlocks"),
        setLiveBlocks: /* @__PURE__ */ __name((value) => {
          this._liveBlocks = value;
        }, "setLiveBlocks"),
        _getBlocks: /* @__PURE__ */ __name((...args) => this._getBlocks(...args), "_getBlocks"),
        _renderLiveVirtual: /* @__PURE__ */ __name((...args) => this._renderLiveVirtual(...args), "_renderLiveVirtual"),
        _renderLiveFull: /* @__PURE__ */ __name((...args) => this._renderLiveFull(...args), "_renderLiveFull")
      });
      this._internals = this.attachInternals?.() ?? null;
      this._shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
      this._value = "";
      this._defaultValue = "";
      this._selection = { start: 0, end: 0, direction: "none" };
      this._dirty = false;
      this._formDisabled = false;
      this._hostTabIndexBeforeDisable = void 0;
      this._hasConnected = false;
      this._debugSequence = 0;
      this._selectAllLevel = 0;
      this._focusWithin = false;
      this._validationVisible = false;
      this._completionPositionFrame = 0;
      this._completionVisualViewport = null;
      this._boundCompletionViewportChange = () => this._scheduleCompletionPositionUpdate();
      this._actions = /* @__PURE__ */ new Map();
      this._tagProvider = null;
      this._tagIndex = [];
      this._ids = { label: uid("mfe-label"), source: uid("mfe-source"), live: uid("mfe-live"), completion: uid("mfe-completion"), status: uid("mfe-status"), validation: uid("mfe-validation") };
      this._completionController = new CompletionController({
        registerProvider: /* @__PURE__ */ __name((...args) => this.registerCompletionProvider(...args), "registerProvider"),
        getContext: /* @__PURE__ */ __name((...args) => this._getContext(...args), "getContext"),
        emitError: /* @__PURE__ */ __name((...args) => this._emitError(...args), "emitError"),
        render: /* @__PURE__ */ __name((...args) => this._renderCompletion(...args), "render"),
        stopPositionTracking: /* @__PURE__ */ __name((...args) => this._stopCompletionPositionTracking(...args), "stopPositionTracking"),
        startPositionTracking: /* @__PURE__ */ __name((...args) => this._startCompletionPositionTracking(...args), "startPositionTracking"),
        isUnclosedFenceOpeningContext: /* @__PURE__ */ __name((...args) => this._isUnclosedFenceOpeningContext(...args), "isUnclosedFenceOpeningContext"),
        snapshot: /* @__PURE__ */ __name((...args) => this._snapshot(...args), "snapshot"),
        getRevision: /* @__PURE__ */ __name(() => this.revision, "getRevision"),
        applyTransaction: /* @__PURE__ */ __name((...args) => this._applyTransaction(...args), "applyTransaction"),
        dispatch: this._dispatch.bind(this),
        announce: /* @__PURE__ */ __name((...args) => this._announce(...args), "announce"),
        getTags: /* @__PURE__ */ __name((...args) => this.getTags(...args), "getTags"),
        actions: /* @__PURE__ */ __name(() => this._actions.values(), "actions"),
        getTagIndex: /* @__PURE__ */ __name(() => this._tagIndex, "getTagIndex"),
        getTagProvider: /* @__PURE__ */ __name(() => this._tagProvider, "getTagProvider"),
        tagsEnabled: /* @__PURE__ */ __name(() => this.tagsEnabled, "tagsEnabled"),
        disabled: /* @__PURE__ */ __name(() => this.disabled, "disabled"),
        readonly: /* @__PURE__ */ __name(() => this.readonly, "readonly"),
        isComposing: /* @__PURE__ */ __name(() => this._isComposing, "isComposing")
      });
      this._providers = this._completionController._providers;
      this._installBuiltInActions();
      this._installBuiltInProviders();
    }
    get _completion() {
      return this._completionController._completion;
    }
    set _completion(value) {
      this._completionController._completion = value;
    }
    get _completionUpdateFrame() {
      return this._completionController._completionUpdateFrame;
    }
    set _completionUpdateFrame(value) {
      this._completionController._completionUpdateFrame = value;
    }
    get _value() {
      return this._document.value;
    }
    set _value(value) {
      this._document.value = value;
    }
    get _defaultValue() {
      return this._document.defaultValue;
    }
    set _defaultValue(value) {
      this._document.defaultValue = value;
    }
    get _selection() {
      return this._document.selection;
    }
    set _selection(value) {
      this._document.selection = value;
    }
    get _dirty() {
      return this._document.dirty;
    }
    set _dirty(value) {
      this._document.dirty = value;
    }
    get _undoStack() {
      return this._history.undoStack;
    }
    set _undoStack(value) {
      this._history.undoStack = value;
    }
    get _redoStack() {
      return this._history.redoStack;
    }
    set _redoStack(value) {
      this._history.redoStack = value;
    }
    get _maxUndo() {
      return this._history.maxEntries;
    }
    set _maxUndo(value) {
      this._history.maxEntries = value;
    }
    get _beforeInputSnapshot() {
      return this._inputController._beforeInputSnapshot;
    }
    set _beforeInputSnapshot(value) {
      this._inputController._beforeInputSnapshot = value;
    }
    get _beforeInputTarget() {
      return this._inputController._beforeInputTarget;
    }
    set _beforeInputTarget(value) {
      this._inputController._beforeInputTarget = value;
    }
    get _compositionSnapshot() {
      return this._inputController._compositionSnapshot;
    }
    set _compositionSnapshot(value) {
      this._inputController._compositionSnapshot = value;
    }
    get _isComposing() {
      return this._inputController._isComposing;
    }
    set _isComposing(value) {
      this._inputController._isComposing = value;
    }
    get _pendingFenceOpening() {
      return this._inputController._pendingFenceOpening;
    }
    set _pendingFenceOpening(value) {
      this._inputController._pendingFenceOpening = value;
    }
    get _webKitNativeInput() {
      return this._inputController._webKitNativeInput;
    }
    set _webKitNativeInput(value) {
      this._inputController._webKitNativeInput = value;
    }
    get _blockCache() {
      return this._liveRenderer._blockCache;
    }
    set _blockCache(value) {
      this._liveRenderer._blockCache = value;
    }
    get _blockCacheValue() {
      return this._liveRenderer._blockCacheValue;
    }
    set _blockCacheValue(value) {
      this._liveRenderer._blockCacheValue = value;
    }
    get _hasRenderedOnce() {
      return this._liveRenderer._hasRenderedOnce;
    }
    set _hasRenderedOnce(value) {
      this._liveRenderer._hasRenderedOnce = value;
    }
    get _lastParseMode() {
      return this._liveRenderer._lastParseMode;
    }
    set _lastParseMode(value) {
      this._liveRenderer._lastParseMode = value;
    }
    get _liveBlocks() {
      return this._liveRenderer._liveBlocks;
    }
    set _liveBlocks(value) {
      this._liveRenderer._liveBlocks = value;
    }
    get _liveDirty() {
      return this._liveRenderer._liveDirty;
    }
    set _liveDirty(value) {
      this._liveRenderer._liveDirty = value;
    }
    get _nativeLiveDomDirty() {
      return this._liveRenderer._nativeLiveDomDirty;
    }
    set _nativeLiveDomDirty(value) {
      this._liveRenderer._nativeLiveDomDirty = value;
    }
    get _previewDirty() {
      return this._liveRenderer._previewDirty;
    }
    set _previewDirty(value) {
      this._liveRenderer._previewDirty = value;
    }
    get _previewRenderTimer() {
      return this._liveRenderer._previewRenderTimer;
    }
    set _previewRenderTimer(value) {
      this._liveRenderer._previewRenderTimer = value;
    }
    get _virtualMetricsCache() {
      return this._liveRenderer._virtualMetricsCache;
    }
    set _virtualMetricsCache(value) {
      this._liveRenderer._virtualMetricsCache = value;
    }
    get _virtualScrollFrame() {
      return this._liveRenderer._virtualScrollFrame;
    }
    set _virtualScrollFrame(value) {
      this._liveRenderer._virtualScrollFrame = value;
    }
    get _virtualState() {
      return this._liveRenderer._virtualState;
    }
    set _virtualState(value) {
      this._liveRenderer._virtualState = value;
    }
    get _liveEditablesCache() {
      return this._selectionController._liveEditablesCache;
    }
    set _liveEditablesCache(value) {
      this._selectionController._liveEditablesCache = value;
    }
    get _liveNavigationCache() {
      return this._selectionController._liveNavigationCache;
    }
    set _liveNavigationCache(value) {
      this._selectionController._liveNavigationCache = value;
    }
    get _liveIndexDirty() {
      return this._selectionController._liveIndexDirty;
    }
    set _liveIndexDirty(value) {
      this._selectionController._liveIndexDirty = value;
    }
    get _liveSelectionAPI() {
      return this._selectionController._liveSelectionAPI;
    }
    set _liveSelectionAPI(value) {
      this._selectionController._liveSelectionAPI = value;
    }
    get _fallbackEditable() {
      return this._selectionController._fallbackEditable;
    }
    set _fallbackEditable(value) {
      this._selectionController._fallbackEditable = value;
    }
    get _fallbackSelectionPending() {
      return this._selectionController._fallbackSelectionPending;
    }
    set _fallbackSelectionPending(value) {
      this._selectionController._fallbackSelectionPending = value;
    }
    get _selectionRestoreRequest() {
      return this._selectionController._selectionRestoreRequest;
    }
    set _selectionRestoreRequest(value) {
      this._selectionController._selectionRestoreRequest = value;
    }
    get _pointerSelection() {
      return this._selectionController._pointerSelection;
    }
    set _pointerSelection(value) {
      this._selectionController._pointerSelection = value;
    }
    get _suppressLiveClick() {
      return this._selectionController._suppressLiveClick;
    }
    set _suppressLiveClick(value) {
      this._selectionController._suppressLiveClick = value;
    }
    get _structuredSelection() {
      return this._selectionController._structuredSelection;
    }
    set _structuredSelection(value) {
      this._selectionController._structuredSelection = value;
    }
    get _ignoreSelectionChangeCount() {
      return this._selectionController._ignoreSelectionChangeCount;
    }
    set _ignoreSelectionChangeCount(value) {
      this._selectionController._ignoreSelectionChangeCount = value;
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
        this._renderAll({ restoreSelection: this.matches(":focus-within") });
        this._updateFormValue();
        this._updateValidity();
      }
      if (this._completion.open) this._startCompletionPositionTracking();
      this._presenceController?.connect();
    }
    disconnectedCallback() {
      this._presenceController?.disconnect();
      this._selectionController.disconnect();
      this._completionController.disconnect();
      this._selectionRestoreRequest += 1;
      this._completion.abort?.abort();
      if (this._previewRenderTimer) globalThis.clearTimeout?.(this._previewRenderTimer);
      if (this._completionUpdateFrame) cancelAnimationFrame(this._completionUpdateFrame);
      this._stopCompletionPositionTracking();
      if (this._virtualScrollFrame) cancelAnimationFrame(this._virtualScrollFrame);
      this._previewRenderTimer = 0;
      this._completionUpdateFrame = 0;
      this._completionPositionFrame = 0;
      this._virtualScrollFrame = 0;
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "value") {
        const nextDefault = normalizeLineEndings(newValue ?? "");
        if (!this._hasConnected) {
          this._value = nextDefault;
          this._defaultValue = nextDefault;
          return;
        }
        const wasDirty = this._dirty;
        this._defaultValue = nextDefault;
        if (!wasDirty) this._setValueInternal(nextDefault, { source: "attribute", silent: true, recordUndo: false, preserveSelection: false });
        else {
          const oldDirty = this._dirty;
          this._dirty = this._value !== this._defaultValue;
          if (oldDirty !== this._dirty) this._dispatch("md-dirty-change", { dirty: this._dirty });
          this._dispatch("md-value-sync", { value: this._value, defaultValue: this._defaultValue, revision: this.revision });
        }
        return;
      }
      if (!this._hasConnected) return;
      if (name === "tags-enabled") {
        const restoreFocus2 = this._hasComponentFocus();
        if (!this._isComposing) this._selection = { ...this._getCurrentSelection() };
        if (!restoreFocus2) this._selectionRestoreRequest += 1;
        this._closeCompletion();
        const tagChange = this._refreshTagIndex();
        this._renderAll({ restoreSelection: restoreFocus2 && !this.disabled, force: true });
        if (restoreFocus2 && !this.disabled && !this._isComposing) this._focusEditable();
        if (tagChange) this._dispatch("md-tags-change", { ...tagChange, source: "attribute", inputType: null });
        if (restoreFocus2) this._scheduleCompletionUpdate();
        return;
      }
      if (this._isComposing && ["mode", "disabled", "readonly"].includes(name)) {
        this._onCompositionEnd();
      }
      const restoreFocus = (name === "mode" || name === "readonly") && (this._focusWithin || Boolean(this._shadow.activeElement));
      if ((name === "disabled" || name === "readonly") && (this.disabled || this.readonly)) this._closeCompletion();
      this._syncAttributesToControls();
      if (name === "disabled" && this.disabled) this.blur();
      if (["mode", "preview", "disabled", "readonly"].includes(name)) this._renderAll({ restoreSelection: !this.disabled, force: true });
      if (["required", "disabled", "readonly", "maxlength", "minlength"].includes(name)) {
        this._updateFormValue();
        this._updateValidity();
      }
      if (restoreFocus && !this.disabled) this._focusEditable();
    }
    get revision() {
      return this._document.revision;
    }
    setRemoteCursors(cursors, options) {
      return this._getPresenceController()?.set(cursors, options) ?? false;
    }
    updateRemoteCursors(update) {
      return this._getPresenceController()?.update(update) ?? { ok: false, reason: "not-connected" };
    }
    _getPresenceController() {
      if (!this._hasConnected || !this.isConnected) return null;
      if (this._presenceController) return this._presenceController;
      this._presenceMappedValue = this._value;
      this._presenceController = new PresenceController({
        host: this,
        shell: this._requireControl(".editor-shell", HTMLElement),
        source: this._sourceTextarea,
        live: this._liveEditor,
        getMode: /* @__PURE__ */ __name(() => this.mode, "getMode"),
        getValue: /* @__PURE__ */ __name(() => this._value, "getValue"),
        getRevision: /* @__PURE__ */ __name(() => this.revision, "getRevision"),
        domPositionFromSource: /* @__PURE__ */ __name((offset) => this._virtualState.active && !this._isSourceOffsetRendered(offset) ? null : this._domPositionFromSource(offset), "domPositionFromSource")
      });
      return this._presenceController;
    }
    getRemoteCursors() {
      return this._presenceController?.get() ?? [];
    }
    applyTransaction(request) {
      const beforeRevision = this.revision;
      let origin = { kind: "external" };
      const reject = /* @__PURE__ */ __name((reason) => ({ ok: false, reason, beforeRevision, revision: this.revision, origin }), "reject");
      const checked = validateTransactionRequest(this._value, request, beforeRevision);
      if (this.revision !== beforeRevision) return reject("reentrant-change");
      if (!checked.ok) return reject(checked.reason);
      origin = Object.freeze({ ...checked.request.origin ?? origin });
      if (checked.request.baseRevision !== beforeRevision) return reject("stale-revision");
      if (this.disabled) return reject("disabled");
      if (this.readonly) return reject("readonly");
      if (this._isComposing) return reject("composition-active");
      const selection = checked.request.selectionAfter ?? mapTransactionSelection(this._getCurrentSelection(), checked.changes);
      if (checked.value === this._value) {
        if (checked.request.selectionAfter) this._setSelectionRangeWithoutFocus(selection.start, selection.end, selection.direction);
        return { ok: true, changed: false, beforeRevision, revision: this.revision, origin, selection: { ...this._getCurrentSelection() } };
      }
      const transaction = { changes: checked.changes, selectionAfter: { ...selection }, origin, source: "api", undoGroup: "external" };
      if (!this._applyTransaction(transaction, { restoreSelection: this._isSourceActive() || this.matches(":focus-within") })) return reject(this.revision !== beforeRevision ? "reentrant-change" : this.disabled ? "disabled" : this.readonly ? "readonly" : this._isComposing ? "composition-active" : "change-canceled");
      return { ok: true, changed: true, beforeRevision, revision: this.revision, origin, selection: { ...this._selection } };
    }
    get value() {
      return this._value;
    }
    set value(next) {
      this._setValueInternal(next, { source: "api", silent: false, recordUndo: false });
    }
    get defaultValue() {
      return this._defaultValue;
    }
    set defaultValue(next) {
      this._defaultValue = normalizeLineEndings(next ?? "");
      this.setAttribute("value", this._defaultValue);
    }
    get name() {
      return this.getAttribute("name") ?? "";
    }
    set name(v) {
      v == null ? this.removeAttribute("name") : this.setAttribute("name", String(v));
    }
    get label() {
      return this.getAttribute("label") ?? "";
    }
    set label(v) {
      v == null ? this.removeAttribute("label") : this.setAttribute("label", String(v));
    }
    get placeholder() {
      return this.getAttribute("placeholder") ?? DEFAULTS.placeholder;
    }
    set placeholder(v) {
      v == null ? this.removeAttribute("placeholder") : this.setAttribute("placeholder", String(v));
    }
    get mode() {
      const v = this.getAttribute("mode") ?? DEFAULTS.mode;
      return v === "live" || v === "source" || v === "split" || v === "preview" ? v : DEFAULTS.mode;
    }
    set mode(v) {
      v == null ? this.removeAttribute("mode") : this.setAttribute("mode", String(v));
    }
    get preview() {
      const v = this.getAttribute("preview") ?? DEFAULTS.preview;
      return v === "none" || v === "below" || v === "side" || v === "inline-split" ? v : DEFAULTS.preview;
    }
    set preview(v) {
      v == null ? this.removeAttribute("preview") : this.setAttribute("preview", String(v));
    }
    get markdownFlavor() {
      const v = this.getAttribute("markdown-flavor") ?? DEFAULTS.markdownFlavor;
      return v === "gfm" || v === "commonmark" ? v : DEFAULTS.markdownFlavor;
    }
    set markdownFlavor(v) {
      v == null ? this.removeAttribute("markdown-flavor") : this.setAttribute("markdown-flavor", String(v));
    }
    get tagsEnabled() {
      return this.hasAttribute("tags-enabled");
    }
    set tagsEnabled(v) {
      this.toggleAttribute("tags-enabled", Boolean(v));
    }
    get shiftEnterBehavior() {
      const v = this.getAttribute("shift-enter-behavior") ?? DEFAULTS.shiftEnterBehavior;
      return v === "soft-break" || v === "smart-enter" ? v : DEFAULTS.shiftEnterBehavior;
    }
    set shiftEnterBehavior(v) {
      v == null ? this.removeAttribute("shift-enter-behavior") : this.setAttribute("shift-enter-behavior", String(v));
    }
    get tabBehavior() {
      const v = this.getAttribute("tab-behavior") ?? DEFAULTS.tabBehavior;
      return v === "accessibility-first" || v === "editor-first" ? v : DEFAULTS.tabBehavior;
    }
    set tabBehavior(v) {
      v == null ? this.removeAttribute("tab-behavior") : this.setAttribute("tab-behavior", String(v));
    }
    get indentString() {
      return normalizeIndentAttribute(this.getAttribute("indent-string") ?? DEFAULTS.indentString);
    }
    set indentString(v) {
      this.setAttribute("indent-string", v === "	" ? "tab" : String(v));
    }
    get debug() {
      const raw = Number(this.getAttribute("debug") ?? DEFAULTS.debug);
      return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULTS.debug;
    }
    set debug(v) {
      if (v == null) {
        this.removeAttribute("debug");
        return;
      }
      const next = Number(v);
      this.setAttribute("debug", String(Number.isFinite(next) && next >= 0 ? Math.floor(next) : DEFAULTS.debug));
    }
    get debugLog() {
      return this.hasAttribute("debug-log");
    }
    set debugLog(v) {
      this.toggleAttribute("debug-log", Boolean(v));
    }
    get disabled() {
      return this.hasAttribute("disabled") || this._formDisabled;
    }
    set disabled(v) {
      this.toggleAttribute("disabled", Boolean(v));
    }
    get readonly() {
      return this.hasAttribute("readonly");
    }
    set readonly(v) {
      this.toggleAttribute("readonly", Boolean(v));
    }
    get required() {
      return this.hasAttribute("required");
    }
    set required(v) {
      this.toggleAttribute("required", Boolean(v));
    }
    get dirty() {
      return this._dirty;
    }
    get tagProvider() {
      return this._tagProvider;
    }
    set tagProvider(provider) {
      if (provider != null && (typeof provider !== "object" || typeof provider.getItems !== "function")) {
        throw new TypeError("tagProvider requires a getItems function.");
      }
      this._tagProvider = provider || null;
      if (this._hasConnected && this.tagsEnabled) this._scheduleCompletionUpdate({ immediate: true });
    }
    get selectionStart() {
      return this._getCurrentSelection().start;
    }
    set selectionStart(v) {
      this.setSelectionRange(v, this.selectionEnd);
    }
    get selectionEnd() {
      return this._getCurrentSelection().end;
    }
    set selectionEnd(v) {
      this.setSelectionRange(this.selectionStart, v);
    }
    get validationMessage() {
      return this._internals?.validationMessage || this._validationMessage || "";
    }
    get validity() {
      return this._internals?.validity ?? this._fallbackValidity();
    }
    get willValidate() {
      return this._internals?.willValidate ?? !this.disabled;
    }
    addEventListener(type, listener, options) {
      if (listener) super.addEventListener(type, listener, options);
    }
    removeEventListener(type, listener, options) {
      if (listener) super.removeEventListener(type, listener, options);
    }
    focus(options) {
      this._focusEditable(options);
    }
    blur() {
      this._focusWithin = false;
      const active = this._shadow?.activeElement;
      if (active instanceof HTMLElement) active.blur();
      this._sourceTextarea?.blur();
      this._liveEditor?.blur();
      this._preview?.blur();
    }
    select() {
      this.setSelectionRange(0, this._value.length);
    }
    setSelectionRange(start, end, direction = "none") {
      this._setSelectionRange(start, end, direction, true);
    }
    _setSelectionRangeWithoutFocus(start, end, direction = "none") {
      if (!this.matches(":focus-within") && this._selection.start === clamp(Number(start) || 0, 0, this._value.length) && this._selection.end === clamp(Number(end) || 0, 0, this._value.length) && this._selection.direction === direction) return;
      this._setSelectionRange(start, end, direction, this.matches(":focus-within"));
    }
    _setSelectionRange(start, end, direction, restoreLive) {
      const s = clamp(Number(start) || 0, 0, this._value.length);
      const e = clamp(Number(end) || 0, 0, this._value.length);
      this._selection = { start: s, end: e, direction };
      this._structuredSelection = !this._isSourceActive() && s !== e ? { start: s, end: e, direction, label: "selection" } : null;
      if (this._sourceTextarea && this._isSourceActive()) this._sourceTextarea.setSelectionRange(s, e, direction);
      if (restoreLive && this._liveEditor && !this._isSourceActive()) {
        this._ignoreSelectionChangeCount = 2;
        this._restoreLiveSelection(this._selection);
      }
      this._emitSelectionChange();
      this._scheduleCompletionUpdate();
    }
    exec(actionId, args) {
      const result = this._runAction(actionId, args, { source: "api", apply: true });
      return Boolean(result?.ok);
    }
    registerAction(action) {
      if (!action || typeof action.id !== "string" || typeof action.run !== "function") throw new TypeError("registerAction(action) requires an action with string id and run(ctx,args).");
      this._actions.set(action.id, { group: "Custom", visibleInSlash: false, aliases: [], keywords: [], ...action });
    }
    unregisterAction(actionId) {
      this._actions.delete(actionId);
    }
    registerCompletionProvider(provider) {
      if (!provider || typeof provider.id !== "string" || typeof provider.match !== "function" || typeof provider.getItems !== "function" || typeof provider.apply !== "function") throw new TypeError("Completion provider requires id, match, getItems, apply.");
      this._providers.set(provider.id, { priority: 0, triggers: [], ...provider });
    }
    unregisterCompletionProvider(providerId) {
      this._providers.delete(providerId);
      if (this._completion.providerId === providerId) this._closeCompletion();
    }
    getHTML() {
      return renderMarkdown(this._value, this._rendererOptions());
    }
    getText() {
      return textFromMarkdown(this._value, this._rendererOptions());
    }
    getTags() {
      return cloneTags(this._tagIndex);
    }
    getMarkdown() {
      return this._value;
    }
    setMarkdown(markdown) {
      this.value = markdown;
    }
    getPlainText() {
      return this.getText();
    }
    getSelectionMarkdown() {
      const sel = this._getCurrentSelection();
      return this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end));
    }
    insertMarkdown(markdown) {
      return this.exec("editor.insertText", { text: markdown });
    }
    canExec(actionId, args) {
      const action = this._actions.get(actionId);
      if (!action) return false;
      const ctx = this._getContext();
      if (ctx.mode === "disabled" && !action.viewSafe) return false;
      if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return false;
      if (ctx.mode === "composing-ime" && action.structural !== false) return false;
      return !action.when || action.when(ctx, args);
    }
    getCurrentBlock() {
      const sel = this._getCurrentSelection();
      return this._findBlockAtOffset(sel.start) || null;
    }
    getSelectedBlocks() {
      const sel = this._getCurrentSelection();
      const start = Math.min(sel.start, sel.end);
      const end = Math.max(sel.start, sel.end);
      return this._getBlocks().filter((block) => block.to >= start && block.from <= end);
    }
    getActiveMarks() {
      return this._getActiveStateIds(this._getContext());
    }
    find(query, options = {}) {
      return this._findText(query, options);
    }
    replace(query, replacement, options = {}) {
      return this._replaceText(query, replacement, { ...options, all: false });
    }
    replaceAll(query, replacement, options = {}) {
      return this._replaceText(query, replacement, { ...options, all: true });
    }
    commit() {
      const oldDirty = this._dirty;
      const revision = this.revision;
      const value = this._value;
      this._defaultValue = value;
      this._dirty = false;
      this._dispatch("md-value-sync", { value, defaultValue: value, revision });
      if (this.revision !== revision || this._defaultValue !== value) return;
      this._dispatch("md-change", { value, origin: { kind: "api" }, beforeRevision: revision, revision });
      if (this.revision !== revision || this._defaultValue !== value) return;
      if (oldDirty) this._dispatch("md-dirty-change", { dirty: false });
    }
    reset() {
      this._nativeTextareaBridge?.valueChanged("reset");
      const defaultValue = this._defaultValue;
      const expectedRevision = this.revision + (this._value === defaultValue ? 0 : 1);
      this._setValueInternal(defaultValue, { source: "api", recordUndo: true });
      if (this.revision !== expectedRevision || this._defaultValue !== defaultValue) return;
      this.setSelectionRange(0, 0);
      if (this.revision !== expectedRevision || this._defaultValue !== defaultValue) return;
      this._dirty = false;
      this._dispatch("md-dirty-change", { dirty: false });
    }
    checkValidity() {
      this._updateValidity();
      return this._internals ? this._internals.checkValidity() : this._fallbackValidity().valid;
    }
    reportValidity() {
      this._validationVisible = true;
      this._updateValidity();
      return this._internals ? this._internals.reportValidity() : this.checkValidity();
    }
    setCustomValidity(message) {
      this._customValidityMessage = String(message ?? "");
      this._updateValidity();
    }
    _upgradeProperties() {
      for (const prop of ["value", "defaultValue", "name", "label", "placeholder", "mode", "preview", "markdownFlavor", "tagsEnabled", "shiftEnterBehavior", "tabBehavior", "indentString", "debug", "debugLog", "disabled", "readonly", "required", "tagProvider"]) {
        if (Object.prototype.hasOwnProperty.call(this, prop)) {
          this._upgradeProperty(prop);
        }
      }
    }
    _upgradeProperty(prop) {
      const value = this[prop];
      Reflect.deleteProperty(this, prop);
      this[prop] = value;
    }
    _requireControl(selector, constructor) {
      const control = this._shadow.querySelector(selector);
      if (!(control instanceof constructor)) throw new Error(`Missing editor control: ${selector}`);
      return control;
    }
    _renderShell() {
      this._shadow.innerHTML = renderTemplate(this._ids);
      this._label = this._requireControl(".label", HTMLLabelElement);
      this._liveEditor = this._requireControl(".live-editor", HTMLElement);
      this._sourceTextarea = this._requireControl("textarea", HTMLTextAreaElement);
      this._preview = this._requireControl(".preview", HTMLElement);
      this._completionPopup = this._requireControl(".completion-popup", HTMLElement);
      this._validation = this._requireControl(".validation", HTMLElement);
      this._status = this._requireControl(".sr-only", HTMLElement);
    }
    _bindEvents() {
      this.addEventListener("focus", (event) => {
        if (this._nativeTextareaBridge && event.composedPath()[0] === this && !this._shadow.activeElement) this._focusEditable({ preventScroll: true });
      });
      this._sourceTextarea.addEventListener("beforeinput", (event) => this._onSourceBeforeInput(event));
      this._sourceTextarea.addEventListener("input", (event) => this._onSourceInput(event));
      this._sourceTextarea.addEventListener("change", () => this._dispatch("md-change", { value: this._value, origin: { kind: "user" }, beforeRevision: this.revision, revision: this.revision }));
      this._sourceTextarea.addEventListener("keydown", (event) => this._onKeyDown(event));
      this._sourceTextarea.addEventListener("keyup", (event) => this._onNavigationKey(event));
      this._sourceTextarea.addEventListener("click", () => this._onSelectionChanged());
      this._sourceTextarea.addEventListener("select", () => this._onSelectionChanged());
      this._sourceTextarea.addEventListener("paste", (event) => this._onPaste(event));
      this._sourceTextarea.addEventListener("drop", (event) => this._onDrop(event));
      this._sourceTextarea.addEventListener("compositionstart", () => this._onCompositionStart());
      this._sourceTextarea.addEventListener("compositionend", () => this._onCompositionEnd());
      this._liveEditor.addEventListener("focus", () => {
        if (this._selection.start > this._value.length) this._selection = { start: 0, end: 0, direction: "none" };
      }, true);
      this._liveEditor.addEventListener("keydown", (event) => this._onKeyDown(event));
      this._liveEditor.addEventListener("keyup", (event) => this._onNavigationKey(event));
      this._liveEditor.addEventListener("beforeinput", (event) => this._onLiveBeforeInput(event));
      this._liveEditor.addEventListener("input", (event) => this._onLiveInput(event));
      this._liveEditor.addEventListener("click", (event) => this._onLiveClick(event));
      this._liveEditor.addEventListener("mousedown", (event) => this._onLiveMouseDown(event));
      this._liveEditor.addEventListener("mouseup", () => this._onSelectionChanged());
      this._liveEditor.addEventListener("scroll", () => this._onLiveScroll());
      this._liveEditor.addEventListener("copy", (event) => this._onLiveCopy(event));
      this._liveEditor.addEventListener("cut", (event) => this._onLiveCut(event));
      this._liveEditor.addEventListener("paste", (event) => this._onPaste(event));
      this._liveEditor.addEventListener("drop", (event) => this._onDrop(event));
      this._liveEditor.addEventListener("compositionstart", () => this._onCompositionStart());
      this._liveEditor.addEventListener("compositionend", () => this._onCompositionEnd());
      this._liveEditor.addEventListener("focusout", (event) => {
        const relatedTarget = event.relatedTarget || null;
        queueMicrotask(() => {
          const active = this._shadow?.activeElement || null;
          const focusRemainsInside = [relatedTarget, active].some(
            (target) => target instanceof Node && (target === this._liveEditor || this._liveEditor.contains(target))
          ) || this._liveEditor.matches?.(":focus-within");
          if (!focusRemainsInside) {
            this._flushNativeLiveDom();
          }
        });
      });
      this._preview.addEventListener("click", (event) => this._onPreviewClick(event));
      this._preview.addEventListener("keydown", (event) => this._onPreviewKeyDown(event));
      this._completionPopup.addEventListener("mousedown", (e) => e.preventDefault());
      this._completionPopup.addEventListener("click", (e) => {
        const item = e.target instanceof Element ? e.target.closest("[data-index]") : null;
        if (!item) return;
        const index = Number(item.dataset.index);
        if (this._completion.items[index]?.disabled) return;
        this._completion.activeIndex = index;
        this._acceptCompletion("pointer");
      });
      this._label.addEventListener("click", (event) => {
        event.preventDefault();
        this._focusEditable();
      });
      this._shadow.addEventListener("focusin", () => {
        this._focusWithin = true;
      });
      this._shadow.addEventListener("focusout", () => {
        queueMicrotask(() => {
          this._focusWithin = this._hasComponentFocus();
        });
      });
      this._shadow.addEventListener("selectionchange", () => this._onSelectionChanged?.());
    }
    _syncAttributesToControls() {
      if (!this._sourceTextarea) return;
      if (this._nativeTextareaBridge) {
        const tabIndex2 = this.disabled ? -1 : this._nativeTextareaBridge.tabIndex();
        if (this.tabIndex !== tabIndex2 || !this.hasAttribute("tabindex")) this.tabIndex = tabIndex2;
        this._hostTabIndexBeforeDisable = void 0;
      } else if (this.disabled) {
        if (this._hostTabIndexBeforeDisable === void 0) {
          this._hostTabIndexBeforeDisable = this.getAttribute("tabindex");
        }
        this.tabIndex = -1;
      } else if (this._hostTabIndexBeforeDisable !== void 0) {
        const previousTabIndex = this._hostTabIndexBeforeDisable;
        this._hostTabIndexBeforeDisable = void 0;
        if (previousTabIndex == null) this.removeAttribute("tabindex");
        else this.setAttribute("tabindex", previousTabIndex);
      }
      this._label.textContent = this.label;
      this._label.hidden = !this.label;
      this._sourceTextarea.placeholder = this.placeholder;
      this._sourceTextarea.disabled = this.disabled;
      this._sourceTextarea.readOnly = this.readonly;
      this._sourceTextarea.required = this.required;
      this._sourceTextarea.name = this.name;
      this._liveEditor.setAttribute("aria-readonly", this.readonly ? "true" : "false");
      this._liveEditor.setAttribute("aria-disabled", this.disabled ? "true" : "false");
      this._liveEditor.contentEditable = this._liveSelectionAPI === false ? "false" : this._lineEditable();
      this._syncLiveEditingHosts();
      const tabIndex = this._nativeTextareaBridge?.tabIndex() ?? 0;
      this._sourceTextarea.tabIndex = this.disabled ? -1 : tabIndex;
      this._liveEditor.tabIndex = this.disabled ? -1 : tabIndex;
      this._preview.tabIndex = this.disabled ? -1 : this.mode === "preview" ? tabIndex : -1;
      const maxLength = parseLengthConstraint(this.getAttribute("maxlength"));
      const minLength = parseLengthConstraint(this.getAttribute("minlength"));
      maxLength != null ? this._sourceTextarea.maxLength = maxLength : this._sourceTextarea.removeAttribute("maxlength");
      minLength != null ? this._sourceTextarea.minLength = minLength : this._sourceTextarea.removeAttribute("minlength");
      const rawSpellcheck = this.getAttribute("spellcheck");
      const spellcheck = rawSpellcheck == null || rawSpellcheck === "" || rawSpellcheck === "true";
      this._sourceTextarea.spellcheck = spellcheck;
      this._liveEditor.spellcheck = spellcheck;
      const ariaLabel = this.getAttribute("aria-label");
      const ariaLabelledby = this.getAttribute("aria-labelledby");
      for (const el of [this._sourceTextarea, this._liveEditor]) {
        if (ariaLabel) el.setAttribute("aria-label", ariaLabel);
        else el.removeAttribute("aria-label");
        if (ariaLabelledby) el.setAttribute("aria-labelledby", ariaLabelledby);
        else if (this.label) el.setAttribute("aria-labelledby", this._ids.label);
        else el.removeAttribute("aria-labelledby");
        const dir = this.getAttribute("dir");
        if (dir) el.dir = dir;
        else el.removeAttribute("dir");
      }
      if (ariaLabelledby) {
        this._preview.setAttribute("aria-labelledby", ariaLabelledby);
        this._preview.removeAttribute("aria-label");
      } else {
        this._preview.removeAttribute("aria-labelledby");
        this._preview.setAttribute("aria-label", ariaLabel ? `${ariaLabel} preview` : this.label ? `${this.label} preview` : "Rendered markdown preview");
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
      if (block.kind === "fenced-code") return ids;
      const line = ctx.currentLine?.text ?? "";
      const pos = clamp(ctx.selectionStart - (ctx.currentLine?.start ?? 0), 0, line.length);
      const masked = line.split("");
      const hide = /* @__PURE__ */ __name((from, to) => masked.fill(" ", from, to), "hide");
      for (let i = 0; i < line.length; i += 1) {
        const code = parseCodeSpanAt(line, i);
        if (!code) continue;
        if (pos >= code.contentStart && pos <= code.contentEnd) ids.push("inline.code");
        hide(code.from, code.to);
        i = code.to - 1;
      }
      const references = this._referenceDefinitions();
      const brackets = matchingBrackets(line);
      for (let i = 0; i < line.length; i += 1) {
        if (masked[i] === " " && line[i] !== " ") continue;
        const link = parseInlineLinkAt(line, i, brackets) || parseReferenceLinkAt(line, references, i, brackets);
        if (!link) continue;
        if (link.bang) hide(link.from, link.to);
        else {
          if (pos >= link.labelStart && pos <= link.labelEnd) ids.push("inline.link");
          hide(link.from, link.labelStart);
          hide(link.labelEnd, link.to);
        }
        i = link.to - 1;
      }
      const visible = masked.join("");
      for (const pair of emphasisPairs(visible)) {
        if (pos < pair.openEnd || pos > pair.closeStart) continue;
        ids.push(pair.tag === "strong" ? "inline.bold" : "inline.italic");
      }
      if (usesGfm(ctx.config)) {
        for (const match of visible.matchAll(/~~([^~\n]+)~~/g)) {
          if (isBackslashEscaped(visible, match.index)) continue;
          if (pos >= match.index + 2 && pos <= match.index + (match[0] ?? "").length - 2) ids.push("inline.strikethrough");
        }
      }
      return ids;
    }
    _findText(query, options = {}) {
      const q = String(query ?? "");
      if (!q) return null;
      const from = clamp(Number(options.from ?? this.selectionEnd ?? 0), 0, this._value.length);
      const pattern = literalSearchPattern(q, options.caseSensitive, true);
      pattern.lastIndex = from;
      let match = pattern.exec(this._value);
      if (!match && options.wrap !== false) {
        pattern.lastIndex = 0;
        match = pattern.exec(this._value);
      }
      if (!match) return null;
      const index = match.index;
      const end = index + (match[0] ?? "").length;
      this.setSelectionRange(index, end, "forward");
      this._announce("Match found.");
      return { start: index, end, text: match[0] ?? "" };
    }
    _replaceText(query, replacement, options = {}) {
      const q = String(query ?? "");
      if (!q) return 0;
      const repl = normalizeLineEndings(replacement ?? "");
      const changes = [];
      if (options.all) {
        const pattern = literalSearchPattern(q, options.caseSensitive, true);
        for (const match of this._value.matchAll(pattern)) changes.push({ from: match.index, to: match.index + (match[0] ?? "").length, insert: repl });
      } else {
        const sel = this._getCurrentSelection();
        const selected = this._value.slice(Math.min(sel.start, sel.end), Math.max(sel.start, sel.end));
        const matchSelected = new RegExp(`^(?:${literalSearchPattern(q, options.caseSensitive).source})$`, options.caseSensitive ? "u" : "iu").test(selected);
        const found = matchSelected ? { start: Math.min(sel.start, sel.end), end: Math.max(sel.start, sel.end) } : this._findText(q, options);
        if (found) changes.push({ from: found.start, to: found.end, insert: repl });
      }
      if (!changes.length) return 0;
      const first = requireItem(changes, 0).from + repl.length;
      this._applyTransaction({ changes, selectionAfter: { start: first, end: first, direction: "none" }, actionId: options.all ? "editor.replaceAll" : "editor.replace", undoGroup: "replace", source: "api" }, { source: "api" });
      return changes.length;
    }
    _parseOptions() {
      return { markdownFlavor: this.markdownFlavor };
    }
    _referenceDefinitions() {
      if (this._referenceCacheValue === this._value && this._referenceCache) return this._referenceCache;
      this._referenceCacheValue = this._value;
      this._referenceCache = extractReferenceDefinitions(this._value).references;
      return this._referenceCache;
    }
    _rendererOptions() {
      return {
        ...this._parseOptions(),
        tagsEnabled: this.tagsEnabled,
        allowRawHtml: false,
        sanitize: true,
        linkTarget: DEFAULTS.linkTarget,
        references: this._referenceDefinitions()
      };
    }
    _setValueInternal(next, opts = {}) {
      const previousOrigin = this._activeOrigin;
      this._activeOrigin = { kind: "api" };
      const previousValue = this._value;
      const value = normalizeLineEndings(next ?? "");
      const before = this._snapshot();
      const changed = value !== previousValue;
      if (changed) this._pendingFenceOpening = null;
      this._value = value;
      if (this._sourceTextarea && this._sourceTextarea.value !== value) this._sourceTextarea.value = value;
      if (!opts.preserveSelection) this._selection = { start: clamp(this._selection.start, 0, value.length), end: clamp(this._selection.end, 0, value.length), direction: "none" };
      if (opts.recordUndo && changed) this._recordUndo(before, this._snapshot(), opts.undoGroup || opts.source || "api", { coalesce: false });
      if (changed || opts.force || !this._hasRenderedOnce) this._afterValueChanged({ source: opts.source || "api", silent: opts.silent, restoreSelection: opts.preserveSelection !== false && (this._isSourceActive() || this.matches(":focus-within")), previousValue, changes: changed ? opts.changes && applyTextChanges(previousValue, opts.changes) === value ? opts.changes : diffTextChanges(previousValue, value) : [] });
      this._activeOrigin = previousOrigin;
    }
    _lastChangeBeforeRevision = 0;
    _activeOrigin = null;
    _afterValueChanged({ source = "api", inputType = null, silent = false, restoreSelection = true, previousValue = null, changes = null, preserveLiveDom = false } = {}) {
      const revision = this.revision;
      const origin = this._activeOrigin ?? { kind: source === "user" ? "user" : source === "paste" ? "paste" : "api" };
      const beforeRevision = previousValue !== this._value ? Math.max(0, revision - 1) : revision;
      this._lastChangeBeforeRevision = beforeRevision;
      if (previousValue !== this._value) this._nativeTextareaBridge?.valueChanged(source);
      const restore = this._pendingPresenceRestore;
      this._pendingPresenceRestore = null;
      if (previousValue !== null && previousValue !== this._value) {
        this._presenceController?.mapChanges(changes ?? diffTextChanges(previousValue, this._value));
        this._presenceMappedValue = this._value;
        if (restore) this._presenceController?.restoreAnchors(restore);
        const after = this._pendingPresenceAfter;
        this._pendingPresenceAfter = null;
        if (after?.value === this._value) this._rememberPresenceSnapshot(after, true);
      }
      this._dispatch("md-value-sync", { value: this._value, defaultValue: this._defaultValue, revision });
      if (this.revision !== revision) return;
      this._selectAllLevel = 0;
      this._structuredSelection = null;
      const tagChange = this._refreshTagIndex();
      if (["user", "keyboard", "paste", "pointer"].includes(source)) this._validationVisible = true;
      this._updateFormValue();
      this._updateValidity();
      if (preserveLiveDom && this._isLiveVisible() && !this._isComposing) {
        this._adoptNativeLiveDom({ previousValue, changes });
        if (restoreSelection && this._isAppleWebKitRuntime() && !this._isIOSWebKitRuntime()) {
          this._restoreLiveSelection(this._selection);
        }
      } else {
        this._renderAll({ restoreSelection, previousValue, changes });
      }
      if (this.revision !== revision) return;
      const oldDirty = this._dirty;
      this._dirty = this._value !== this._defaultValue;
      if (oldDirty !== this._dirty) this._dispatch("md-dirty-change", { dirty: this._dirty });
      if (this.revision !== revision) return;
      if (!silent) {
        this._dispatch("md-input", { value: this._value, source, inputType, origin, beforeRevision, revision });
        if (this.revision !== revision) return;
        if (tagChange) this._dispatch("md-tags-change", { ...tagChange, source, inputType });
      }
    }
    _refreshTagIndex() {
      const previous = this._tagIndex;
      const current = this.tagsEnabled ? parseTags(this._value, this._parseOptions()) : [];
      this._tagIndex = current;
      if (JSON.stringify(previous) === JSON.stringify(current)) return null;
      const oldKeys = new Map(previous.map((tag) => [tag.key, tag.value]));
      const newKeys = new Map(current.map((tag) => [tag.key, tag.value]));
      return {
        current: cloneTags(current),
        added: current.filter((tag) => !oldKeys.has(tag.key)).map((tag) => tag.value),
        removed: previous.filter((tag) => !newKeys.has(tag.key)).map((tag) => tag.value)
      };
    }
    _renderAll(...args) {
      const result = this._liveRenderer._renderAll(...args);
      this._presenceController?.refresh(false);
      return result;
    }
    _isLiveVisible(...args) {
      return this._liveRenderer._isLiveVisible(...args);
    }
    _isPreviewVisible(...args) {
      return this._liveRenderer._isPreviewVisible(...args);
    }
    _renderDebounceMs(...args) {
      return this._liveRenderer._renderDebounceMs(...args);
    }
    _schedulePreviewRender(...args) {
      return this._liveRenderer._schedulePreviewRender(...args);
    }
    _renderPreview(...args) {
      return this._liveRenderer._renderPreview(...args);
    }
    _getBlocks(...args) {
      return this._liveRenderer._getBlocks(...args);
    }
    _setBlockCache(...args) {
      return this._liveRenderer._setBlockCache(...args);
    }
    _blocksForRender(...args) {
      return this._liveRenderer._blocksForRender(...args);
    }
    _renderLive(...args) {
      return this._liveRenderer._renderLive(...args);
    }
    _adoptNativeLiveDom(...args) {
      return this._liveRenderer._adoptNativeLiveDom(...args);
    }
    _flushNativeLiveDom(...args) {
      return this._liveRenderer._flushNativeLiveDom(...args);
    }
    _renderLiveFull(...args) {
      return this._liveRenderer._renderLiveFull(...args);
    }
    _tryPatchLiveBlocks(...args) {
      return this._liveRenderer._tryPatchLiveBlocks(...args);
    }
    _expandedBlockRange(...args) {
      return this._liveRenderer._expandedBlockRange(...args);
    }
    _blockRangeForSourceRange(...args) {
      return this._liveRenderer._blockRangeForSourceRange(...args);
    }
    _liveFragmentForBlocks(...args) {
      return this._liveRenderer._liveFragmentForBlocks(...args);
    }
    _syncLiveMetadata(...args) {
      return this._liveRenderer._syncLiveMetadata(...args);
    }
    _setEditableMetadata(...args) {
      return this._liveRenderer._setEditableMetadata(...args);
    }
    _setLiveEditingHostState(...args) {
      return this._liveRenderer._setLiveEditingHostState(...args);
    }
    _syncLiveEditingHosts(...args) {
      return this._liveRenderer._syncLiveEditingHosts(...args);
    }
    _liveDescendantEditableAttribute(...args) {
      return this._liveRenderer._liveDescendantEditableAttribute(...args);
    }
    _syncLiveBlockNodeMetadata(...args) {
      return this._liveRenderer._syncLiveBlockNodeMetadata(...args);
    }
    _lineAt(...args) {
      return this._liveRenderer._lineAt(...args);
    }
    _previousLineText(...args) {
      return this._liveRenderer._previousLineText(...args);
    }
    _nextLineText(...args) {
      return this._liveRenderer._nextLineText(...args);
    }
    _lineHasStructuralNeighbors(...args) {
      return this._liveRenderer._lineHasStructuralNeighbors(...args);
    }
    _parseSingleLineBlock(...args) {
      return this._liveRenderer._parseSingleLineBlock(...args);
    }
    _tryIncrementalBlocks(...args) {
      return this._liveRenderer._tryIncrementalBlocks(...args);
    }
    _shiftCell(...args) {
      return this._liveRenderer._shiftCell(...args);
    }
    _shiftLineOffsets(...args) {
      return this._liveRenderer._shiftLineOffsets(...args);
    }
    _shiftBlockOffsets(...args) {
      return this._liveRenderer._shiftBlockOffsets(...args);
    }
    _shouldVirtualize(...args) {
      return this._liveRenderer._shouldVirtualize(...args);
    }
    _virtualLineHeight(...args) {
      return this._liveRenderer._virtualLineHeight(...args);
    }
    _virtualWindowSize(...args) {
      return this._liveRenderer._virtualWindowSize(...args);
    }
    _estimatedBlockHeight(...args) {
      return this._liveRenderer._estimatedBlockHeight(...args);
    }
    _virtualMetrics(...args) {
      return this._liveRenderer._virtualMetrics(...args);
    }
    _virtualBlockIndexAtPixel(...args) {
      return this._liveRenderer._virtualBlockIndexAtPixel(...args);
    }
    _blockIndexForOffset(...args) {
      return this._liveRenderer._blockIndexForOffset(...args);
    }
    _renderLiveVirtual(...args) {
      return this._liveRenderer._renderLiveVirtual(...args);
    }
    _isSourceOffsetRendered(...args) {
      return this._liveRenderer._isSourceOffsetRendered(...args);
    }
    _ensureVirtualSelectionVisible(...args) {
      return this._liveRenderer._ensureVirtualSelectionVisible(...args);
    }
    _onLiveScroll(...args) {
      return this._liveRenderer._onLiveScroll(...args);
    }
    _renderLiveBlock(...args) {
      return this._liveRenderer._renderLiveBlock(...args);
    }
    _lineEditable(...args) {
      return this._liveRenderer._lineEditable(...args);
    }
    _renderHeadingLine(...args) {
      return this._liveRenderer._renderHeadingLine(...args);
    }
    _renderTaskLine(...args) {
      return this._liveRenderer._renderTaskLine(...args);
    }
    _renderCodeFence(...args) {
      return this._liveRenderer._renderCodeFence(...args);
    }
    _renderTable(...args) {
      return this._liveRenderer._renderTable(...args);
    }
    _onSourceBeforeInput(...args) {
      return this._inputController._onSourceBeforeInput(...args);
    }
    _onSourceInput(...args) {
      return this._inputController._onSourceInput(...args);
    }
    _onCompositionStart(...args) {
      return this._inputController._onCompositionStart(...args);
    }
    _onCompositionEnd(...args) {
      return this._inputController._onCompositionEnd(...args);
    }
    _onLiveBeforeInput(...args) {
      return this._inputController._onLiveBeforeInput(...args);
    }
    _applyLiveMarkdownInsertBeforeInput(...args) {
      return this._inputController._applyLiveMarkdownInsertBeforeInput(...args);
    }
    _liveMarkdownInsertCandidate(...args) {
      return this._inputController._liveMarkdownInsertCandidate(...args);
    }
    _shouldPreserveNativeFenceInsert(...args) {
      return this._inputController._shouldPreserveNativeFenceInsert(...args);
    }
    _applyLiveMarkdownInsertAfterInput(...args) {
      return this._inputController._applyLiveMarkdownInsertAfterInput(...args);
    }
    _isPendingFenceOpening(...args) {
      return this._inputController._isPendingFenceOpening(...args);
    }
    _shouldUseAppleWebKitNativeDeletion(...args) {
      return this._inputController._shouldUseAppleWebKitNativeDeletion(...args);
    }
    _applyLiveDeletionBeforeInput(...args) {
      return this._inputController._applyLiveDeletionBeforeInput(...args);
    }
    _onLiveInput(...args) {
      return this._inputController._onLiveInput(...args);
    }
    _commitWebKitNativeInput(...args) {
      return this._inputController._commitWebKitNativeInput(...args);
    }
    _sourceSelectionFromBeforeInput(...args) {
      return this._inputController._sourceSelectionFromBeforeInput(...args);
    }
    _inputTargetFromBeforeInput(...args) {
      return this._inputController._inputTargetFromBeforeInput(...args);
    }
    _applyFallbackBeforeInput(...args) {
      return this._inputController._applyFallbackBeforeInput(...args);
    }
    _applySourceBackedInput(...args) {
      return this._inputController._applySourceBackedInput(...args);
    }
    _plainText(...args) {
      return this._selectionController._plainText(...args);
    }
    _debugEditableInfo(editable) {
      if (!editable) return null;
      return {
        editable: editable.dataset.editable || null,
        kind: editable.dataset.kind || null,
        from: Number(editable.dataset.from),
        to: Number(editable.dataset.to)
      };
    }
    _debugTextChanges(changes = []) {
      return changes.map((change) => ({
        from: change.from,
        to: change.to,
        removedLength: Math.max(0, change.to - change.from),
        insertedLength: String(change.insert ?? "").length
      }));
    }
    _editableSourceRange(...args) {
      return this._selectionController._editableSourceRange(...args);
    }
    _cellRawSource(...args) {
      return this._selectionController._cellRawSource(...args);
    }
    _displayOffsetFromSourceOffset(...args) {
      return this._selectionController._displayOffsetFromSourceOffset(...args);
    }
    _sourceOffsetFromDisplayOffset(...args) {
      return this._selectionController._sourceOffsetFromDisplayOffset(...args);
    }
    _closestEditable(...args) {
      return this._selectionController._closestEditable(...args);
    }
    _fragmentIdForLink(link) {
      const href = link?.getAttribute?.("href")?.trim() ?? "";
      if (!href.startsWith("#") || href.length === 1) return "";
      try {
        return decodeURIComponent(href.slice(1));
      } catch {
        return href.slice(1);
      }
    }
    _headingElementForId(surface, id) {
      return [...surface?.querySelectorAll(".md-heading[id], h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]") || []].find((heading) => heading.id === id) || null;
    }
    _navigateFragmentLink(event, surface) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const id = this._fragmentIdForLink(link);
      if (!link || !surface?.contains(link) || !id) return false;
      let target = this._headingElementForId(surface, id);
      let label = target?.textContent?.trim() || "";
      if (surface === this._liveEditor) {
        const block = this._getBlocks().find((candidate) => candidate.type === "heading" && candidate.heading?.id === id);
        if (block?.type !== "heading") return false;
        label = block.heading.content;
        event.preventDefault();
        this.setSelectionRange(block.from, block.from, "none");
        target = this._headingElementForId(surface, id);
      } else {
        if (!target) return false;
        event.preventDefault();
      }
      target?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      this._announce(`Navigated to ${label || id}.`);
      return true;
    }
    _onPreviewClick(event) {
      if (this._activateTag(event, "preview")) return;
      this._navigateFragmentLink(event, this._preview);
    }
    _onPreviewKeyDown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (this._activateTag(event, "preview")) event.preventDefault();
    }
    _activateTag(event, surface) {
      if (!this.tagsEnabled) return false;
      const target = event.target instanceof Element ? event.target.closest("[data-md-tag]") : null;
      if (!target) return false;
      const tag = target.dataset.mdTag || "";
      if (!tag) return false;
      this._dispatch("md-tag-activate", {
        tag,
        key: target.dataset.tagKey || normalizeTagKey(tag),
        surface
      });
      return true;
    }
    _onLiveClick(event) {
      if (this._suppressLiveClick) {
        this._suppressLiveClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (this._navigateFragmentLink(event, this._liveEditor)) return;
      this._activateTag(event, "live");
      this._structuredSelection = null;
      const checkbox = event.target instanceof Element ? event.target.closest("[data-task-checkbox]") : null;
      if (checkbox) {
        event.preventDefault();
        const offset = Number(checkbox.dataset.checkOffset);
        const current = this._value[offset] || " ";
        const next = current.toLowerCase() === "x" ? " " : "x";
        const source = event.detail === 0 ? "keyboard" : "pointer";
        const ctx = this._getContext();
        const result = ok(
          tx(
            ctx,
            "block.taskDone",
            [{ from: offset, to: offset + 1, insert: next }],
            this._selection,
            "block"
          ),
          next === "x" ? "Task checked." : "Task unchecked."
        );
        this._applyActionResult("block.taskDone", result, { source });
        if (source === "keyboard") this._liveEditor.querySelector(`[data-task-checkbox][data-check-offset="${offset}"]`)?.focus();
        return;
      }
      this._onSelectionChanged();
    }
    _onLiveMouseDown(...args) {
      return this._selectionController._onLiveMouseDown(...args);
    }
    _bindPointerSelectionListeners(...args) {
      return this._selectionController._bindPointerSelectionListeners(...args);
    }
    _onLiveMouseMove(...args) {
      return this._selectionController._onLiveMouseMove(...args);
    }
    _onLiveMouseEnd(...args) {
      return this._selectionController._onLiveMouseEnd(...args);
    }
    _setLivePointerSelection(...args) {
      return this._selectionController._setLivePointerSelection(...args);
    }
    _setFallbackPointerSelection(...args) {
      return this._selectionController._setFallbackPointerSelection(...args);
    }
    _onNavigationKey(...args) {
      return this._selectionController._onNavigationKey(...args);
    }
    _maybeHandleLineBoundaryKey(...args) {
      return this._selectionController._maybeHandleLineBoundaryKey(...args);
    }
    _maybeHandleLiveArrowKey(...args) {
      return this._selectionController._maybeHandleLiveArrowKey(...args);
    }
    _maybeExtendLiveArrowSelection(...args) {
      return this._selectionController._maybeExtendLiveArrowSelection(...args);
    }
    _setSourceBackedSelection(...args) {
      return this._selectionController._setSourceBackedSelection(...args);
    }
    _horizontalArrowTarget(...args) {
      return this._selectionController._horizontalArrowTarget(...args);
    }
    _fallbackHorizontalArrowTarget(...args) {
      return this._selectionController._fallbackHorizontalArrowTarget(...args);
    }
    _fallbackVerticalArrowTarget(...args) {
      return this._selectionController._fallbackVerticalArrowTarget(...args);
    }
    _verticalArrowTarget(...args) {
      return this._selectionController._verticalArrowTarget(...args);
    }
    _isSingleVisualRow(...args) {
      return this._selectionController._isSingleVisualRow(...args);
    }
    _rebuildLiveIndex(...args) {
      return this._selectionController._rebuildLiveIndex(...args);
    }
    _liveEditables(...args) {
      return this._selectionController._liveEditables(...args);
    }
    _liveNavigationEditables(...args) {
      return this._selectionController._liveNavigationEditables(...args);
    }
    _adjacentLiveEditable(...args) {
      return this._selectionController._adjacentLiveEditable(...args);
    }
    _computedLineHeight(...args) {
      return this._selectionController._computedLineHeight(...args);
    }
    _isCaretOnVisualBoundary(...args) {
      return this._selectionController._isCaretOnVisualBoundary(...args);
    }
    _caretRectForSourceOffset(...args) {
      return this._selectionController._caretRectForSourceOffset(...args);
    }
    _caretRectFromDomPosition(...args) {
      return this._selectionController._caretRectFromDomPosition(...args);
    }
    _sourceOffsetInEditableAtX(...args) {
      return this._selectionController._sourceOffsetInEditableAtX(...args);
    }
    _sourceOffsetFromPoint(...args) {
      return this._selectionController._sourceOffsetFromPoint(...args);
    }
    _liveEditableFromPoint(...args) {
      return this._selectionController._liveEditableFromPoint(...args);
    }
    _sourceOffsetForClientPoint(...args) {
      return this._selectionController._sourceOffsetForClientPoint(...args);
    }
    _nearestSourceOffsetInEditable(...args) {
      return this._selectionController._nearestSourceOffsetInEditable(...args);
    }
    _onSelectionChanged(...args) {
      return this._selectionController._onSelectionChanged(...args);
    }
    _isSourceActive(...args) {
      return this._selectionController._isSourceActive(...args);
    }
    _focusEditable(...args) {
      return this._selectionController._focusEditable(...args);
    }
    _getCurrentSelection(...args) {
      return this._selectionController._getCurrentSelection(...args);
    }
    _getLiveSelection(...args) {
      return this._selectionController._getLiveSelection(...args);
    }
    _readLiveSelection(...args) {
      return this._selectionController._readLiveSelection(...args);
    }
    _liveSelectionCandidates() {
      return readSelectionCandidates(this._shadow);
    }
    _isLiveSelectionNode(...args) {
      return this._selectionController._isLiveSelectionNode(...args);
    }
    _liveComposedSelectionRange(...args) {
      return this._selectionController._liveComposedSelectionRange(...args);
    }
    _liveSelectionEndpoints(...args) {
      return this._selectionController._liveSelectionEndpoints(...args);
    }
    _exposedLiveSelection(...args) {
      return this._selectionController._exposedLiveSelection(...args);
    }
    _hasComponentFocus() {
      const shadowActive = this._shadow?.activeElement || null;
      return Boolean(shadowActive);
    }
    _isIOSWebKitRuntime(...args) {
      return isIOSWebKitRuntime(...args);
    }
    _isAppleWebKitRuntime(...args) {
      return isAppleWebKitRuntime(...args);
    }
    _displayOffsetFromSelection(...args) {
      return this._selectionController._displayOffsetFromSelection(...args);
    }
    _sourceOffsetFromDom(...args) {
      return this._selectionController._sourceOffsetFromDom(...args);
    }
    _restoreLiveSelection(...args) {
      return this._selectionController._restoreLiveSelection(...args);
    }
    _useFallbackLiveSelection(...args) {
      return this._selectionController._useFallbackLiveSelection(...args);
    }
    _isLiveDomPositionConnected(...args) {
      return this._selectionController._isLiveDomPositionConnected(...args);
    }
    _domPositionFromSource(...args) {
      return this._selectionController._domPositionFromSource(...args);
    }
    _textPositionInElement(...args) {
      return this._selectionController._textPositionInElement(...args);
    }
    _ensureEmptyLiveEditable(...args) {
      return this._selectionController._ensureEmptyLiveEditable(...args);
    }
    _snapshot() {
      const sel = this._getCurrentSelection();
      this._selection = sel;
      const snapshot = makeSnapshot(this._value, sel.start, sel.end, sel.direction || "none");
      this._rememberPresenceSnapshot(snapshot);
      return snapshot;
    }
    _rememberPresenceSnapshot(snapshot, overwrite = false) {
      if (!this._presenceController || !overwrite && this._presenceSnapshots.has(snapshot)) return;
      let anchors = this._presenceController.captureAnchors();
      if (this._presenceMappedValue !== snapshot.value) {
        const changes = diffTextChanges(this._presenceMappedValue, snapshot.value);
        anchors = anchors.map((anchor) => {
          const backward = anchor.anchor > anchor.head;
          const selection = mapTransactionSelection({ start: Math.min(anchor.anchor, anchor.head), end: Math.max(anchor.anchor, anchor.head) }, changes);
          const start = clamp(selection.start, 0, snapshot.value.length);
          const end = clamp(selection.end, 0, snapshot.value.length);
          return { ...anchor, anchor: backward ? end : start, head: backward ? start : end };
        });
      }
      this._presenceSnapshots.set(snapshot, anchors);
    }
    _recordUndo(...args) {
      const [before, after] = args;
      this._rememberPresenceSnapshot(before, this._presenceMappedValue === before.value);
      this._rememberPresenceSnapshot(after, true);
      if (this._presenceController && this._presenceMappedValue !== after.value) this._pendingPresenceAfter = after;
      this._history.record(...args);
    }
    _undoGroupForInput(inputType) {
      if (inputType?.startsWith("insert")) return "typing";
      if (inputType?.startsWith("delete")) return "delete";
      return inputType || "input";
    }
    _undo({ source = "keyboard", inputType = null } = {}) {
      const current = this._snapshot();
      const beforeRevision = this.revision;
      const entry = this._undoStack.at(-1);
      const changes = entry?.changes && entry.after.value === current.value ? invertTextChanges(entry.before.value, entry.changes) : void 0;
      const target = this._history.undo(current);
      if (!target) return false;
      this._restoreSnapshot(target, "undo", inputType, changes);
      if (this.revision === beforeRevision + 1) this._dispatch("md-action", { actionId: "history.undo", source, before: current, after: this._snapshot(), beforeRevision, revision: this.revision, origin: { kind: "action", id: "history.undo" } });
      return true;
    }
    _redo({ source = "keyboard", inputType = null } = {}) {
      const current = this._snapshot();
      const beforeRevision = this.revision;
      const entry = this._redoStack.at(-1);
      const changes = entry?.changes && entry.before.value === current.value ? entry.changes : void 0;
      const target = this._history.redo(current);
      if (!target) return false;
      this._restoreSnapshot(target, "redo", inputType, changes);
      if (this.revision === beforeRevision + 1) this._dispatch("md-action", { actionId: "history.redo", source, before: current, after: this._snapshot(), beforeRevision, revision: this.revision, origin: { kind: "action", id: "history.redo" } });
      return true;
    }
    _restoreSnapshot(snapshot, source, inputType = null, changes) {
      const previousOrigin = this._activeOrigin;
      this._activeOrigin = { kind: "action", id: `history.${source}` };
      const previousValue = this._value;
      this._value = snapshot.value;
      this._selection = { ...snapshot.selection };
      this._redoStack = this._redoStack;
      this._pendingPresenceRestore = this._presenceSnapshots.get(snapshot) ?? null;
      this._afterValueChanged({ source, inputType, restoreSelection: true, previousValue, changes: changes ?? diffTextChanges(previousValue, this._value) });
      this._activeOrigin = previousOrigin;
    }
    _onKeyDown(event) {
      if (this._isComposing || event?.isComposing || event?.keyCode === 229) return;
      const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
      const mod = isMac ? event.metaKey : event.ctrlKey;
      const taskCheckbox = event.target instanceof Element ? event.target.closest("[data-task-checkbox]") : null;
      if (!this._isSourceActive() && taskCheckbox && (event.key === " " || event.key === "Spacebar")) {
        event.preventDefault();
        taskCheckbox.click();
        return;
      }
      const activeEditable = this._activeEditableFromEvent(event);
      const activeCell = activeEditable?.dataset.editable === "cell" ? activeEditable : null;
      const opaqueDesktopSafari = !this._isSourceActive() && this._isAppleWebKitRuntime() && !this._isIOSWebKitRuntime() && !this._readLiveSelection();
      if (!this._isSourceActive() && NAVIGATION_KEYS.has(event.key)) this._ignoreSelectionChangeCount = 0;
      if (!this._isSourceActive() && this._value.length === 0 && (event.key === "Backspace" || event.key === "Delete")) {
        event.preventDefault();
        this._ensureEmptyLiveEditable();
        return;
      }
      if (mod && !event.altKey && event.key.toLowerCase() === "z") {
        if (this.readonly || this.disabled) return;
        if (opaqueDesktopSafari) {
          this._debug(1, "live.key.browser-owned", {
            key: event.key,
            reason: "opaque-desktop-safari-selection"
          });
          return;
        }
        event.preventDefault();
        event.shiftKey ? this._redo() : this._undo();
        return;
      }
      if (mod && !event.altKey && event.key.toLowerCase() === "a" && !this._isSourceActive()) {
        if (opaqueDesktopSafari) {
          this._debug(1, "live.key.browser-owned", {
            key: event.key,
            reason: "opaque-desktop-safari-selection"
          });
          return;
        }
        event.preventDefault();
        this._expandSelection();
        return;
      }
      if (this._completion.open) {
        const map = { ArrowDown: "completion.next", ArrowUp: "completion.previous", Home: "completion.first", End: "completion.last", Escape: "completion.close" };
        if (map[event.key]) {
          event.preventDefault();
          this._runAction(map[event.key] || "", void 0, { source: "keyboard", apply: true });
          return;
        }
        if (event.key === "PageDown") {
          event.preventDefault();
          this._moveCompletion(5);
          return;
        }
        if (event.key === "PageUp") {
          event.preventDefault();
          this._moveCompletion(-5);
          return;
        }
        if (event.key === "Enter" && (!event.shiftKey || this.shiftEnterBehavior === "soft-break") || event.key === "Tab" && !event.shiftKey) {
          event.preventDefault();
          this._runAction("completion.accept", void 0, { source: "keyboard", apply: true });
          return;
        }
      }
      if (opaqueDesktopSafari && (NAVIGATION_KEYS.has(event.key) || ["Enter", "Backspace", "Delete", " ", "Spacebar", "Tab"].includes(event.key) || mod && !event.altKey && ["b", "e", "i", "k"].includes(event.key.toLowerCase()) || mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === "x" || mod && event.altKey && /^[1-6]$/.test(event.key))) {
        this._debug(1, "live.key.browser-owned", {
          key: event.key,
          reason: "opaque-desktop-safari-selection"
        });
        return;
      }
      if (this._maybeHandleTableLineBoundaryKey(event, activeCell)) return;
      if (this._maybeHandleLineBoundaryKey(event, activeCell, activeEditable)) return;
      if (activeCell && this._maybeHandleTableArrowKey(event, activeCell)) return;
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
        if (map[key]) {
          event.preventDefault();
          this._runAction(map[key], void 0, { source: "keyboard", apply: true });
          return;
        }
      }
      if (mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === "x") {
        event.preventDefault();
        this._runAction("inline.strikethrough", void 0, { source: "keyboard", apply: true });
        return;
      }
      if (mod && event.altKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        this._runAction(`block.heading.${event.key}`, void 0, { source: "keyboard", apply: true });
        return;
      }
      if (event.key === " " && !event.shiftKey && !event.altKey && !mod) {
        if (this.readonly || this.disabled) return;
        const result = this._runAction("editor.markdownShortcut", void 0, { source: "keyboard", apply: false });
        if (result?.ok && result.transaction) {
          event.preventDefault();
          this._applyActionResult("editor.markdownShortcut", result, { source: "keyboard" });
          return;
        }
      }
      if (event.key === "Delete") {
        if (this.readonly || this.disabled) return;
        const result = this._runAction("editor.smartDelete", void 0, { source: "keyboard", apply: false });
        if (result?.ok && result.transaction) {
          event.preventDefault();
          this._applyActionResult("editor.smartDelete", result, { source: "keyboard" });
          return;
        }
      }
      if (event.key === "Enter") {
        if (this.readonly || this.disabled) return;
        if (!this._isSourceActive() && this._isIOSWebKitRuntime()) return;
        event.preventDefault();
        if (activeCell) {
          if (event.shiftKey && this.shiftEnterBehavior === "soft-break" || mod || event.altKey) this._exitTable(activeCell, "after");
          else this._insertTableRowAfterCell(activeCell);
          return;
        }
        const activeEditableType = activeEditable?.dataset.editable;
        if (activeEditableType === "virtual-code-after" || activeEditableType === "virtual-table-after") {
          this._runAction("editor.insertParagraph", void 0, { source: "keyboard", apply: true });
          return;
        }
        const actionId = event.shiftKey && this.shiftEnterBehavior === "soft-break" ? "editor.insertSoftBreak" : "editor.smartEnter";
        this._runAction(actionId, void 0, { source: "keyboard", apply: true });
        return;
      }
      if (event.key === "Tab") {
        if (this.readonly || this.disabled) return;
        if (activeCell) {
          event.preventDefault();
          this._handleTableTab(activeCell, event.shiftKey ? -1 : 1);
          return;
        }
        const id = event.shiftKey ? "editor.smartOutdent" : "editor.smartTab";
        const result = this._runAction(id, void 0, { source: "keyboard", apply: false });
        if (result?.ok && (result.transaction || result.preventDefault)) {
          event.preventDefault();
          this._applyActionResult(id, result, { source: "keyboard" });
        }
        return;
      }
      if (event.key === "Backspace") {
        if (this.readonly || this.disabled) return;
        const result = this._runAction("editor.smartBackspace", void 0, { source: "keyboard", apply: false });
        if (result?.ok && result.transaction) {
          event.preventDefault();
          this._applyActionResult("editor.smartBackspace", result, { source: "keyboard" });
        }
      }
    }
    _activeEditableFromEvent(event) {
      return this._closestEditable(event?.target) || this._activeEditableFromSelection();
    }
    _activeEditableFromSelection(...args) {
      return this._selectionController._activeEditableFromSelection(...args);
    }
    _findBlockAtOffset(offset, type = null) {
      const safe = clamp(Number(offset) || 0, 0, this._value.length);
      return this._getBlocks().find((block) => (!type || block.type === type) && safe >= block.from && safe <= Math.max(block.to, block.from)) || null;
    }
    _findTableBlockForCell(cell) {
      const tableEl = cell?.closest(".md-table-block");
      if (!tableEl) return null;
      const from = Number(tableEl.dataset.from);
      const to = Number(tableEl.dataset.to);
      return this._getBlocks().find((block) => block.type === "table" && block.from === from && block.to === to) || null;
    }
    _tableInfoForCell(cell) {
      const block = this._findTableBlockForCell(cell);
      if (!block) return null;
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const line = row < 0 ? block.header : block.rows[row];
      const cols = Math.max(block.header.cells.length, ...block.rows.map((r) => r.cells.length), 1);
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
      if (info.row >= 0 && Boolean(info.line && this._isTableRowEmpty(info.line))) this._exitTable(cell, "after");
      else this._insertTableRowAfterCell(cell);
    }
    _maybeHandleTableLineBoundaryKey(event, activeCell = null) {
      if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return false;
      if (event.key !== "Home" && event.key !== "End") return false;
      const selectedEditable = activeCell || this._activeEditableFromSelection();
      const cell = selectedEditable?.dataset?.editable === "cell" ? selectedEditable : null;
      if (!cell) return false;
      const range = this._editableSourceRange(cell);
      if (!range) return false;
      const selection = this._getLiveSelection() || this._getCurrentSelection();
      const focus = selection.direction === "backward" ? selection.start : selection.end;
      const anchor = selection.direction === "backward" ? selection.end : selection.start;
      const target = event.key === "Home" ? range.from : range.to;
      if (target === focus && !event.shiftKey) {
        event.preventDefault();
        return true;
      }
      event.preventDefault();
      if (event.shiftKey) this._setSourceBackedSelection(anchor, target);
      else this.setSelectionRange(target, target, "none");
      return true;
    }
    _maybeHandleTableArrowKey(event, cell) {
      if (this._isSourceActive() || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return false;
      if (!LIVE_ARROW_KEYS.has(event.key)) return false;
      const selection = this._getLiveSelection() || this._getCurrentSelection();
      if (!selection) return false;
      if (selection.start !== selection.end && !event.shiftKey) {
        const target2 = event.key === "ArrowLeft" || event.key === "ArrowUp" ? selection.start : selection.end;
        event.preventDefault();
        this.setSelectionRange(target2, target2, "none");
        return true;
      }
      const focus = selection.direction === "backward" ? selection.start : selection.end;
      const anchor = selection.direction === "backward" ? selection.end : selection.start;
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const target = event.key === "ArrowLeft" || event.key === "ArrowRight" ? this._horizontalTableArrowTarget(cell, focus, direction) : this._verticalTableArrowTarget(cell, focus, direction);
      if (!target) return false;
      event.preventDefault();
      if (target.exit) {
        if (event.shiftKey) this._setSourceBackedSelection(anchor, target.offset);
        else this._exitTable(cell, target.exit);
        return true;
      }
      if (event.shiftKey) this._setSourceBackedSelection(anchor, target.offset);
      else this.setSelectionRange(target.offset, target.offset, "none");
      return true;
    }
    _tableCellsForCell(cell) {
      return [...cell.closest(".md-table-block")?.querySelectorAll('[data-editable="cell"]') || []];
    }
    _tableCellElement(block, row, col) {
      return this._liveEditor?.querySelector(`.md-table-block[data-from="${block.from}"][data-to="${block.to}"] .md-cell[data-row="${row}"][data-col="${col}"]`) || null;
    }
    _horizontalTableArrowTarget(cell, offset, direction) {
      const range = this._editableSourceRange(cell);
      if (!range) return null;
      if (direction < 0 && offset <= range.from) {
        const cells = this._tableCellsForCell(cell);
        const previous = cells[cells.indexOf(cell) - 1];
        if (previous) return { offset: Number(previous.dataset.to) };
        const info = this._tableInfoForCell(cell);
        return info?.block ? { exit: "before", offset: info.block.from } : null;
      }
      if (direction > 0 && offset >= range.to) {
        const cells = this._tableCellsForCell(cell);
        const next = cells[cells.indexOf(cell) + 1];
        if (next) return { offset: Number(next.dataset.from) };
        const info = this._tableInfoForCell(cell);
        return info?.block ? { exit: "after", offset: info.block.to } : null;
      }
      return null;
    }
    _verticalTableArrowTarget(cell, offset, direction) {
      const info = this._tableInfoForCell(cell);
      if (!info) return null;
      const nextRow = info.row + direction;
      if (nextRow < -1) return { exit: "before", offset: info.block.from };
      if (nextRow >= info.block.rows.length) return { exit: "after", offset: info.block.to };
      const targetCell = this._tableCellElement(info.block, nextRow, info.col);
      if (!targetCell) return null;
      const displayOffset = this._displayOffsetFromSourceOffset(cell, offset);
      const targetDisplayOffset = Math.min(displayOffset, this._plainText(targetCell).length);
      return { offset: this._sourceOffsetFromDisplayOffset(targetCell, targetDisplayOffset) ?? Number(targetCell.dataset.from) };
    }
    _maybeExitTableWithArrow(cell, direction) {
      const info = this._tableInfoForCell(cell);
      if (!info) return false;
      const atStart = this._isCellSelectionAtBoundary(cell, "start");
      const atEnd = this._isCellSelectionAtBoundary(cell, "end");
      if (direction < 0 && info.row < 0 && atStart) {
        this._exitTable(cell, "before");
        return true;
      }
      if (direction > 0 && info.row === info.block.rows.length - 1 && atEnd) {
        this._exitTable(cell, "after");
        return true;
      }
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
      return splitTableRow(line.text).every((cell) => cell.trim() === "");
    }
    _escapeTableCellText(...args) {
      return escapeTableCellText(...args);
    }
    _tableRowSourceParts(...args) {
      return tableRowSourceParts(...args);
    }
    _tableBlockSourceWithOffsets(...args) {
      return tableBlockSourceWithOffsets(...args);
    }
    _tableCellInputEdit(cell, raw, displayCursor = null) {
      const info = this._tableInfoForCell(cell);
      if (!info) return null;
      const range = this._editableSourceRange(cell);
      if (range && (info.row < 0 || info.row < info.block.rows.length)) {
        const source = this._value.slice(range.from, range.to);
        const edited = editTableCellDisplay(source, raw, displayCursor ?? raw.length);
        return {
          blockFrom: info.block.from,
          blockTo: info.block.to + edited.text.length - source.length,
          cellFrom: range.from,
          cellTo: range.from + edited.text.length,
          nextValue: this._value.slice(0, range.from) + edited.text + this._value.slice(range.to),
          cursor: range.from + edited.cursor
        };
      }
      const cols = info.cols;
      const header = this._tableCellTexts(info.block.header, cols);
      const delimiter = this._tableCellTexts(info.block.delimiter, cols);
      const rows = info.block.rows.map((row) => this._tableCellTexts(row, cols));
      if (info.row < 0) {
        header[info.col] = raw;
      } else {
        while (rows.length <= info.row) rows.push(Array.from({ length: cols }, () => ""));
        requireItem(rows, info.row)[info.col] = raw;
      }
      const serialized = this._tableBlockSourceWithOffsets(header, delimiter, rows);
      const lineIndex = info.row < 0 ? 0 : info.row + 2;
      const cellOffsets = serialized.parts[lineIndex]?.offsets?.[info.col];
      const rawCursor = clamp(displayCursor ?? raw.length, 0, raw.length);
      const escapedCursor = this._escapeTableCellText(raw.slice(0, rawCursor)).length;
      const cursor = info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.from ?? 0) + escapedCursor;
      return {
        blockFrom: info.block.from,
        blockTo: info.block.from + serialized.source.length,
        cellFrom: info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.from ?? 0),
        cellTo: info.block.from + (serialized.lineStarts[lineIndex] ?? 0) + (cellOffsets?.to ?? 0),
        nextValue: this._value.slice(0, info.block.from) + serialized.source + this._value.slice(info.block.to),
        cursor
      };
    }
    _deleteEmptyTableRowFromCellResult(cell) {
      const info = this._tableInfoForCell(cell);
      if (!info || info.row < 0 || !info.line) return fail("not-applicable");
      const selection = this._getLiveSelection(cell);
      if (!selection || selection.start !== selection.end) return fail("not-applicable");
      if (this._plainText(cell) || !Boolean(info.line && this._isTableRowEmpty(info.line))) return fail("not-applicable");
      return this._tableDeleteRowResult(this._getContext(), info.block, info.row);
    }
    _insertTableRowAfterCell(cell) {
      const info = this._tableInfoForCell(cell);
      if (!info) return;
      const ctx = this._getContext();
      const result = this._tableRowInsertionResult(ctx, info.block, info.line || null, info.row < 0 ? "after-delimiter" : "after-row");
      this._applyActionResult("table.insertRowAfter", result, { source: "keyboard" });
    }
    _tableRowInsertionResult(...args) {
      return tableRowInsertionResult(...args);
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
        cursor = block.to < this._value.length ? block.to + 1 : block.to;
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
      let next = candidates.find((range) => (range.end > range.start || this._value.length === 0) && range.start <= normalized.start && range.end >= normalized.end && !this._sameRange(range, normalized));
      if (!next) next = { start: 0, end: this._value.length, label: "document" };
      this.setSelectionRange(next.start, next.end, "forward");
      this._announce(`Selected ${next.label || "content"}.`);
    }
    _selectionExpansionCandidates(selection) {
      const point = clamp(selection.start, 0, this._value.length);
      const out = [];
      const push = /* @__PURE__ */ __name((start, end, label) => {
        const range = { start: clamp(start, 0, this._value.length), end: clamp(end, 0, this._value.length), label };
        if (range.end < range.start) [range.start, range.end] = [range.end, range.start];
        if (!out.some((existing) => this._sameRange(existing, range))) out.push(range);
      }, "push");
      const active = this._activeEditableFromSelection();
      if (active?.dataset.editable === "cell") {
        const info = this._tableInfoForCell(active);
        const cellFrom = Number(active.dataset.from);
        const cellTo = Number(active.dataset.to);
        push(cellFrom, cellTo, "cell");
        if (info?.line) push(info.line.start, info.line.end, "row");
        if (info?.block) push(info.block.from, info.block.to, "table");
      }
      const block = this._findBlockAtOffset(point) || this._getBlocks()[0];
      if (block) push(block.from, block.to, block.type === "table" ? "table" : "block");
      const section = this._sectionRangeForOffset(point);
      if (section) push(section.start, section.end, "section");
      push(0, this._value.length, "document");
      return out.sort((a, b) => a.end - a.start - (b.end - b.start));
    }
    _sectionRangeForOffset(offset) {
      const blocks = this._getBlocks();
      let headingIndex = -1;
      let headingLevel = Infinity;
      for (let i = 0; i < blocks.length; i += 1) {
        const block = requireItem(blocks, i);
        if (block.type === "heading" && block.from <= offset) {
          headingIndex = i;
          headingLevel = block.heading.level;
        }
        if (block.from > offset) break;
      }
      if (headingIndex === -1) return null;
      let end = this._value.length;
      for (let i = headingIndex + 1; i < blocks.length; i += 1) {
        const block = requireItem(blocks, i);
        if (block.type === "heading" && block.heading.level <= headingLevel) {
          end = block.from;
          break;
        }
      }
      return { start: requireItem(blocks, headingIndex).from, end, label: "section" };
    }
    _sameRange(a, b) {
      return a && b && a.start === b.start && a.end === b.end;
    }
    _normalizedClipboardSelectionText(value) {
      return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }
    _selectionTextCoversLiveDocument(selectedText) {
      const selected = this._normalizedClipboardSelectionText(selectedText);
      if (!selected) return false;
      const segments = this._liveEditables().map((editable) => this._normalizedClipboardSelectionText(
        this._plainText(editable)
      )).filter(Boolean);
      if (!segments.length) return false;
      let cursor = 0;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = requireItem(segments, index);
        const found = selected.indexOf(segment, cursor);
        if (found === -1) return false;
        if (index === 0 && found !== 0) return false;
        cursor = found + segment.length;
      }
      return cursor === selected.length;
    }
    _opaqueAppleWebKitClipboardSelectionText() {
      if (!this._isAppleWebKitRuntime() || this._readLiveSelection()) return null;
      let selectedText = "";
      for (const { selection } of this._liveSelectionCandidates()) {
        try {
          const candidate = this._normalizedClipboardSelectionText(
            selection?.toString?.()
          );
          if (candidate.length > selectedText.length) selectedText = candidate;
        } catch {
        }
      }
      return selectedText || null;
    }
    _opaqueAppleWebKitFullDocumentClipboardRange(selectedText = this._opaqueAppleWebKitClipboardSelectionText()) {
      if (!selectedText) return null;
      if (!this._selectionTextCoversLiveDocument(selectedText)) return null;
      this._debug(2, "live.clipboard.full-selection-inferred", {
        selectedTextLength: selectedText.length
      });
      return { start: 0, end: this._value.length };
    }
    _clipboardRangeFromSelection(selection = this._getCurrentSelection()) {
      const opaqueSelectionText = this._opaqueAppleWebKitClipboardSelectionText();
      if (opaqueSelectionText) {
        return this._opaqueAppleWebKitFullDocumentClipboardRange(opaqueSelectionText);
      }
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
      const beforeRevision = this.revision;
      const applied = this._applyActionResult("editor.deleteSelection", result, { source: "keyboard" });
      if (!applied.ok || this.revision !== beforeRevision + 1) return;
      this._dispatch("md-cut", { markdown, start: range.start, end: range.end, origin: { kind: "user", id: "clipboard.cut" }, beforeRevision, revision: this.revision });
    }
    _serializeTableBlock(...args) {
      return serializeTableBlock(...args);
    }
    _tableCellTexts(...args) {
      return tableCellTexts(...args);
    }
    _tablePositionForOffset(...args) {
      return tablePositionForOffset(...args);
    }
    _tableColumnResult(...args) {
      return tableColumnResult(...args);
    }
    _tableDeleteRowResult(...args) {
      return tableDeleteRowResult(...args);
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
      const beforeRevision = this.revision;
      const result = this._runAction("editor.insertText", { text: prepared }, { source: "paste", apply: true });
      if (!result.ok) return false;
      if (this.revision <= beforeRevision + 1) this._dispatch("md-paste", { markdown: prepared, kind, beforeRevision, revision: this.revision, origin: { kind: "paste" } });
      return true;
    }
    _onPaste(event) {
      if (this.disabled || this.readonly) return;
      const clipboard = event.clipboardData || event.dataTransfer;
      if (!clipboard) return;
      const files = Array.from(clipboard.files || []);
      if (files.length > 0) {
        event.preventDefault();
        const insertionPoint = this.selectionStart;
        this._dispatch("md-file-paste", { files, insertionPoint, insertMarkdown: /* @__PURE__ */ __name((markdown2) => this._insertPastedMarkdown(markdown2, "file"), "insertMarkdown") });
        return;
      }
      const text = safeClipboardGet(clipboard, "text/plain");
      if (text && this.selectionStart !== this.selectionEnd && isProbablyUrl(text) && !safeClipboardGet(clipboard, "text/markdown") && !safeClipboardGet(clipboard, "text/html")) {
        event.preventDefault();
        this._runAction("inline.link", { url: text.trim() }, { source: "paste", apply: true });
        return;
      }
      const { markdown, kind } = markdownFromClipboardData(clipboard);
      if (!markdown) {
        if (["text/html", "text/markdown", "text/x-markdown", "text/plain"].some((type) => safeClipboardGet(clipboard, type).length > 0)) event.preventDefault();
        return;
      }
      event.preventDefault();
      this._insertPastedMarkdown(markdown, kind);
    }
    _onDrop(event) {
      if (this.disabled || this.readonly) return;
      const files = Array.from(event.dataTransfer?.files || []);
      if (!files.length) return;
      event.preventDefault();
      const insertionPoint = this.selectionStart;
      this._dispatch("md-file-drop", { files, insertionPoint, insertMarkdown: /* @__PURE__ */ __name((markdown) => this._insertPastedMarkdown(markdown, "file"), "insertMarkdown") });
    }
    /** @returns {import("../types.js").ActionContext} */
    _getContext(selection = null) {
      const current = selection || this._getCurrentSelection();
      const sel = {
        start: clamp(Number(current?.start) || 0, 0, this._value.length),
        end: clamp(Number(current?.end) || 0, 0, this._value.length),
        direction: current?.direction || "none"
      };
      this._selection = sel;
      const parseOptions = this._parseOptions();
      const value = this._value;
      const line = getLineRange(value, sel.start);
      const currentLine = makeLineInfo(line.start, line.end, line.text, parseOptions);
      const selectedLines = getSelectedLineRanges(value, sel.start, sel.end, parseOptions);
      const block = classifyLine(value, sel.start, currentLine, parseOptions);
      const lineBeforeCursor = currentLine.text.slice(0, sel.start - currentLine.start);
      return { value, selectionStart: sel.start, selectionEnd: sel.end, selectionDirection: sel.direction || "none", mode: this.disabled ? "disabled" : this.readonly ? "readonly" : this._isComposing ? "composing-ime" : this._completion.open ? this._completion.providerId === "slash" ? "slash-open" : "completion-open" : "idle", currentLine, selectedLines, block, inline: { insideInlineCode: isInsideInlineCode(lineBeforeCursor) }, completion: { ...this._completion }, config: { mode: this.mode, preview: this.preview, markdownFlavor: this.markdownFlavor, tagsEnabled: this.tagsEnabled, shiftEnterBehavior: this.shiftEnterBehavior, tabBehavior: this.tabBehavior, indentString: this.indentString, debug: this.debug, debugLog: this.debugLog, disabled: this.disabled, readonly: this.readonly }, host: this };
    }
    _runAction(actionId, args, options = {}) {
      const action = this._actions.get(actionId);
      if (!action) return fail("not-applicable", `Unknown action: ${actionId}`);
      const ctx = this._getContext();
      if (ctx.mode === "disabled" && !action.viewSafe) return fail("disabled");
      if (ctx.mode === "readonly" && !action.readonlySafe && !action.viewSafe) return fail("readonly");
      if (ctx.mode === "composing-ime" && action.structural !== false) return fail("composition-active");
      if (action.when && !action.when(ctx, args)) return fail("not-applicable");
      try {
        const result = action.run(ctx, args, options);
        if (options.apply === false) return result;
        return this._applyActionResult(actionId, result, options);
      } catch (error) {
        this._emitError("action", error, true, { actionId });
        return fail("provider-error", String(error instanceof Error ? error.message : error));
      }
    }
    _applyActionResult(actionId, result, options = {}) {
      if (!result?.ok) return result;
      const before = this._snapshot();
      if (result.actionHandled) {
        if (result.announcement) this._announce(result.announcement);
        return result;
      }
      if (result.transaction) {
        const beforeRevision = this.revision;
        const t = { ...result.transaction, source: options.source || result.transaction.source || "api", actionId, timestamp: now() };
        const origin = t.origin ?? { kind: t.source === "paste" ? "paste" : t.source === "user" ? "user" : actionId === "completion.accept" ? "completion" : "action", id: actionId };
        t.origin = origin;
        const expectedRevision = beforeRevision + (applyTextChanges(before.value, t.changes) === before.value ? 0 : 1);
        if (!this._applyTransaction(t, { source: t.source, inputType: options.inputType })) return fail("change-canceled", "Change blocked.");
        if (this.revision === expectedRevision) this._dispatch("md-action", { actionId, args: t.args, source: t.source, before, after: this._snapshot(), origin, beforeRevision, revision: this.revision });
      } else this._dispatch("md-action", { actionId, source: options.source || "api", before, after: this._snapshot() });
      if (result.announcement) this._announce(result.announcement);
      return result;
    }
    _applyTransaction(transaction, options = {}) {
      const before = this._snapshot();
      const beforeRevision = this.revision;
      const nextValue = applyTextChanges(this._value, transaction.changes);
      const proposedSelection = { ...transaction.selectionAfter || { start: nextValue.length, end: nextValue.length, direction: "none" } };
      const eventTransaction = Object.freeze({ ...transaction, changes: Object.freeze(transaction.changes.map((change) => Object.freeze({ ...change }))), ...transaction.origin ? { origin: Object.freeze({ ...transaction.origin }) } : {} });
      const beforeEvent = this._dispatch("md-before-change", { transaction: eventTransaction, before: { value: before.value, selection: { ...before.selection } }, nextValue, selectionAfter: { ...proposedSelection }, source: options.source || transaction.source || "api" }, { cancelable: true });
      if (this.revision !== beforeRevision) return false;
      if (this.disabled || this.readonly || this._isComposing) return false;
      if (beforeEvent.defaultPrevented) {
        this._announce("Change blocked.");
        return false;
      }
      if (nextValue === this._value) return true;
      this._value = nextValue;
      this._pendingFenceOpening = null;
      const sel = proposedSelection;
      this._selection = { start: clamp(sel.start, 0, nextValue.length), end: clamp(sel.end, 0, nextValue.length), direction: sel.direction || "none" };
      this._structuredSelection = null;
      const after = makeSnapshot(this._value, this._selection.start, this._selection.end, this._selection.direction);
      this._recordUndo(before, after, transaction.undoGroup || transaction.actionId, { coalesce: false, changes: transaction.changes });
      this._redoStack.length = 0;
      const previousOrigin = this._activeOrigin;
      this._activeOrigin = transaction.origin ?? { kind: transaction.source === "paste" ? "paste" : transaction.actionId === "completion.accept" ? "completion" : transaction.actionId ? "action" : "api", ...transaction.actionId ? { id: transaction.actionId } : {} };
      this._afterValueChanged({ source: options.source || transaction.source || "api", inputType: options.inputType, restoreSelection: options.restoreSelection ?? true, previousValue: before.value, changes: transaction.changes });
      this._activeOrigin = previousOrigin;
      this._scheduleCompletionUpdate();
      return true;
    }
    _installBuiltInActions() {
      installBuiltInActions({
        registerAction: /* @__PURE__ */ __name((...args) => this.registerAction(...args), "registerAction"),
        smartEnter: /* @__PURE__ */ __name((...args) => this._smartEnter(...args), "smartEnter"),
        smartTab: /* @__PURE__ */ __name((...args) => this._smartTab(...args), "smartTab"),
        expandSelection: /* @__PURE__ */ __name((...args) => this._expandSelection(...args), "expandSelection"),
        undo: /* @__PURE__ */ __name((...args) => this._undo(...args), "undo"),
        redo: /* @__PURE__ */ __name((...args) => this._redo(...args), "redo"),
        findBlockAtOffset: this._findBlockAtOffset.bind(this),
        setMode: /* @__PURE__ */ __name((mode) => {
          this.mode = mode;
        }, "setMode"),
        closeCompletion: /* @__PURE__ */ __name((...args) => this._closeCompletion(...args), "closeCompletion"),
        moveCompletion: /* @__PURE__ */ __name((...args) => this._moveCompletion(...args), "moveCompletion"),
        setCompletionIndex: /* @__PURE__ */ __name((...args) => this._setCompletionIndex(...args), "setCompletionIndex"),
        completionCount: /* @__PURE__ */ __name(() => this._completion.items.length, "completionCount"),
        acceptCompletion: /* @__PURE__ */ __name((...args) => this._acceptCompletion(...args), "acceptCompletion")
      });
    }
    _installBuiltInProviders(...args) {
      return this._completionController._installBuiltInProviders(...args);
    }
    _getLanguageItems(...args) {
      return this._completionController._getLanguageItems(...args);
    }
    _smartEnter(ctx) {
      if (ctx.selectionStart !== ctx.selectionEnd) return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
      if (this._isUnclosedFenceOpeningContext(ctx)) {
        const fenceInfo = getFenceInfo(ctx.currentLine.text);
        return insertionTransaction(ctx, "editor.smartEnter", `

${fenceInfo?.sequence || "```"}`, 1, "smartEnter");
      }
      if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
      const list = ctx.block.list;
      if (list) {
        if (list.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", list.contentStart, "Exited list.");
        if (list.kind === "task-list-item") {
          const insert2 = `
${list.indent}${list.marker} [ ] `;
          return insertionTransaction(ctx, "editor.smartEnter", insert2, insert2.length, "smartEnter");
        }
        if (list.kind === "ordered-list-item") {
          const next = Number.isFinite(list.number) ? (list.number ?? 0) + 1 : 1;
          const insert2 = `
${list.indent}${next}${list.delimiter || "."} `;
          return insertionTransaction(ctx, "editor.smartEnter", insert2, insert2.length, "smartEnter");
        }
        const insert = `
${list.indent}${list.marker} `;
        return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter");
      }
      const quote = ctx.block.blockquote;
      if (quote) {
        if (quote.content.trim() === "") return removePrefixFromLine(ctx, "editor.smartEnter", quote.contentStart, "Exited blockquote.");
        const insert = `
${quote.markerText}`;
        return insertionTransaction(ctx, "editor.smartEnter", insert, insert.length, "smartEnter");
      }
      if (ctx.block.kind === "heading") return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
      if (ctx.block.kind === "table") {
        const table = this._findBlockAtOffset(ctx.selectionStart, "table");
        if (table?.type === "table") {
          const placement = ctx.currentLine.start === table.header.start ? "after-delimiter" : "after-row";
          return this._tableRowInsertionResult(ctx, table, ctx.currentLine, placement);
        }
      }
      return insertionTransaction(ctx, "editor.smartEnter", "\n", 1, "smartEnter");
    }
    _isUnclosedFenceOpeningContext(ctx) {
      if (!ctx || ctx.selectionStart !== ctx.selectionEnd) return false;
      const currentTextBeforeCursor = ctx.currentLine.text.slice(
        0,
        ctx.selectionStart - ctx.currentLine.start
      );
      const fenceInfo = getFenceInfo(ctx.currentLine.text);
      const pending = this._pendingFenceOpening;
      const isPending = Boolean(
        pending && pending.start === ctx.currentLine.start && pending.marker === fenceInfo?.marker
      );
      return Boolean(
        fenceInfo && currentTextBeforeCursor.trim().startsWith(fenceInfo?.sequence || "```") && !isInsideFence(ctx.value, ctx.selectionStart) && (isPending || !hasClosingFenceAfter(ctx.value, ctx.currentLine.end, fenceInfo))
      );
    }
    _smartTab(ctx) {
      if (ctx.completion?.open) return this._acceptCompletion("tab");
      const anyList = ctx.selectedLines.some((line) => parseListItem(line.text, ctx.config));
      if (anyList) return this._indentLines(ctx, ctx.config.indentString);
      if (ctx.block.kind === "fenced-code") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
      if (ctx.config.tabBehavior === "editor-first") return insertionTransaction(ctx, "editor.smartTab", ctx.config.indentString, ctx.config.indentString.length, "indent");
      return fail("not-applicable", "Tab should move focus in accessibility-first mode.");
    }
    _smartOutdent(...args) {
      return smartOutdent(...args);
    }
    _deleteSelectionResult(...args) {
      return deleteSelectionResult(...args);
    }
    _markdownShortcut(...args) {
      return markdownShortcut(...args);
    }
    _smartDelete(...args) {
      return smartDelete(...args);
    }
    _smartBackspace(...args) {
      return smartBackspace(...args);
    }
    _lineOutdentAmount(text) {
      return lineOutdentAmount(text, this.indentString);
    }
    _indentLines(...args) {
      return indentLines(...args);
    }
    _outdentLines(...args) {
      return outdentLines(...args);
    }
    _toggleParagraph(...args) {
      return toggleParagraph(...args);
    }
    _toggleHeading(...args) {
      return toggleHeading(...args);
    }
    _toggleList(...args) {
      return toggleList(...args);
    }
    _toggleTaskDone(...args) {
      return toggleTaskDone(...args);
    }
    _toggleBlockquote(...args) {
      return toggleBlockquote(...args);
    }
    _setCodeLanguageResult(...args) {
      return setCodeLanguageResult(...args);
    }
    _toggleCodeFence(...args) {
      return toggleCodeFence(...args);
    }
    _insertHorizontalRule(...args) {
      return insertHorizontalRule(...args);
    }
    _insertTable(...args) {
      return insertTable(...args);
    }
    _wrapInline(...args) {
      return wrapInline(...args);
    }
    _wrapCode(...args) {
      return wrapCode(...args);
    }
    _insertLink(...args) {
      return insertLink(...args);
    }
    _insertImage(...args) {
      return insertImage(...args);
    }
    _matchTag(...args) {
      return this._completionController._matchTag(...args);
    }
    _getTagItems(...args) {
      return this._completionController._getTagItems(...args);
    }
    _applyTagItem(...args) {
      return this._completionController._applyTagItem(...args);
    }
    _matchSlash(...args) {
      return this._completionController._matchSlash(...args);
    }
    _getSlashItems(...args) {
      return this._completionController._getSlashItems(...args);
    }
    _applySlashItem(...args) {
      return this._completionController._applySlashItem(...args);
    }
    _slashReplacementForAction(...args) {
      return this._completionController._slashReplacementForAction(...args);
    }
    _applyCodeLanguageItem(...args) {
      return this._completionController._applyCodeLanguageItem(...args);
    }
    _matchCodeLanguage(...args) {
      return this._completionController._matchCodeLanguage(...args);
    }
    _scheduleCompletionUpdate(...args) {
      return this._completionController._scheduleCompletionUpdate(...args);
    }
    _maybeUpdateCompletions(...args) {
      return this._completionController._maybeUpdateCompletions(...args);
    }
    _normalizeCompletionItems(...args) {
      return this._completionController._normalizeCompletionItems(...args);
    }
    _openCompletion(...args) {
      return this._completionController._openCompletion(...args);
    }
    _closeCompletion(...args) {
      return this._completionController._closeCompletion(...args);
    }
    _renderCompletion() {
      if (!this._completionPopup) return;
      const open = this._completion.open && this._completion.items.length > 0;
      this._completionPopup.hidden = !open;
      const controller = this._isSourceActive() ? this._sourceTextarea : this._liveEditor;
      controller?.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) {
        this._completionPopup.innerHTML = "";
        this._completionPopup.scrollTop = 0;
        this._completionPopup.style.left = "";
        this._completionPopup.style.top = "";
        this._completionPopup.style.width = "";
        this._completionPopup.style.minWidth = "";
        this._completionPopup.style.maxWidth = "";
        this._completionPopup.style.maxHeight = "";
        delete this._completionPopup.dataset.boundary;
        delete this._completionPopup.dataset.placement;
        this._sourceTextarea?.removeAttribute("aria-activedescendant");
        this._liveEditor?.removeAttribute("aria-activedescendant");
        return;
      }
      const previousScrollTop = this._completionPopup.scrollTop;
      const activeId = this._completion.activeIndex >= 0 ? `${this._ids.completion}-item-${this._completion.activeIndex}` : null;
      if (activeId) controller?.setAttribute("aria-activedescendant", activeId);
      else controller?.removeAttribute("aria-activedescendant");
      this._completionPopup.innerHTML = this._completion.items.map((item, index) => `<div id="${this._ids.completion}-item-${index}" class="completion-item" part="${index === this._completion.activeIndex ? "completion-item completion-item-active" : "completion-item"}" role="option" aria-selected="${index === this._completion.activeIndex ? "true" : "false"}" aria-disabled="${item.disabled ? "true" : "false"}" data-index="${index}"><div class="completion-label">${escapeHtml(item.label)}</div><div class="completion-detail">${escapeHtml(item.detail || "")}</div>${item.description ? `<div class="completion-description">${escapeHtml(item.description)}</div>` : ""}</div>`).join("");
      this._completionPopup.scrollTop = previousScrollTop;
      this._positionCompletionPopup();
      this._scrollActiveCompletionIntoView();
    }
    _scrollActiveCompletionIntoView() {
      const popup = this._completionPopup;
      const option = popup?.querySelector('[role="option"][aria-selected="true"]');
      if (!popup || !option) return;
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.offsetHeight;
      const visibleTop = popup.scrollTop;
      const visibleBottom = visibleTop + popup.clientHeight;
      if (optionTop < visibleTop) popup.scrollTop = optionTop;
      else if (optionBottom > visibleBottom) popup.scrollTop = optionBottom - popup.clientHeight;
    }
    _startCompletionPositionTracking() {
      globalThis.addEventListener?.("resize", this._boundCompletionViewportChange);
      globalThis.addEventListener?.("scroll", this._boundCompletionViewportChange, true);
      const viewport = globalThis.visualViewport || null;
      if (this._completionVisualViewport && this._completionVisualViewport !== viewport) {
        this._completionVisualViewport.removeEventListener?.("resize", this._boundCompletionViewportChange);
        this._completionVisualViewport.removeEventListener?.("scroll", this._boundCompletionViewportChange);
      }
      this._completionVisualViewport = viewport;
      viewport?.addEventListener?.("resize", this._boundCompletionViewportChange);
      viewport?.addEventListener?.("scroll", this._boundCompletionViewportChange);
    }
    _stopCompletionPositionTracking() {
      globalThis.removeEventListener?.("resize", this._boundCompletionViewportChange);
      globalThis.removeEventListener?.("scroll", this._boundCompletionViewportChange, true);
      this._completionVisualViewport?.removeEventListener?.("resize", this._boundCompletionViewportChange);
      this._completionVisualViewport?.removeEventListener?.("scroll", this._boundCompletionViewportChange);
      this._completionVisualViewport = null;
      if (this._completionPositionFrame) cancelAnimationFrame(this._completionPositionFrame);
      this._completionPositionFrame = 0;
    }
    _scheduleCompletionPositionUpdate() {
      if (!this._completion.open || !this._completionPopup || this._completionPositionFrame) return;
      this._completionPositionFrame = requestAnimationFrame(() => {
        this._completionPositionFrame = 0;
        if (!this._completion.open || !this._completionPopup) return;
        this._positionCompletionPopup();
        this._scrollActiveCompletionIntoView();
      });
    }
    _completionViewportRect() {
      const viewport = globalThis.visualViewport;
      const documentElement = globalThis.document?.documentElement;
      const width = Math.max(0, Number(viewport?.width) || globalThis.innerWidth || documentElement?.clientWidth || 0);
      const height = Math.max(0, Number(viewport?.height) || globalThis.innerHeight || documentElement?.clientHeight || 0);
      const left = Number(viewport?.offsetLeft) || 0;
      const top = Number(viewport?.offsetTop) || 0;
      return { left, top, right: left + width, bottom: top + height, width, height };
    }
    _scrollCompletionAnchorIntoView(anchor, surface) {
      if (!anchor || !surface || surface.scrollHeight <= surface.clientHeight) return false;
      const surfaceRect = surface.getBoundingClientRect();
      const inset = 8;
      const visibleTop = surfaceRect.top + inset;
      const visibleBottom = surfaceRect.bottom - inset;
      const delta = anchor.top < visibleTop ? anchor.top - visibleTop : anchor.bottom > visibleBottom ? anchor.bottom - visibleBottom : 0;
      if (Math.abs(delta) < 1) return false;
      const previousScrollTop = surface.scrollTop;
      surface.scrollTop += delta;
      return Math.abs(surface.scrollTop - previousScrollTop) >= 1;
    }
    _positionCompletionPopup() {
      const shell = this._shadow.querySelector(".editor-shell");
      if (!shell || !this._completionPopup) return;
      const popup = this._completionPopup;
      const shellRect = shell.getBoundingClientRect();
      const surface = this._isSourceActive() ? this._sourceTextarea : this._liveEditor;
      const readAnchor = /* @__PURE__ */ __name(() => {
        let rect = null;
        try {
          const sel = readSelectionCandidates(this._shadow)[0]?.selection || globalThis.getSelection?.();
          if (sel?.rangeCount) rect = sel.getRangeAt(0).getBoundingClientRect();
        } catch {
        }
        if (!rect || !rect.width && !rect.height) {
          const target = this._domPositionFromSource(this._selection.start)?.editable || this._sourceTextarea;
          rect = target?.getBoundingClientRect?.();
        }
        return rect || shellRect;
      }, "readAnchor");
      let anchor = readAnchor();
      if (this._scrollCompletionAnchorIntoView(anchor, surface)) anchor = readAnchor();
      const viewport = this._completionViewportRect();
      const margin = 8;
      const gap = 6;
      const availableWidth = Math.max(0, viewport.width - margin * 2);
      popup.style.width = "";
      popup.style.minWidth = `${Math.min(240, availableWidth)}px`;
      popup.style.maxWidth = `${availableWidth}px`;
      popup.style.maxHeight = "";
      let popupRect = popup.getBoundingClientRect();
      popup.style.width = `${popupRect.width}px`;
      popupRect = popup.getBoundingClientRect();
      const viewportTop = viewport.top + margin;
      const viewportBottom = viewport.bottom - margin;
      const surfaceRect = surface?.getBoundingClientRect?.();
      const editorTop = Math.max(viewportTop, (surfaceRect?.top ?? viewportTop) + margin);
      const editorBottom = Math.min(viewportBottom, (surfaceRect?.bottom ?? viewportBottom) - margin);
      const editorBelowSpace = Math.max(0, editorBottom - anchor.bottom - gap);
      const editorAboveSpace = Math.max(0, anchor.top - gap - editorTop);
      const useEditorBoundary = editorBottom > editorTop && (editorBelowSpace >= popupRect.height || editorAboveSpace >= popupRect.height);
      const verticalTop = useEditorBoundary ? editorTop : viewportTop;
      const verticalBottom = useEditorBoundary ? editorBottom : viewportBottom;
      const belowSpace = Math.max(0, verticalBottom - anchor.bottom - gap);
      const aboveSpace = Math.max(0, anchor.top - gap - verticalTop);
      const placement = belowSpace >= popupRect.height || belowSpace >= aboveSpace ? "below" : "above";
      const availableHeight = placement === "above" ? aboveSpace : belowSpace;
      popup.style.maxHeight = `${Math.max(0, Math.min(popupRect.height, availableHeight))}px`;
      popupRect = popup.getBoundingClientRect();
      const minimumLeft = viewport.left + margin;
      const maximumLeft = Math.max(minimumLeft, viewport.right - margin - popupRect.width);
      const viewportLeft = clamp(anchor.left, minimumLeft, maximumLeft);
      const desiredTop = placement === "above" ? anchor.top - gap - popupRect.height : anchor.bottom + gap;
      const minimumTop = verticalTop;
      const maximumTop = Math.max(minimumTop, verticalBottom - popupRect.height);
      const popupTop = clamp(desiredTop, minimumTop, maximumTop);
      popup.style.left = "0px";
      popup.style.top = "0px";
      const positioningOrigin = popup.getBoundingClientRect();
      popup.dataset.boundary = useEditorBoundary ? "editor" : "viewport";
      popup.dataset.placement = placement;
      popup.style.left = `${viewportLeft - positioningOrigin.left}px`;
      popup.style.top = `${popupTop - positioningOrigin.top}px`;
    }
    _enabledCompletionIndex(...args) {
      return this._completionController._enabledCompletionIndex(...args);
    }
    _moveCompletion(...args) {
      return this._completionController._moveCompletion(...args);
    }
    _setCompletionIndex(...args) {
      return this._completionController._setCompletionIndex(...args);
    }
    _acceptCompletion(...args) {
      return this._completionController._acceptCompletion(...args);
    }
    _updateFormValue() {
      if (!this._internals) return;
      this.disabled ? this._internals.setFormValue(null) : this._internals.setFormValue(this._value);
    }
    _fallbackValidity() {
      const flags = this._computeValidityFlags();
      return { valid: Object.keys(flags).length === 0, valueMissing: Boolean(flags.valueMissing), tooShort: Boolean(flags.tooShort), tooLong: Boolean(flags.tooLong), customError: Boolean(flags.customError) };
    }
    _computeValidityFlags() {
      if (this._nativeTextareaBridge) {
        const flags2 = { ...this._nativeTextareaBridge.validity(this._value).flags };
        if (this._customValidityMessage) flags2.customError = true;
        return flags2;
      }
      const flags = {};
      const value = this._value;
      if (this._customValidityMessage) flags.customError = true;
      if (this.required) {
        const empty = !this.hasAttribute("data-writemark-textarea") && DEFAULTS.emptyRequiredTrim ? value.trim().length === 0 : value.length === 0;
        if (empty) flags.valueMissing = true;
      }
      const min = parseLengthConstraint(this.getAttribute("minlength"));
      if (min != null && value.length > 0 && value.length < min) flags.tooShort = true;
      const max = parseLengthConstraint(this.getAttribute("maxlength"));
      if (max != null && value.length > max) flags.tooLong = true;
      return flags;
    }
    _updateValidity() {
      if (!this._sourceTextarea) return;
      const flags = this._computeValidityFlags();
      const min = parseLengthConstraint(this.getAttribute("minlength"));
      const max = parseLengthConstraint(this.getAttribute("maxlength"));
      let message = this._customValidityMessage || this._nativeTextareaBridge?.validity(this._value).message || "";
      if (!message) {
        if (flags.valueMissing) message = "Please fill out this field.";
        else if (flags.tooShort) message = `Please lengthen this text to at least ${min} characters.`;
        else if (flags.tooLong) message = `Please shorten this text to no more than ${max} characters.`;
      }
      const valid = Object.keys(flags).length === 0;
      if (valid) this._validationVisible = false;
      for (const el of [this._sourceTextarea, this._liveEditor]) el?.setAttribute("aria-invalid", valid ? "false" : "true");
      this._validation.textContent = !valid && this._validationVisible ? message : "";
      this._validationMessage = message;
      const anchor = this.mode === "source" || this.mode === "split" ? this._sourceTextarea : this.mode === "preview" ? this._preview : this._liveEditor;
      this._internals?.setValidity(flags, message, anchor);
    }
    _emitSelectionChange() {
      this._dispatch("md-selection-change", { selectionStart: this._selection.start, selectionEnd: this._selection.end, selectionDirection: this._selection.direction || "none" });
    }
    _announce(message) {
      if (!message || !this._status) return;
      this._status.textContent = "";
      requestAnimationFrame(() => {
        this._status.textContent = message;
      });
    }
    _debug(level, phase, detail = {}) {
      const configuredLevel = this.debug;
      if (configuredLevel < level) return null;
      const payload = {
        sequence: ++this._debugSequence,
        timestamp: now(),
        level,
        phase,
        mode: this.mode,
        valueLength: this._value.length,
        selection: { ...this._selection },
        ...detail
      };
      const event = this._dispatch("md-debug", payload);
      if (this.debugLog) globalThis.console?.debug?.("[writemark-editor]", payload);
      return event;
    }
    _dispatch(name, detail, options = {}) {
      let payload = detail;
      if (["md-before-change", "md-input", "md-change", "md-action", "md-completion-accept", "md-paste", "md-cut"].includes(name)) {
        const data = detail;
        const transaction = data.transaction;
        const source = typeof data.source === "string" ? data.source : "api";
        const kind = name === "md-completion-accept" ? "completion" : source === "paste" || name === "md-paste" ? "paste" : source === "user" ? "user" : data.actionId || transaction?.actionId ? "action" : "api";
        const origin = data.origin ?? transaction?.origin ?? this._activeOrigin ?? { kind, ...typeof data.actionId === "string" ? { id: data.actionId } : typeof data.providerId === "string" ? { id: data.providerId } : {} };
        payload = { beforeRevision: name === "md-before-change" || name === "md-change" ? this.revision : this._lastChangeBeforeRevision, revision: this.revision, ...data, origin: Object.freeze({ ...origin }) };
      }
      const event = new CustomEvent(name, { detail: payload, bubbles: options.bubbles ?? true, composed: options.composed ?? true, cancelable: options.cancelable ?? false });
      this.dispatchEvent(event);
      return event;
    }
    _emitError(phase, error, recoverable = true, extra = {}) {
      this._dispatch("md-error", { phase, error, recoverable, ...extra });
    }
    formResetCallback() {
      this.reset();
    }
    formDisabledCallback(disabled) {
      const next = Boolean(disabled);
      if (this._formDisabled === next) return;
      if (this._isComposing) this._onCompositionEnd();
      this._formDisabled = next;
      if (!this._hasConnected) return;
      if (next) this._closeCompletion();
      this._syncAttributesToControls();
      if (next) this.blur();
      this._renderAll({ restoreSelection: !next, force: true });
      this._updateFormValue();
      this._updateValidity();
    }
    formStateRestoreCallback(state) {
      if (typeof state === "string") this.value = state;
    }
  };

  // src/component/register.ts
  var registry = globalThis.customElements;
  var WritemarkEditorElement2 = registry?.get(TAG_NAME) || WritemarkEditorElement;
  if (registry && !registry.get(TAG_NAME)) registry.define(TAG_NAME, WritemarkEditorElement2);
  var LegacyEditor = class MdLiveEditorElement extends WritemarkEditorElement2 {
    static {
      __name(this, "MdLiveEditorElement");
    }
  };
  var MdLiveEditorElement2 = registry?.get(LEGACY_TAG_NAME) || LegacyEditor;
  if (registry && !registry.get(LEGACY_TAG_NAME)) registry.define(LEGACY_TAG_NAME, MdLiveEditorElement2);

  // src/browser/enhance.ts
  var handleKey = /* @__PURE__ */ Symbol.for("writemark.textarea-enhancement");
  function enhanceTextarea(textarea) {
    if (textarea.localName !== "textarea") throw new TypeError("Expected a textarea.");
    const target = textarea;
    if (target[handleKey]) return target[handleKey];
    if (!textarea.parentNode) throw new Error("The textarea needs a parent.");
    const doc = textarea.ownerDocument;
    const view = doc.defaultView;
    if (!view) throw new Error("The textarea needs a window.");
    const editor = doc.createElement("writemark-editor");
    if (typeof editor.setMarkdown !== "function" || typeof editor.applyTransaction !== "function" || typeof editor._setValueInternal !== "function" || typeof editor._setSelectionRangeWithoutFocus !== "function" || !("_nativeTextareaBridge" in editor) || !Number.isSafeInteger(editor.revision)) throw new Error("The editor does not support textarea synchronization.");
    editor.setAttribute("data-writemark-textarea", "");
    const oldHidden = textarea.hidden;
    const oldDisplay = textarea.style.getPropertyValue("display");
    const oldDisplayPriority = textarea.style.getPropertyPriority("display");
    const hadFocus = doc.activeElement === textarea;
    const oldFocus = Object.getOwnPropertyDescriptor(textarea, "focus");
    const oldSelectionRange = Object.getOwnPropertyDescriptor(textarea, "setSelectionRange");
    const oldRangeText = Object.getOwnPropertyDescriptor(textarea, "setRangeText");
    const nativeRangeText = textarea.setRangeText.bind(textarea);
    const nativeSelectionRange = textarea.setSelectionRange.bind(textarea);
    const oldValue = Object.getOwnPropertyDescriptor(textarea, "value");
    const oldDefaultValue = Object.getOwnPropertyDescriptor(textarea, "defaultValue");
    const oldValidity = Object.getOwnPropertyDescriptor(textarea, "setCustomValidity");
    const descriptor = Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype, "value");
    const defaultDescriptor = Object.getOwnPropertyDescriptor(view.HTMLTextAreaElement.prototype, "defaultValue");
    if (!descriptor?.get || !descriptor.set || oldValue || !defaultDescriptor?.get || !defaultDescriptor.set || oldDefaultValue) throw new Error("The textarea value property cannot be replaced.");
    const read = /* @__PURE__ */ __name(() => String(descriptor.get.call(textarea)), "read");
    const initialValue = read();
    const initialDefault = textarea.defaultValue;
    const initialSelection = [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection];
    const write = /* @__PURE__ */ __name((value) => {
      descriptor.set.call(textarea, value);
    }, "write");
    let unregisterLifecycle = null;
    let initialized = false;
    let lengthValidation = "native";
    let stopped = false;
    let syncing = false;
    let selectionDirection = textarea.selectionDirection;
    let lastChangeValue = initialValue;
    let userChanged = false;
    let focusWithin = false;
    let customMessage = textarea.validity.customError ? textarea.validationMessage : "";
    const nativeValidity = textarea.setCustomValidity.bind(textarea);
    editor._nativeTextareaBridge = {
      tabIndex: /* @__PURE__ */ __name(() => textarea.tabIndex, "tabIndex"),
      valueChanged(source) {
        if (!initialized) return;
        lengthValidation = ["user", "keyboard", "paste", "pointer", "undo", "redo"].includes(source) ? "user" : "programmatic";
        if (source === "reset" && (textarea.validity.tooShort || textarea.validity.tooLong)) {
          const value = read();
          write(value + " ");
          write(value);
        }
      },
      validity(value) {
        const native = textarea.validity;
        const user = lengthValidation === "user" && textarea.willValidate;
        const tooShort = user ? value.length > 0 && textarea.minLength >= 0 && value.length < textarea.minLength : lengthValidation === "native" && native.tooShort;
        const tooLong = user ? textarea.maxLength >= 0 && value.length > textarea.maxLength : lengthValidation === "native" && native.tooLong;
        const flags = {};
        if (native.valueMissing) flags.valueMissing = true;
        if (native.customError) flags.customError = true;
        if (tooShort) flags.tooShort = true;
        if (tooLong) flags.tooLong = true;
        return { flags, message: textarea.validationMessage };
      }
    };
    editor.tabIndex = textarea.tabIndex;
    const listeners = [];
    const listen = /* @__PURE__ */ __name((node, type, callback, capture = false) => {
      node.addEventListener(type, callback, capture);
      listeners.push(() => node.removeEventListener(type, callback, capture));
    }, "listen");
    const copySelection = /* @__PURE__ */ __name(() => {
      if (syncing) return;
      if (textarea.selectionStart !== editor.selectionStart || textarea.selectionEnd !== editor.selectionEnd || textarea.selectionDirection !== selectionDirection) {
        nativeSelectionRange(editor.selectionStart, editor.selectionEnd, selectionDirection);
      }
    }, "copySelection");
    const syncValue = /* @__PURE__ */ __name(() => {
      if (syncing || stopped) return;
      syncing = true;
      if (read() !== editor.value) write(editor.value);
      if (textarea.defaultValue !== editor.defaultValue) textarea.defaultValue = editor.defaultValue;
      syncing = false;
      copySelection();
    }, "syncValue");
    const forwardChange = /* @__PURE__ */ __name(() => {
      syncValue();
      const changed = userChanged && editor.value !== lastChangeValue;
      lastChangeValue = editor.value;
      userChanged = false;
      if (changed) textarea.dispatchEvent(new view.Event("change", { bubbles: true }));
    }, "forwardChange");
    let boundForm = null;
    const onReset = /* @__PURE__ */ __name((event) => {
      editor.defaultValue = textarea.defaultValue;
      view.queueMicrotask(() => {
        if (!stopped && !event.defaultPrevented) {
          lengthValidation = "native";
          fromTextarea();
          userChanged = false;
          lastChangeValue = editor.value;
        }
      });
    }, "onReset");
    const bindForm = /* @__PURE__ */ __name(() => {
      if (boundForm === textarea.form) return;
      boundForm?.removeEventListener("reset", onReset, true);
      boundForm = textarea.form;
      boundForm?.addEventListener("reset", onReset, true);
    }, "bindForm");
    const syncLabels = /* @__PURE__ */ __name(() => {
      if (editor.label) editor.label = "";
      if (textarea.hasAttribute("aria-label") || textarea.hasAttribute("aria-labelledby")) return;
      const candidates = new Set(Array.from(textarea.labels || []));
      const scope = textarea.getRootNode();
      if (textarea.id) {
        for (const label of scope.querySelectorAll(`label[for="${view.CSS.escape(textarea.id)}"]`)) candidates.add(label);
      }
      for (let parent = textarea.parentElement; parent; parent = parent.parentElement) {
        if (parent instanceof view.HTMLLabelElement) candidates.add(parent);
      }
      const labels = Array.from(candidates).filter((label) => label.control === textarea).map((label) => {
        const text = [];
        const walker = doc.createTreeWalker(label, view.NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.parentElement?.closest("textarea,input,select,button,writemark-editor,md-live-editor,script,style")) text.push(walker.currentNode.textContent || "");
        }
        return text.join("").replace(/\s+/g, " ").trim();
      }).filter(Boolean).join(" ");
      if (editor.getAttribute("aria-label") !== labels) editor.setAttribute("aria-label", labels);
    }, "syncLabels");
    const syncAttributes = /* @__PURE__ */ __name(() => {
      if (stopped) return;
      for (const name of ["placeholder", "required", "readonly", "minlength", "maxlength", "dir", "spellcheck", "title", "form", "aria-describedby", "aria-label", "aria-labelledby"]) {
        const value = textarea.getAttribute(name);
        if (value === null) editor.removeAttribute(name);
        else editor.setAttribute(name, value);
      }
      editor.disabled = textarea.matches(":disabled");
      editor.setCustomValidity(customMessage);
      syncLabels();
      editor._syncAttributesToControls();
      const mode = textarea.getAttribute("data-writemark-mode");
      if (mode === "live" || mode === "source" || mode === "split" || mode === "preview") editor.mode = mode;
      editor.defaultValue = textarea.defaultValue;
      bindForm();
    }, "syncAttributes");
    const fromTextarea = /* @__PURE__ */ __name((changes) => {
      if (stopped || syncing) return;
      const wanted = read();
      const selection = [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection];
      const revision = editor.revision;
      syncing = true;
      try {
        if (wanted !== editor.value) editor._setValueInternal(wanted, { source: "api", preserveSelection: editor.matches(":focus-within"), ...changes ? { changes } : {} });
        if (editor.value === wanted && editor.revision <= revision + 1) editor._setSelectionRangeWithoutFocus(...selection);
      } finally {
        syncing = false;
      }
      syncValue();
      editor._updateValidity();
    }, "fromTextarea");
    const focus = /* @__PURE__ */ __name((options) => {
      syncAttributes();
      if (!editor.disabled) editor.focus(options);
    }, "focus");
    const restore = /* @__PURE__ */ __name((name, saved) => {
      if (saved) Object.defineProperty(textarea, name, saved);
      else Reflect.deleteProperty(textarea, name);
    }, "restore");
    let observedParent = null;
    let labelRoot = null;
    let observedAncestors = [];
    const labelClick = /* @__PURE__ */ __name((event) => {
      const path = event.composedPath();
      const label = path.find((node) => node instanceof view.HTMLLabelElement);
      if (label?.control === textarea && !path.some((node) => node instanceof view.HTMLElement && node !== label && /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName))) {
        event.preventDefault();
        focus();
      }
    }, "labelClick");
    const refreshOwnership = /* @__PURE__ */ __name(() => {
      const root = textarea.getRootNode();
      const ancestors = [];
      for (let ancestor = textarea.parentElement; ancestor; ancestor = ancestor.parentElement) ancestors.push(ancestor);
      const fieldsets = ancestors.filter((ancestor) => ancestor.localName === "fieldset");
      const changed = root !== labelRoot || textarea.parentNode !== observedParent || ancestors.length !== observedAncestors.length || ancestors.some((ancestor, index) => ancestor !== observedAncestors[index]);
      if (!changed) return false;
      if (root !== labelRoot) {
        labelRoot?.removeEventListener("click", labelClick);
        labelRoot = root;
        labelRoot.addEventListener("click", labelClick);
      }
      observedParent = textarea.parentNode;
      observedAncestors = ancestors;
      observer.disconnect();
      observer.observe(textarea, { attributes: true, childList: true, characterData: true, subtree: true });
      if (observedParent) observer.observe(observedParent, { childList: true });
      for (const fieldset of fieldsets) observer.observe(fieldset, { attributes: true, attributeFilter: ["disabled"] });
      return true;
    }, "refreshOwnership");
    const refreshLifecycle = /* @__PURE__ */ __name(() => {
      if (stopped) return;
      if (editor.parentNode !== textarea.parentNode || !editor.parentNode) {
        handle.destroy();
        return;
      }
      if (refreshOwnership()) syncAttributes();
      else syncLabels();
    }, "refreshLifecycle");
    const observer = new view.MutationObserver(() => {
      refreshLifecycle();
      if (stopped) return;
      syncAttributes();
      fromTextarea();
    });
    const handle = {
      editor,
      textarea,
      destroy() {
        if (stopped) return;
        const restoreFocus = editor.matches(":focus-within");
        syncValue();
        stopped = true;
        editor._nativeTextareaBridge = null;
        observer.disconnect();
        labelRoot?.removeEventListener("click", labelClick);
        unregisterLifecycle?.();
        boundForm?.removeEventListener("reset", onReset, true);
        listeners.forEach((remove) => remove());
        restore("value", oldValue);
        restore("defaultValue", oldDefaultValue);
        restore("focus", oldFocus);
        restore("setSelectionRange", oldSelectionRange);
        restore("setRangeText", oldRangeText);
        restore("setCustomValidity", oldValidity);
        textarea.hidden = oldHidden;
        if (oldDisplay) textarea.style.setProperty("display", oldDisplay, oldDisplayPriority);
        else textarea.style.removeProperty("display");
        editor.remove();
        delete target[handleKey];
        nativeValidity(customMessage);
        if (restoreFocus && !oldHidden) textarea.focus();
      }
    };
    try {
      syncAttributes();
      editor._setValueInternal(initialValue, { source: "api", preserveSelection: false });
      textarea.after(editor);
      editor.defaultValue = initialDefault;
      editor._setValueInternal(initialValue, { source: "api", preserveSelection: false });
      editor._setSelectionRangeWithoutFocus(...initialSelection);
      Object.defineProperty(textarea, "value", {
        configurable: true,
        enumerable: descriptor.enumerable ?? true,
        get: read,
        set(value) {
          const before = read();
          write(value);
          if (read() !== before) lengthValidation = "programmatic";
          fromTextarea();
        }
      });
      Object.defineProperty(textarea, "defaultValue", {
        configurable: true,
        enumerable: defaultDescriptor.enumerable ?? true,
        get() {
          return String(defaultDescriptor.get.call(textarea));
        },
        set(value) {
          defaultDescriptor.set.call(textarea, value);
          if (syncing || stopped) return;
          const beforeRevision = editor.revision;
          const oldEditorValue = editor.value;
          const clean = !editor.dirty;
          syncing = true;
          try {
            editor.defaultValue = textarea.defaultValue;
          } finally {
            syncing = false;
          }
          const expectedRevision = beforeRevision + (clean && editor.defaultValue !== oldEditorValue ? 1 : 0);
          if (editor.revision > expectedRevision) syncValue();
          else fromTextarea();
        }
      });
      Object.defineProperty(textarea, "setSelectionRange", {
        configurable: true,
        value(start, end, direction) {
          nativeSelectionRange(start, end, direction);
          if (!syncing && !stopped) editor._setSelectionRangeWithoutFocus(textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection);
        }
      });
      Object.defineProperty(textarea, "setRangeText", {
        configurable: true,
        value(...args) {
          const before = read();
          const revision = editor.revision;
          const beforeStart = textarea.selectionStart;
          const beforeEnd = textarea.selectionEnd;
          Reflect.apply(nativeRangeText, textarea, args);
          const after = read();
          if (after !== before) lengthValidation = "programmatic";
          const unsigned = /* @__PURE__ */ __name((value) => Number.isFinite(value) ? (Math.trunc(value) % 4294967296 + 4294967296) % 4294967296 : 0, "unsigned");
          const from = args.length === 1 ? beforeStart : typeof args[1] === "number" ? Math.min(before.length, unsigned(args[1])) : null;
          const to = args.length === 1 ? beforeEnd : typeof args[2] === "number" ? Math.min(before.length, unsigned(args[2])) : null;
          let changes;
          if (from !== null && to !== null && editor.revision === revision && editor.value === before) {
            const insertedLength = after.length - before.length + to - from;
            const insert = after.slice(from, from + insertedLength);
            if (insertedLength >= 0 && before.slice(0, from) + insert + before.slice(to) === after) changes = [{ from, to, insert }];
          }
          fromTextarea(changes);
        }
      });
      Object.defineProperty(textarea, "focus", { configurable: true, value: focus });
      Object.defineProperty(textarea, "setCustomValidity", {
        configurable: true,
        value(message) {
          customMessage = String(message);
          nativeValidity(customMessage);
          editor.setCustomValidity(customMessage);
        }
      });
      listen(editor, "md-value-sync", syncValue);
      listen(editor, "md-input", ((event) => {
        syncValue();
        if (["user", "keyboard", "paste", "pointer", "undo", "redo"].includes(event.detail.source)) {
          userChanged = editor.value !== lastChangeValue;
          textarea.dispatchEvent(new view.Event("input", { bubbles: true, composed: true }));
        } else if (!userChanged) lastChangeValue = editor.value;
      }));
      listen(editor, "md-change", ((event) => {
        if (event.detail.origin.kind === "user") forwardChange();
        else syncValue();
      }));
      if (editor.shadowRoot) {
        listen(editor.shadowRoot, "input", (event) => event.stopPropagation());
        listen(editor.shadowRoot, "change", (event) => event.stopPropagation());
      }
      listen(editor, "focusin", () => {
        if (focusWithin) return;
        focusWithin = true;
        lastChangeValue = editor.value;
        userChanged = false;
      });
      listen(editor, "focusout", () => {
        view.queueMicrotask(() => {
          if (stopped || editor.matches(":focus-within")) return;
          focusWithin = false;
          forwardChange();
        });
      });
      listen(editor, "md-selection-change", ((event) => {
        selectionDirection = event.detail.selectionDirection;
        copySelection();
      }));
      listen(textarea, "input", () => fromTextarea());
      listen(textarea, "change", () => fromTextarea());
      listen(textarea, "select", () => {
        if (!syncing) editor._setSelectionRangeWithoutFocus(textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection);
      });
      listen(textarea, "invalid", (event) => {
        event.preventDefault();
        focus();
        editor.reportValidity();
      });
      refreshOwnership();
      textarea.hidden = true;
      textarea.style.setProperty("display", "none", "important");
      target[handleKey] = handle;
      unregisterLifecycle = managerFor(doc).add(handle, refreshLifecycle);
      initialized = true;
      editor._updateValidity();
      if (hadFocus) focus();
      return handle;
    } catch (error) {
      handle.destroy();
      defaultDescriptor.set.call(textarea, initialDefault);
      write(initialValue);
      textarea.setSelectionRange(...initialSelection);
      throw error;
    }
  }
  __name(enhanceTextarea, "enhanceTextarea");
  function enhanceTextareas(root = document) {
    const node = root;
    if (node.nodeType === 11 && "host" in root && node.ownerDocument) managerFor(node.ownerDocument).watch(root);
    const nodes = Array.from(root.querySelectorAll("textarea[data-writemark]"));
    if (root.nodeType === 1 && root.matches("textarea[data-writemark]")) nodes.unshift(root);
    const handles = [];
    for (const textarea of nodes) {
      try {
        handles.push(enhanceTextarea(textarea));
      } catch {
      }
    }
    return handles;
  }
  __name(enhanceTextareas, "enhanceTextareas");
  var managerKey = /* @__PURE__ */ Symbol.for("writemark.textarea-manager");
  function managerFor(doc) {
    const managed = doc;
    const existing = managed[managerKey];
    if (existing) return existing;
    const view = doc.defaultView;
    if (!view) throw new Error("The document needs a window.");
    const handles = /* @__PURE__ */ new Set();
    const roots = /* @__PURE__ */ new Map();
    const refreshers = /* @__PURE__ */ new WeakMap();
    let automatic = false;
    const cleanup = /* @__PURE__ */ __name(() => {
      for (const record of handles) {
        const handle = record.reference.deref();
        if (!handle) {
          handles.delete(record);
          continue;
        }
        if (handle.textarea.isConnected && handle.textarea.ownerDocument === doc) {
          record.connected = true;
          refreshers.get(handle)?.();
          const root = handle.textarea.getRootNode();
          if (root instanceof view.ShadowRoot) observeShadow(root);
        } else if (record.connected) handle.destroy();
      }
      for (const [root, observer2] of roots) {
        if (!root.host.isConnected || root.host.ownerDocument !== doc) {
          observer2.disconnect();
          roots.delete(root);
        }
      }
    }, "cleanup");
    const scan = /* @__PURE__ */ __name((root) => {
      if (root.nodeType === 1 && /^(writemark-editor|md-live-editor)$/.test(root.localName)) return;
      enhanceTextareas(root);
      const elements = root.nodeType === 1 ? [root, ...root.querySelectorAll("*")] : Array.from(root.querySelectorAll("*"));
      for (const element of elements) {
        if (element.shadowRoot && !/^(writemark-editor|md-live-editor)$/.test(element.localName)) {
          observeShadow(element.shadowRoot);
          scan(element.shadowRoot);
        }
      }
    }, "scan");
    const mutations = /* @__PURE__ */ __name((records) => {
      cleanup();
      if (!automatic) return;
      for (const record of records) {
        if (record.type === "attributes") {
          const target = record.target;
          if (target.matches("textarea[data-writemark]")) enhanceTextareas(target);
        } else {
          for (const added of record.addedNodes) {
            if (added.isConnected && added.nodeType === 1) scan(added);
          }
        }
      }
    }, "mutations");
    const observeShadow = /* @__PURE__ */ __name((root) => {
      if (!root.host.isConnected || roots.has(root)) return;
      const observer2 = new view.MutationObserver(mutations);
      observer2.observe(root, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["data-writemark", "for", "id"] });
      roots.set(root, observer2);
    }, "observeShadow");
    const observer = new view.MutationObserver(mutations);
    observer.observe(doc, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["data-writemark", "for", "id"] });
    const manager = {
      watch: observeShadow,
      add(handle, refresh) {
        refreshers.set(handle, refresh);
        const record = { reference: new WeakRef(handle), connected: handle.textarea.isConnected };
        handles.add(record);
        const root = handle.textarea.getRootNode();
        if (root instanceof view.ShadowRoot) observeShadow(root);
        return () => {
          handles.delete(record);
          refreshers.delete(handle);
        };
      },
      start() {
        if (automatic) return;
        automatic = true;
        scan(doc);
      }
    };
    managed[managerKey] = manager;
    return manager;
  }
  __name(managerFor, "managerFor");
  function startTextareaEnhancement() {
    if (typeof document === "undefined") return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => managerFor(document).start(), { once: true });
    else managerFor(document).start();
  }
  __name(startTextareaEnhancement, "startTextareaEnhancement");

  // src/writemark-editor.ts
  var WritemarkEditorElement3 = WritemarkEditorElement2;
  var MdLiveEditorElement3 = MdLiveEditorElement2;
  var renderMarkdown2 = renderMarkdown;
  var renderInlineMarkdown2 = renderInlineMarkdown;
  var parseBlocks3 = parseBlocks;
  var parseTags2 = parseTags;
  var parseListItem2 = parseListItem;
  var parseHeading3 = parseHeading;
  var parseBlockquote3 = parseBlockquote;
  var htmlToMarkdown2 = htmlToMarkdown;
  var tsvToMarkdownTable2 = tsvToMarkdownTable;
  var enhanceTextarea2 = enhanceTextarea;
  var enhanceTextareas2 = enhanceTextareas;
  startTextareaEnhancement();
  return __toCommonJS(writemark_editor_exports);
})();
globalThis.WritemarkEditor = Object.freeze(__writemark);
})();
