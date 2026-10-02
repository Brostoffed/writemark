import { displayShortcut } from "./util.js";
import { ALIASES, LANGUAGES } from "../config.js";
import { clamp } from "../core/text.js";
import { fail, ok, okNoop, tx } from "../core/transactions.js";
import { isBackslashEscaped } from "../markdown/inline.js";
import { isTagBodyCharacter, isTagBoundary, isValidTagValue, normalizeTagKey } from "../markdown/tags.js";

/** Owns completion requests, providers, state, and cancellation. */
export class CompletionController {
  constructor(api) {
    this.api = Object.freeze(api);
    this._providers = new Map();
    this._completion = { open: false, providerId: null, match: null, items: [], activeIndex: 0, requestId: 0, abort: null };
    this._completionUpdateFrame = 0;
  }
  disconnect() {
    this._completion.abort?.abort();
    if (this._completionUpdateFrame) cancelAnimationFrame(this._completionUpdateFrame);
    this._completionUpdateFrame = 0;
  }
  _installBuiltInProviders() {
    this.api.registerProvider({ id: "slash", priority: 100, triggers: ["/"], match: ctx => this._matchSlash(ctx), getItems: match => this._getSlashItems(match), apply: (item, match, ctx) => this._applySlashItem(item, match, ctx) });
    this.api.registerProvider({ id: "tags", priority: 80, triggers: ["#"], match: ctx => this._matchTag(ctx), getItems: (match, ctx, signal) => this._getTagItems(match, ctx, signal), apply: (item, match, ctx) => this._applyTagItem(item, match, ctx) });
    this.api.registerProvider({ id: "code-language", priority: 60, triggers: ["```", "~~~"], match: ctx => this._matchCodeLanguage(ctx), getItems: match => this._getLanguageItems(match), apply: (item, match, ctx) => this._applyCodeLanguageItem(item, match, ctx) });
  }

  _getLanguageItems(match) {
    const q = match.query.toLowerCase(); const alias = ALIASES.get(q);
    return LANGUAGES.map(lang => ({ lang, score: !q ? 0 : lang === q || lang === alias ? -100 : lang.startsWith(q) ? -50 : lang.includes(q) ? -10 : 0 })).filter(x => !q || x.score < 0).sort((a, b) => a.score - b.score || a.lang.localeCompare(b.lang)).slice(0, 16).map(x => ({ id: x.lang, label: x.lang, detail: "code language", kind: "code-language" }));
  }

  async _getTagItems(match, ctx, signal) {
    if (!this.api.tagsEnabled() || signal.aborted) return [];
    const queryKey = normalizeTagKey(match.query);
    const items = new Map();
    for (const tag of this.api.getTagIndex()) {
      const hasOtherRange = tag.ranges.some(range => range.from !== match.from || range.to !== match.to);
      if (!hasOtherRange || (queryKey && !tag.key.startsWith(queryKey))) continue;
      items.set(tag.key, {
        id: `tag:${tag.key}`,
        label: `#${tag.value}`,
        detail: "in document",
        kind: "tag",
        value: tag.value,
        key: tag.key,
        document: true,
      });
    }
    const provider = this.api.getTagProvider();
    const supplied = provider
      ? await provider.getItems({ query: match.query, documentTags: this.api.getTags(), context: ctx, signal })
      : [];
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
        document: Boolean(documentItem),
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
        key: queryKey,
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
    if (![...query].every(char => char === "/" || isTagBodyCharacter(char))) return null;
    return {
      from: ctx.currentLine.start + hash,
      to: ctx.selectionStart,
      trigger: "#",
      query,
      providerId: "tags",
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

  _matchSlash(ctx) { if (ctx.block.kind === "fenced-code" || ctx.inline.insideInlineCode) return null; const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start); const m = /^(\s*)\/([\w-]*)$/.exec(before); if (!m) return null; return { from: ctx.currentLine.start + m[1].length, to: ctx.selectionStart, trigger: "/", query: m[2], providerId: "slash" }; }

  _getSlashItems(match) { const q = match.query.toLowerCase(); const items = []; for (const action of this.api.actions()) { if (!action.visibleInSlash) continue; const hay = [action.label, action.description, ...(action.aliases || []), ...(action.keywords || [])].filter(Boolean).join(" ").toLowerCase(); if (q && !hay.includes(q)) continue; items.push({ id: action.id, label: action.label, detail: action.group, description: action.description || displayShortcut(action.defaultShortcut), kind: "slash-command", actionId: action.id }); } return items.slice(0, 24); }

  _applySlashItem(item, match, ctx) { const repl = this._slashReplacementForAction(item.actionId); if (repl) { const insert = typeof repl.insert === "function" ? repl.insert(ctx) : repl.insert; const off = typeof repl.selectionOffset === "number" ? repl.selectionOffset : insert.length; return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert }], { start: match.from + off, end: match.from + off + (repl.selectionLength || 0), direction: "none" }, "slash"), item.label); } return ok(tx(ctx, "completion.accept", [{ from: match.from, to: match.to, insert: "" }], { start: match.from, end: match.from, direction: "none" }, "slash"), item.label); }

  _slashReplacementForAction(actionId) { return { "block.paragraph": { insert: "", selectionOffset: 0 }, "block.heading.1": { insert: "# ", selectionOffset: 2 }, "block.heading.2": { insert: "## ", selectionOffset: 3 }, "block.heading.3": { insert: "### ", selectionOffset: 4 }, "block.heading.4": { insert: "#### ", selectionOffset: 5 }, "block.heading.5": { insert: "##### ", selectionOffset: 6 }, "block.heading.6": { insert: "###### ", selectionOffset: 7 }, "block.bulletList": { insert: "- ", selectionOffset: 2 }, "block.orderedList": { insert: "1. ", selectionOffset: 3 }, "block.taskList": { insert: "- [ ] ", selectionOffset: 6 }, "block.blockquote": { insert: "> ", selectionOffset: 2 }, "block.codeFence": { insert: "```\n\n```", selectionOffset: 4 }, "block.horizontalRule": { insert: "---\n", selectionOffset: 4 }, "block.table": { insert: "| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |", selectionOffset: 2, selectionLength: "Column 1".length }, "inline.link": { insert: "[]()", selectionOffset: 1 }, "inline.image": { insert: "![]()", selectionOffset: 2 }, "inline.bold": { insert: "****", selectionOffset: 2 }, "inline.italic": { insert: "**", selectionOffset: 1 }, "inline.code": { insert: "``", selectionOffset: 1 }, "inline.strikethrough": { insert: "~~~~", selectionOffset: 2 } }[actionId] || null; }

  _applyCodeLanguageItem(item, match, ctx) {
    const sequence = match.sequence || "```";
    const opening = `${sequence}${item.label}`;
    const hasLineBreak = ctx.currentLine.end < ctx.value.length
      && ctx.value[ctx.currentLine.end] === "\n";
    const shouldClose = hasLineBreak
      && this.api.isUnclosedFenceOpeningContext(ctx);
    const closing = `${match.indent || ""}${sequence}`;
    const insert = shouldClose ? `${opening}\n\n${closing}` : opening;
    const cursor = match.from + opening.length + (shouldClose ? 1 : 0);
    return ok(tx(
      ctx,
      "completion.accept",
      [{ from: match.from, to: match.to, insert }],
      { start: cursor, end: cursor, direction: "none" },
      "completion"
    ), `Language ${item.label}.`);
  }

  _matchCodeLanguage(ctx) { if (ctx.block.kind === "fenced-code" && !this.api.isUnclosedFenceOpeningContext(ctx)) return null; const before = ctx.currentLine.text.slice(0, ctx.selectionStart - ctx.currentLine.start); const m = /^(\s*)(`{3,}|~{3,})([\w+-]*)$/.exec(before); if (!m || LANGUAGES.includes(m[3].toLowerCase())) return null; return { from: ctx.currentLine.start + m[1].length, to: ctx.selectionStart, trigger: m[2], sequence: m[2], indent: m[1], query: m[3], providerId: "code-language" }; }

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
    if (this.api.disabled() || this.api.readonly() || this.api.isComposing()) return; const ctx = this.api.getContext(); if (ctx.selectionStart !== ctx.selectionEnd) { this._closeCompletion(); return; } const providers = [...this._providers.values()].sort((a, b) => b.priority - a.priority); let selectedProvider = null; let selectedMatch = null;
    for (const provider of providers) { try { const match = provider.match(ctx); if (match) { selectedProvider = provider; selectedMatch = match; break; } } catch (error) { this.api.emitError("completion", error, true, { providerId: provider.id }); } }
    if (!selectedProvider || !selectedMatch) { this._closeCompletion(); return; }
    const requestId = this._completion.requestId + 1; this._completion.requestId = requestId; this._completion.abort?.abort(); const abort = new AbortController(); this._completion.abort = abort;
    try { Promise.resolve(selectedProvider.getItems(selectedMatch, ctx, abort.signal)).then(items => { if (abort.signal.aborted || this._completion.requestId !== requestId) return; const normalized = this._normalizeCompletionItems(items); if (!normalized.length) { this._closeCompletion(); return; } this._openCompletion(selectedProvider.id, selectedMatch, normalized); }).catch(error => { if (!abort.signal.aborted) { this.api.emitError("completion", error, true, { providerId: selectedProvider.id }); this._closeCompletion(); } }); } catch (error) { this.api.emitError("completion", error, true, { providerId: selectedProvider.id }); this._closeCompletion(); }
  }

  _normalizeCompletionItems(items) { const seen = new Set(); const out = []; for (const item of items || []) { if (!item?.id || !item?.label) continue; const key = `${item.kind}:${item.id}`; if (seen.has(key)) continue; seen.add(key); out.push(item); } return out; }

  _openCompletion(providerId, match, items) { const was = this._completion.open; this._completion.open = true; this._completion.providerId = providerId; this._completion.match = match; this._completion.items = items; const preferred = clamp(this._completion.activeIndex, 0, items.length - 1); this._completion.activeIndex = this._enabledCompletionIndex(preferred, 1); if (!was) this.api.startPositionTracking(); this.api.render(); if (!was) this.api.dispatch("md-completion-open", { providerId, match, items }); }

  _closeCompletion() {
    const wasOpen = this._completion.open;
    const detail = { providerId: this._completion.providerId, match: this._completion.match };
    this._completion.abort?.abort();
    this._completion = { ...this._completion, open: false, providerId: null, match: null, items: [], activeIndex: 0, requestId: this._completion.requestId + 1, abort: null };
    this.api.stopPositionTracking();
    this.api.render();
    if (wasOpen) this.api.dispatch("md-completion-close", detail);
  }

  _enabledCompletionIndex(start, direction = 1) {
    const n = this._completion.items.length;
    if (!n) return -1;
    const step = direction < 0 ? -1 : 1;
    for (let distance = 0; distance < n; distance += 1) {
      const index = (start + (distance * step) + n) % n;
      if (!this._completion.items[index]?.disabled) return index;
    }
    return -1;
  }

  _moveCompletion(delta) {
    const n = this._completion.items.length;
    if (!n) return;
    const start = this._completion.activeIndex < 0 ? (delta < 0 ? n - 1 : 0) : this._completion.activeIndex + delta;
    const index = this._enabledCompletionIndex((start + n) % n, delta);
    if (index >= 0) this._setCompletionIndex(index, delta);
  }

  _setCompletionIndex(index, direction = 1) { const n = this._completion.items.length; if (!n) return; this._completion.activeIndex = this._enabledCompletionIndex(clamp(index, 0, n - 1), direction); this.api.render(); }

  _acceptCompletion(source = "action") {
    if (!this._completion.open || !this._completion.items.length) return fail("not-applicable");
    const provider = this._providers.get(this._completion.providerId);
    const item = this._completion.items[this._completion.activeIndex];
    if (!provider || !item || item.disabled) return fail("not-applicable");
    const ctx = this.api.getContext();
    let result;
    try {
      const currentMatch = provider.match(ctx);
      const shownMatch = this._completion.match;
      const exactMatch = Boolean(
        currentMatch
        && shownMatch
        && currentMatch.from === shownMatch.from
        && currentMatch.to === shownMatch.to
        && currentMatch.query === shownMatch.query
        && currentMatch.trigger === shownMatch.trigger
      );
      const currentTagQuery = normalizeTagKey(currentMatch?.query || "");
      const shownTagQuery = normalizeTagKey(shownMatch?.query || "");
      const itemTagKey = normalizeTagKey(String(item.value || "").replace(/^#/, ""));
      const safeTagRefinement = Boolean(
        provider.id === "tags"
        && currentMatch
        && shownMatch
        && currentMatch.from === shownMatch.from
        && currentMatch.trigger === shownMatch.trigger
        && currentMatch.to >= shownMatch.to
        && currentTagQuery.startsWith(shownTagQuery)
        && itemTagKey.startsWith(currentTagQuery)
      );
      if (!exactMatch && !safeTagRefinement) {
        this._closeCompletion();
        this._scheduleCompletionUpdate({ immediate: true });
        return fail("not-applicable");
      }
      result = provider.apply(item, currentMatch, ctx);
    } catch (error) {
      this.api.emitError("completion", error, true, { providerId: provider.id });
      this._closeCompletion();
      return fail("provider-error", String(error?.message || error));
    }
    this._closeCompletion();
    if (result?.ok && result.transaction) {
      const before = this.api.snapshot();
      this.api.applyTransaction({
        ...result.transaction,
        source: source === "pointer" ? "pointer" : "keyboard",
        actionId: "completion.accept"
      }, {
        source: source === "pointer" ? "pointer" : "keyboard"
      });
      const after = this.api.snapshot();
      this.api.dispatch("md-completion-accept", { providerId: provider.id, item, before, after });
      if (result.announcement) this.api.announce(result.announcement);
      return okNoop(result.announcement);
    }
    return result || fail("not-applicable");
  }
}
