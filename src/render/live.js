import { textFromMarkdown } from "../browser/clipboard.js";
import { DEFAULTS } from "../config.js";
import { clamp, getLineRange } from "../core/text.js";
import { changedSpans, normalizeChanges } from "../core/transactions.js";
import { isFenceLine, isHorizontalRule, parseBlockquote, parseHeading, parseListItem, parseSetextHeadingLevel } from "../markdown/block-syntax.js";
import { assignHeadingIds, parseBlocks } from "../markdown/blocks.js";
import { parseReferenceDefinition } from "../markdown/references.js";
import { isLikelyTableRow, isTableDelimiter, tableAlignmentFromDelimiter, tableAlignmentStyle, unescapeTableCellText } from "../markdown/tables.js";
import { decorateInline } from "./inline.js";
import { escapeAttribute, escapeHtml } from "../security.js";

/** Owns render caches and viewport state. */
export class LiveRenderer {
  constructor(api) {
    this.api = Object.freeze(api);
    this._blockCache = null;
    this._blockCacheValue = null;
    this._hasRenderedOnce = undefined;
    this._lastParseMode = undefined;
    this._liveBlocks = [];
    this._liveDirty = true;
    this._nativeLiveDomDirty = false;
    this._previewDirty = true;
    this._previewRenderTimer = 0;
    this._virtualMetricsCache = null;
    this._virtualScrollFrame = 0;
    this._virtualState = { active: false, start: 0, end: 0, total: 0, lineHeight: 24 };
  }
  get _liveEditor() { return this.api.getLiveEditor(); }
  set _liveEditor(value) { this.api.setLiveEditor(value); }
  get _sourceTextarea() { return this.api.getSourceTextarea(); }
  get _value() { return this.api.getValue(); }
  get _selection() { return this.api.getSelection(); }
  get _isComposing() { return this.api.getIsComposing(); }
  get mode() { return this.api.getMode(); }
  get preview() { return this.api.getPreview(); }
  get _preview() { return this.api.getPreviewElement(); }
  set _preview(value) { this.api.setPreview(value); }
  get _liveIndexDirty() { return this.api.getLiveIndexDirty(); }
  set _liveIndexDirty(value) { this.api.setLiveIndexDirty(value); }
  get placeholder() { return this.api.getPlaceholder(); }
  get _liveSelectionAPI() { return this.api.getLiveSelectionAPI(); }
  get indentString() { return this.api.getIndentString(); }
  get disabled() { return this.api.getDisabled(); }
  set disabled(value) { this.api.setDisabled(value); }
  get readonly() { return this.api.getReadonly(); }
  set readonly(value) { this.api.setReadonly(value); }

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
    return Number.isFinite(raw) ? clamp(raw, 0, 1000) : DEFAULTS.renderDebounceMs;
  }

  _schedulePreviewRender({ immediate = false } = {}) {
    this._previewDirty = true;
    if (!this._isPreviewVisible()) return;
    const run = () => {
      this._previewRenderTimer = 0;
      if (this._isPreviewVisible()) this._renderPreview();
    };
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
    }
    catch (error) { this._preview.innerHTML = `<pre><code>${escapeHtml(this._value)}</code></pre>`; this.api._emitError("render", error, true); }
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
    const html = blocks.map(block => this._renderLiveBlock(block)).join("");
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
    if ((oldRange.end - oldRange.start) > 250 || (newRange.end - newRange.start) > 250) return false;
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
      end: clamp(range.end + 1, 0, blocks.length),
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
      const block = blocks[i];
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
    template.innerHTML = blocks.map(block => this._renderLiveBlock(block)).join("");
    return template.content;
  }

  _syncLiveMetadata(blocks) {
    const children = Array.from(this._liveEditor.children).filter(node => !node.classList?.contains("md-virtual-spacer"));
    if (children.length !== blocks.length) return false;
    for (let i = 0; i < blocks.length; i += 1) {
      if (!this._syncLiveBlockNodeMetadata(children[i], blocks[i])) return false;
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
    this._liveEditor.querySelectorAll("[data-editable]")
      .forEach(el => this._setLiveEditingHostState(el, editable));
  }

  _liveDescendantEditableAttribute(editable = this._lineEditable()) {
    return editable === "false" || this._liveSelectionAPI === false
      ? ` contenteditable="${editable}"`
      : "";
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
      const cols = Math.max(block.header.cells.length, ...block.rows.map(row => row.cells.length), 1);
      const bodyRows = block.rows.length ? block.rows : [{ cells: Array.from({ length: cols }, () => ({ text: "", from: block.delimiter.end, to: block.delimiter.end })) }];
      const expected = [
        ...Array.from({ length: cols }, (_, col) => ({ cell: block.header.cells[col] ?? { from: block.header.end, to: block.header.end }, row: -1, col })),
        ...bodyRows.flatMap((row, rowIndex) => Array.from({ length: cols }, (_, col) => ({ cell: row.cells[col] ?? { from: row.end, to: row.end }, row: rowIndex, col }))),
      ];
      if (cells.length !== expected.length) return false;
      cells.forEach((cell, index) => {
        const meta = expected[index];
        cell.dataset.row = String(meta.row);
        cell.dataset.col = String(meta.col);
        this._setEditableMetadata(cell, meta.cell.from, meta.cell.to);
      });
      return true;
    }
    if (block.type === "code-fence") {
      node.dataset.language = String(block.language || "");
      const editables = Array.from(node.querySelectorAll("[data-editable]"));
      const virtualOffset = block.codeLines[0]?.start ?? (block.closing ? block.opening.newlineEnd : block.opening.end);
      const lines = block.codeLines.length ? block.codeLines : [{ start: virtualOffset, end: virtualOffset }];
      if (editables.length !== lines.length) return false;
      editables.forEach((editable, index) => this._setEditableMetadata(editable, lines[index].start, lines[index].end, this._lineEditable(), "false"));
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
      const heading = node.matches?.(".md-heading") ? node : node.querySelector?.(".md-heading");
      if (!heading) return false;
      heading.id = block.heading.id;
      return this._setEditableMetadata(heading, block.line.start, block.line.end);
    }
    const editable = node.matches?.("[data-editable]") ? node : node.querySelector?.("[data-editable]");
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
    return texts.some(text => isFenceLine(text)
      || parseSetextHeadingLevel(text)
      || isLikelyTableRow(text)
      || isTableDelimiter(text));
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
    const change = sorted[0];
    const removed = previousValue.slice(change.from, change.to);
    if (removed.includes("\n") || change.insert.includes("\n")) return null;
    const oldLine = this._lineAt(previousValue, change.from);
    const newLine = this._lineAt(this._value, change.from + change.insert.length);
    if (oldLine.start !== newLine.start || this._lineHasStructuralNeighbors(previousValue, oldLine) || this._lineHasStructuralNeighbors(this._value, newLine)) return null;
    const oldBlocks = this._blockCache;
    const index = oldBlocks.findIndex(block => block.from === oldLine.start && block.to === oldLine.end && block.line);
    if (index === -1) return null;
    const oldBlock = oldBlocks[index];
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
    const shifted = { ...line, start: line.start + delta, end: line.end + delta, newlineEnd: line.newlineEnd + delta };
    if (line.cells) shifted.cells = line.cells.map(cell => this._shiftCell(cell, delta));
    return shifted;
  }

  _shiftBlockOffsets(block, delta) {
    const shifted = { ...block, from: block.from + delta, to: block.to + delta, newlineEnd: block.newlineEnd + delta };
    if (block.line) shifted.line = this._shiftLineOffsets(block.line, delta);
    if (block.opening) shifted.opening = this._shiftLineOffsets(block.opening, delta);
    if (block.closing) shifted.closing = this._shiftLineOffsets(block.closing, delta);
    if (block.codeLines) shifted.codeLines = block.codeLines.map(line => this._shiftLineOffsets(line, delta));
    if (block.header) shifted.header = this._shiftLineOffsets(block.header, delta);
    if (block.delimiter) shifted.delimiter = this._shiftLineOffsets(block.delimiter, delta);
    if (block.rows) shifted.rows = block.rows.map(row => this._shiftLineOffsets(row, delta));
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
    for (const block of blocks) offsets.push(offsets.at(-1) + this._estimatedBlockHeight(block, lineHeight, width));
    const metrics = { blocks, lineHeight, width, offsets };
    this._virtualMetricsCache = metrics;
    return metrics;
  }

  _virtualBlockIndexAtPixel(offsets, pixel) {
    let low = 0;
    let high = offsets.length - 2;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid + 1] <= pixel) low = mid + 1;
      else if (offsets[mid] > pixel) high = mid - 1;
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
      const block = blocks[mid];
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
    const anchorIndex = fromScroll
      ? this._virtualBlockIndexAtPixel(offsets, this._liveEditor.scrollTop || 0)
      : this._blockIndexForOffset(blocks, anchorOffset);
    const anchorPixel = fromScroll ? (this._liveEditor.scrollTop || 0) : offsets[anchorIndex];
    const start = this._virtualBlockIndexAtPixel(offsets, Math.max(0, anchorPixel - overscan));
    const end = Math.min(total, this._virtualBlockIndexAtPixel(offsets, anchorPixel + viewport + overscan) + 1);
    if (!force && this._virtualState.active && start === this._virtualState.start && end === this._virtualState.end && total === this._virtualState.total) return;
    const topHeight = Math.round(offsets[start]);
    const bottomHeight = Math.round(offsets[total] - offsets[end]);
    const top = `<div class="md-virtual-spacer" contenteditable="false" aria-hidden="true" style="block-size:${topHeight}px"></div>`;
    const bottom = `<div class="md-virtual-spacer" contenteditable="false" aria-hidden="true" style="block-size:${bottomHeight}px"></div>`;
    this._liveEditor.innerHTML = `${top}${blocks.slice(start, end).map(block => this._renderLiveBlock(block)).join("")}${bottom}`;
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
    if ((endIndex - startIndex + 1) > this._virtualWindowSize()) return false;
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
    const lineAttrs = (line, kind, extra = "", attrs = "") => `class="md-line ${extra}" part="line" data-editable="line" data-kind="${kind}" data-from="${line.start}" data-to="${line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}"${attrs ? ` ${attrs}` : ""}`;
    if (block.type === "blank") {
      const placeholderAttrs = this._value.length === 0 ? `data-placeholder="${escapeAttribute(this.placeholder)}"` : "";
      const placeholderClass = this._value.length === 0 ? "md-empty-placeholder" : "";
      return `<div ${lineAttrs(block.line, "blank", placeholderClass, placeholderAttrs)}>${block.line.text ? decorateInline(block.line.text, options) : "<br>"}</div>`;
    }
    if (block.type === "heading") {
      const afterAnchor = block.setext && block.newlineEnd === block.to
        ? `<div class="md-line md-setext-after" part="line" data-editable="virtual-setext-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After heading"><br></div>`
        : "";
      const content = block.setext ? decorateInline(block.line.text, options) : this._renderHeadingLine(block.line.text, block.heading);
      return `<div ${lineAttrs(block.line, "heading", `md-heading md-h${block.heading.level}`, `id="${escapeAttribute(block.heading.id)}"`)}>${content}</div>${afterAnchor}`;
    }
    if (block.type === "blockquote") {
      const depth = Math.max(1, Number(block.quote.depth) || 1);
      const visualDepth = Math.min(depth, 16);
      const markerEnd = block.quote.fullContentStart ?? block.quote.contentStart;
      const marker = `<span class="md-token">${escapeHtml(block.line.text.slice(0, markerEnd))}</span>`;
      const content = decorateInline(block.line.text.slice(markerEnd), options);
      return `<div ${lineAttrs(block.line, "blockquote", `md-quote md-quote-depth-${visualDepth}`, `data-quote-depth="${depth}"`)}>${marker}${content}</div>`;
    }
    if (block.type === "horizontal-rule") {
      const afterAnchor = block.line.newlineEnd === block.line.end
        ? `<div class="md-line md-hr-after" part="line" data-editable="virtual-hr-after" data-kind="blank" data-from="${block.line.end}" data-to="${block.line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After horizontal rule"><br></div>`
        : "";
      return `<div class="md-line md-hr-line" part="line" data-kind="horizontal-rule" data-from="${block.line.start}" data-to="${block.line.end}" contenteditable="false" aria-label="Horizontal rule"></div>${afterAnchor}`;
    }
    if (block.type === "task-list-item") {
      const list = block.list; const checkOffset = block.line.start + list.indent.length + `${list.marker} [`.length;
      const contentFrom = block.line.start + list.contentStart;
      const taskName = textFromMarkdown(list.content, options) || "task";
      const checkboxLabel = `${list.checked ? "Mark task incomplete" : "Mark task complete"}: ${taskName}`;
      return `<div class="md-line md-task-line md-list" part="line" data-kind="task-list-item" data-from="${block.line.start}" data-to="${block.line.end}" style="--md-list-depth:${Math.floor(list.indent.length / Math.max(1, this.indentString.length))}"><input type="checkbox" part="checkbox" data-task-checkbox="true" data-check-offset="${checkOffset}" aria-label="${escapeAttribute(checkboxLabel)}" ${list.checked ? "checked" : ""} ${this.disabled || this.readonly ? "disabled" : ""}><span class="md-task-source" data-editable="line" data-from="${contentFrom}" data-to="${block.line.end}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${this._renderTaskLine(list)}</span></div>`;
    }
    if (block.type === "bullet-list-item" || block.type === "ordered-list-item") {
      const list = block.list; const depth = Math.floor(list.indent.length / Math.max(1, this.indentString.length));
      return `<div ${lineAttrs(block.line, block.type, "md-list")} style="--md-list-depth:${depth}">${decorateInline(block.line.text, options)}</div>`;
    }
    if (block.type === "code-fence") return this._renderCodeFence(block);
    if (block.type === "table") return this._renderTable(block);
    const content = parseReferenceDefinition(block.line.text)
      ? escapeHtml(block.line.text)
      : decorateInline(block.line.text, options);
    return `<div ${lineAttrs(block.line, "paragraph")}>${content}</div>`;
  }

  _lineEditable() { return (!this.disabled && !this.readonly && this.mode !== "preview") ? "true" : "false"; }

  _renderHeadingLine(text, heading) {
    const markerEnd = heading.indent.length + heading.markerText.length;
    return `<span class="md-token">${escapeHtml(text.slice(0, markerEnd))}</span>${decorateInline(text.slice(markerEnd), this.api._rendererOptions())}`;
  }

  _renderTaskLine(list) { return decorateInline(list.content, this.api._rendererOptions()); }

  _renderCodeFence(block) {
    const editableAttribute = this._liveDescendantEditableAttribute();
    const language = String(block.language || "").trim();
    const label = language || "code";
    const header = `<div class="md-code-header" part="code-header" contenteditable="false"><span class="md-code-label">${escapeHtml(label)}</span>${language ? `<span class="md-code-language">fenced block</span>` : ""}</div>`;
    const codeLines = block.codeLines.map(line => `<div class="md-code-line" part="code-line" data-editable="line" data-kind="code-line" data-from="${line.start}" data-to="${line.end}"${editableAttribute} spellcheck="false">${escapeHtml(line.text) || "<br>"}</div>`).join("");
    const virtualOffset = block.codeLines[0]?.start ?? (block.closing ? block.opening.newlineEnd : block.opening.end);
    const virtualLine = `<div class="md-code-line" part="code-line" data-editable="virtual-code" data-kind="code-line" data-from="${virtualOffset}" data-to="${virtualOffset}"${editableAttribute} spellcheck="false"><br></div>`;
    const afterAnchor = block.closing && block.newlineEnd === block.to
      ? `<div class="md-line md-code-after" part="line" data-editable="virtual-code-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After code block"><br></div>`
      : "";
    return `<div class="md-code-block" part="code-block" data-kind="code-fence" data-from="${block.from}" data-to="${block.to}" data-language="${escapeAttribute(language)}">${header}<div class="md-code-lines" part="code-lines">${codeLines || virtualLine}</div></div>${afterAnchor}`;
  }

  _renderTable(block) {
    const cols = Math.max(block.header.cells.length, ...block.rows.map(r => r.cells.length), 1);
    const alignments = Array.from({ length: cols }, (_, i) => tableAlignmentFromDelimiter(block.delimiter.cells[i]?.text));
    const editableAttribute = this._liveDescendantEditableAttribute();
    const renderCell = (cell, tag, row, col) => `<${tag}${tableAlignmentStyle(alignments[col])}><div class="md-cell" part="table-cell" data-editable="cell" data-row="${row}" data-col="${col}" data-from="${cell?.from ?? block.to}" data-to="${cell?.to ?? block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}">${decorateInline(unescapeTableCellText(cell?.text ?? ""), this.api._rendererOptions())}</div></${tag}>`;
    const header = `<thead><tr>${Array.from({ length: cols }, (_, i) => renderCell(block.header.cells[i] ?? { text: "", from: block.header.end, to: block.header.end }, "th", -1, i)).join("")}</tr></thead>`;
    const bodyRows = block.rows.length ? block.rows : [{ cells: Array.from({ length: cols }, () => ({ text: "", from: block.delimiter.end, to: block.delimiter.end })) }];
    const body = `<tbody>${bodyRows.map((row, r) => `<tr>${Array.from({ length: cols }, (_, i) => renderCell(row.cells[i] ?? { text: "", from: row.end, to: row.end }, "td", r, i)).join("")}</tr>`).join("")}</tbody>`;
    const afterAnchor = block.newlineEnd === block.to
      ? `<div class="md-line md-table-after" part="line" data-editable="virtual-table-after" data-kind="blank" data-from="${block.to}" data-to="${block.to}"${editableAttribute} spellcheck="${this._sourceTextarea?.spellcheck ? "true" : "false"}" aria-label="After table"><br></div>`
      : "";
    return `<div class="md-table-block" part="table" data-kind="table" data-from="${block.from}" data-to="${block.to}"><table class="md-table">${header}${body}</table></div>${afterAnchor}`;
  }
}
