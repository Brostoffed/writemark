import type { EditorMode } from "../types.ts";
import type { DomPosition } from "./types.ts";

export interface PresenceRectangle {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PresenceMeasurement {
    caret: PresenceRectangle | null;
    selection: PresenceRectangle[];
    viewport: PresenceRectangle;
}

export interface PresenceGeometryOptions {
    host: HTMLElement;
    shell: HTMLElement;
    source: HTMLTextAreaElement;
    live: HTMLElement;
    getMode(): EditorMode;
    getValue(): string;
    domPositionFromSource(offset: number): DomPosition | null;
}

const mirrorProperties = [
    "font-family", "font-size", "font-weight", "font-style", "font-stretch", "font-variant",
    "font-kerning", "font-feature-settings", "font-variation-settings", "line-height", "letter-spacing",
    "word-spacing", "text-align", "text-indent", "text-transform", "text-rendering", "direction", "unicode-bidi",
    "tab-size", "padding-top", "padding-right", "padding-bottom", "padding-left", "word-break",
    "overflow-wrap", "white-space", "writing-mode"
] as const;
const longRangeLength = 1024;

function intersect(a: PresenceRectangle, b: PresenceRectangle): PresenceRectangle | null {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.left + a.width, b.left + b.width);
    const bottom = Math.min(a.top + a.height, b.top + b.height);
    return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}

interface OffsetRange { from: number; to: number }
interface MountedEditable extends OffsetRange {
    element: HTMLElement;
    spansViewport: boolean;
    visibleOffsets: OffsetRange | null | undefined;
    selections: Map<string, PresenceRectangle[]>;
}

interface SourceGeometry {
    text: Text;
    end: HTMLElement;
    horizontal: boolean;
    visibleOffsets: OffsetRange | null | undefined;
    selections: Map<string, PresenceRectangle[]>;
    translate(rect: DOMRect): PresenceRectangle;
}

interface PreparedGeometry {
    value: string;
    viewport: PresenceRectangle;
    relative(rect: PresenceRectangle): PresenceRectangle;
    range: Range;
    source: SourceGeometry | null;
    editables: MountedEditable[];
    positions: Map<number, DomPosition | null>;
    carets: Map<number, PresenceRectangle | null>;
}

function firstCaretRect(range: Range): DOMRect | undefined {
    for (const rect of range.getClientRects()) {
        if (rect.height > 0) return rect;
    }
    return undefined;
}

function visibleSelectionRects(
    range: Range,
    viewport: PresenceRectangle,
    translate?: SourceGeometry["translate"]
): PresenceRectangle[] {
    const selection: PresenceRectangle[] = [];
    for (const bounds of range.getClientRects()) {
        const clipped = intersect(translate ? translate(bounds) : bounds, viewport);
        if (clipped) selection.push(clipped);
    }
    return selection;
}

function visibleOffsetWindow(
    viewport: PresenceRectangle,
    offsets: OffsetRange,
    rectAt: (offset: number) => PresenceRectangle | null
): OffsetRange | null {
    // Retain an extra viewport on each side so cuts stay outside visible rows.
    const { top, height } = viewport;
    const findOffset = (atOrAfter: (rect: PresenceRectangle) => boolean) => {
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
    };
    const from = findOffset(rect => rect.top + rect.height >= top - height);
    const to = findOffset(rect => rect.top >= top + 2 * height);
    return from === null || to === null ? null : { from, to };
}

/** Measure remote selections without changing the local selection. */
export class PresenceGeometry {
    private readonly options: PresenceGeometryOptions;
    private mirror: HTMLDivElement | null = null;
    private mirrorText: Text | null = null;
    private mirrorEnd: HTMLSpanElement | null = null;
    private mirrorStyle = "";
    private stopped = false;

    constructor(options: PresenceGeometryOptions) { this.options = options; }

    disconnect(): void {
        this.stopped = true;
        this.mirror?.remove();
        this.mirror = null;
        this.mirrorText = null;
        this.mirrorEnd = null;
    }

    measure(anchor: number, head: number): PresenceMeasurement | null {
        return this.measureBatch([{ anchor, head }])[0] ?? null;
    }

    measureBatch(cursors: readonly { anchor: number; head: number }[]): (PresenceMeasurement | null)[] {
        if (!cursors.length) return [];
        const prepared = this.prepare();
        const source = prepared?.source;
        if (prepared && source && prepared.value.length > longRangeLength &&
            (cursors.length > 16 || cursors.some(cursor => Math.abs(cursor.head - cursor.anchor) > longRangeLength))) {
            this.sourceVisibleOffsets(prepared, source);
        }
        return cursors.map(cursor => prepared ? this.measurePrepared(prepared, cursor.anchor, cursor.head) : null);
    }

    private prepare(): PreparedGeometry | null {
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
        let ancestor: HTMLElement | undefined = surface.parentElement ?? ((surface.getRootNode() as ShadowRoot).host as HTMLElement | undefined);
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
            ancestor = ancestor.parentElement ?? ((ancestor.getRootNode() as ShadowRoot).host as HTMLElement | undefined);
        }
        if (!viewport) return null;
        const value = getValue();
        const sourceGeometry = surface === source ? this.prepareSource(value, bounds, scaleX, scaleY) : null;
        if (surface === source && !sourceGeometry) return null;
        const editables: MountedEditable[] = [];
        if (surface === live) {
            // Leave room for glyphs that extend past their editable's box.
            const top = viewport.top - viewport.height;
            const bottom = viewport.top + 2 * viewport.height;
            for (const element of live.querySelectorAll<HTMLElement>("[data-editable]")) {
                const from = Number(element.dataset.from);
                const to = Number(element.dataset.to);
                if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from) continue;
                const rect = element.getBoundingClientRect();
                if (rect.bottom >= top && rect.top <= bottom && (rect.width || rect.height)) {
                    editables.push({
                        element, from, to, spansViewport: rect.height > 3 * viewport.height,
                        visibleOffsets: undefined, selections: new Map<string, PresenceRectangle[]>()
                    });
                }
            }
        }
        return {
            value, viewport, source: sourceGeometry, editables,
            range: host.ownerDocument.createRange(),
            positions: new Map<number, DomPosition | null>(),
            carets: new Map<number, PresenceRectangle | null>(),
            relative: rect => ({ left: (rect.left - shellBounds.left) / shellScaleX, top: (rect.top - shellBounds.top) / shellScaleY, width: rect.width / shellScaleX, height: rect.height / shellScaleY })
        };
    }

    private measurePrepared(prepared: PreparedGeometry, anchor: number, head: number): PresenceMeasurement | null {
        if (!Number.isSafeInteger(anchor) || !Number.isSafeInteger(head) || anchor < 0 || head < 0 || anchor > prepared.value.length || head > prepared.value.length) return null;
        const source = prepared.source;
        const visible = source?.visibleOffsets;
        let bounds: PresenceRectangle | null = null;
        if (!source) bounds = this.liveCaret(prepared, head);
        else if (!visible || (head >= visible.from && head <= visible.to)) bounds = this.sourceCaret(prepared, source, head);
        const caret = bounds ? intersect({ left: bounds.left, top: bounds.top, width: Math.max(1, bounds.width), height: bounds.height }, prepared.viewport) : null;
        const from = Math.min(anchor, head);
        const to = Math.max(anchor, head);
        const selection = from === to ? [] : source
            ? this.sourceSelection(prepared, source, from, to)
            : this.liveSelection(prepared, from, to);
        if (!caret && !selection.length) return null;
        return { caret: caret ? prepared.relative(caret) : null, selection: selection.map(prepared.relative), viewport: prepared.relative(prepared.viewport) };
    }

    private prepareSource(value: string, sourceBounds: DOMRect, scaleX: number, scaleY: number): PreparedGeometry["source"] {
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
            this.mirrorEnd.textContent = "\u200b";
            this.mirror.append(this.mirrorText, this.mirrorEnd);
            doc.body.append(this.mirror);
        }
        const mirror = this.mirror;
        const text = this.mirrorText;
        const end = this.mirrorEnd;
        if (!text || !end) return null;
        const style = view.getComputedStyle(source);
        const signature = [source.clientWidth, source.wrap, ...mirrorProperties.map(property => style.getPropertyValue(property))].join("\u0001");
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
            text, end, horizontal: style.writingMode === "horizontal-tb", visibleOffsets: undefined,
            selections: new Map<string, PresenceRectangle[]>(),
            translate: rect => ({
                left: left + (rect.left - mirrorBounds.left) / mirrorScaleX * scaleX,
                top: top + (rect.top - mirrorBounds.top) / mirrorScaleY * scaleY,
                width: rect.width / mirrorScaleX * scaleX,
                height: rect.height / mirrorScaleY * scaleY
            })
        };
    }

    private sourceCaret(prepared: PreparedGeometry, source: SourceGeometry, offset: number): PresenceRectangle | null {
        const previous = prepared.carets.get(offset);
        if (previous !== undefined) return previous;
        prepared.range.setStart(source.text, offset);
        prepared.range.collapse(true);
        const bounds = offset === prepared.value.length ? source.end.getBoundingClientRect() : firstCaretRect(prepared.range);
        const caret = bounds && bounds.height > 0 ? source.translate(bounds) : null;
        prepared.carets.set(offset, caret);
        return caret;
    }

    private sourceVisibleOffsets(prepared: PreparedGeometry, source: SourceGeometry): OffsetRange | null {
        if (source.visibleOffsets !== undefined) return source.visibleOffsets;
        if (!source.horizontal) {
            source.visibleOffsets = null;
            return null;
        }
        // A horizontal mirror lays out offsets in visual row order.
        source.visibleOffsets = visibleOffsetWindow(prepared.viewport, { from: 0, to: prepared.value.length },
            offset => this.sourceCaret(prepared, source, offset) ?? this.sourceRow(prepared.range, source, offset));
        return source.visibleOffsets;
    }

    private sourceRow(range: Range, source: SourceGeometry, offset: number): PresenceRectangle | null {
        // Some browsers omit a collapsed range at a line break.
        range.setStart(source.text, offset);
        range.setEnd(source.text, offset + 1);
        const bounds = firstCaretRect(range);
        return bounds ? source.translate(bounds) : null;
    }

    private sourceSelection(prepared: PreparedGeometry, source: SourceGeometry, from: number, to: number): PresenceRectangle[] {
        if (source.visibleOffsets) {
            from = Math.max(from, source.visibleOffsets.from);
            to = Math.min(to, source.visibleOffsets.to);
        }
        if (to <= from) return [];
        const key = `${from}:${to}`;
        const previous = source.selections.get(key);
        if (previous !== undefined) return previous;
        prepared.range.setStart(source.text, from);
        prepared.range.setEnd(source.text, to);
        const selection = visibleSelectionRects(prepared.range, prepared.viewport, source.translate);
        source.selections.set(key, selection);
        return selection;
    }

    private position(prepared: PreparedGeometry, offset: number, editable?: MountedEditable): DomPosition | null {
        const mounted = editable ?? prepared.editables.find(item => {
            const offsets = item.visibleOffsets ?? item;
            return offset >= offsets.from && offset <= offsets.to;
        });
        if (!mounted) return null;
        let position = prepared.positions.get(offset);
        if (position === undefined) {
            position = this.options.domPositionFromSource(offset);
            prepared.positions.set(offset, position);
        }
        if (position && position.node.isConnected && this.options.live.contains(position.node) && (!editable || editable.element.contains(position.node))) return position;
        if (editable && (offset === editable.from || offset === editable.to)) {
            return { node: editable.element, offset: offset === editable.from ? 0 : editable.element.childNodes.length, editable: editable.element };
        }
        return null;
    }

    private liveCaret(prepared: PreparedGeometry, head: number): PresenceRectangle | null {
        const previous = prepared.carets.get(head);
        if (previous !== undefined) return previous;
        const focus = this.position(prepared, head);
        let caret: PresenceRectangle | null = null;
        if (focus) {
            let bounds = this.collapsedLiveRect(prepared.range, focus);
            if (!bounds && !focus.editable.textContent) bounds = focus.editable.querySelector("br")?.getBoundingClientRect() ?? null;
            if (bounds && bounds.height > 0) caret = bounds;
        }
        prepared.carets.set(head, caret);
        return caret;
    }

    private liveSelection(prepared: PreparedGeometry, from: number, to: number): PresenceRectangle[] {
        const selection: PresenceRectangle[] = [];
        const seen = new Set<string>();
        for (const editable of prepared.editables) {
            let start = Math.max(from, editable.from);
            let end = Math.min(to, editable.to);
            if (editable.spansViewport && end - start > longRangeLength && editable.visibleOffsets === undefined) {
                const style = editable.element.ownerDocument.defaultView?.getComputedStyle(editable.element);
                editable.visibleOffsets = style?.writingMode === "horizontal-tb"
                    ? visibleOffsetWindow(prepared.viewport, editable, offset => {
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

    private collapsedLiveRect(range: Range, position: DomPosition): DOMRect | null {
        try {
            range.setStart(position.node, position.offset);
            range.collapse(true);
            return firstCaretRect(range) ?? null;
        } catch { return null; }
    }

    private liveSelectionFragment(prepared: PreparedGeometry, editable: MountedEditable, start: number, end: number): PresenceRectangle[] {
        const key = `${start}:${end}`;
        const previous = editable.selections.get(key);
        if (previous !== undefined) return previous;
        const first = this.position(prepared, start, editable);
        const last = this.position(prepared, end, editable);
        let selection: PresenceRectangle[] = [];
        if (first && last) {
            try {
                prepared.range.setStart(first.node, first.offset);
                prepared.range.setEnd(last.node, last.offset);
                selection = visibleSelectionRects(prepared.range, prepared.viewport);
            } catch { /* A stale editable must not hide other mounted fragments. */ }
        }
        editable.selections.set(key, selection);
        return selection;
    }
}
