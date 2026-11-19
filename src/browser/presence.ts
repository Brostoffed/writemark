import type { RemoteCursor, RemoteCursorOptions, RemoteCursorUpdate, RemoteCursorResult, RemoteCursorFailureReason, TextChange, EditorMode } from "../types.ts";
import type { DomPosition } from "./types.ts";
import { mapTransactionSelection } from "../core/transactions.ts";
import { PresenceGeometry, type PresenceMeasurement } from "./presence-geometry.ts";

export interface PresenceHooks {
  host: HTMLElement;
  shell: HTMLElement;
  source: HTMLTextAreaElement;
  live: HTMLElement;
  getMode(): EditorMode;
  getValue(): string;
  getRevision(): number;
  domPositionFromSource(offset: number): DomPosition | null;
}

type Rect = { left: number; top: number; width: number; height: number };
type Motion = { from: number; to: number; started: number };
type Entry = {
  data: RemoteCursor;
  wire: RemoteCursor;
  cursor: HTMLDivElement;
  caret: HTMLDivElement;
  label: HTMLSpanElement;
  rosterItem: HTMLLIElement;
  selections: HTMLDivElement[];
  changedAt: number;
  expiresAt: number;
  anchorGeneration: number;
  measurement: PresenceMeasurement | null;
  x: number;
  y: number;
  motion: Motion | null;
  logicalRow: number;
  labelWidth: number;
  labelHeight: number;
};
type Tombstone = { wire: RemoteCursor; removedAt: number };
export type PresenceAnchorSnapshot = readonly { id: string; anchor: number; head: number; generation: number }[];

const labelLifetime = 1600;
const motionDuration = 90;
const defaultTtl = 30000;
const maximumTtl = 300000;
const tombstoneLifetime = 300000;
const tombstoneLimit = 256;

function failure(reason: RemoteCursorFailureReason, id?: string): RemoteCursorResult {
  return { ok: false, reason, ...(id === undefined ? {} : { id }) };
}

function validId(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value);
}

type CursorBatch = { ok: true; cursors: RemoteCursor[] } | { ok: false; reason: RemoteCursorFailureReason; id?: string };
function parseCursorBatch(input: unknown, length: number): CursorBatch {
  try {
    if (!Array.isArray(input)) return { ok: false, reason: "invalid-cursor" };
    const items: readonly unknown[] = input;
    const count = items.length;
    if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return { ok: false, reason: "invalid-cursor" };
    if (count > 64) return { ok: false, reason: "capacity-exceeded" };
    const ids = new Set<string>();
    const result: RemoteCursor[] = [];
    for (let index = 0; index < count; index++) {
      const item = items[index];
      if (!item || typeof item !== "object") return { ok: false, reason: "invalid-cursor" };
      const value = item as Record<string, unknown>;
      const { id, name, color, anchor, head, active, epoch, sequence, ttlMs } = value;
      if (!validId(id)) return { ok: false, reason: "invalid-cursor" };
      if (ids.has(id)) return { ok: false, reason: "duplicate-id", id };
      const invalid = () => ({ ok: false as const, reason: "invalid-cursor" as const, id });
      if (typeof name !== "string" || !name.trim() || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return invalid();
      if (typeof color !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color)) return invalid();
      if (typeof anchor !== "number" || typeof head !== "number" || !Number.isSafeInteger(anchor) || !Number.isSafeInteger(head) || anchor < 0 || head < 0 || anchor > length || head > length) return invalid();
      if (active !== undefined && typeof active !== "boolean") return invalid();
      if ((epoch === undefined) !== (sequence === undefined)) return invalid();
      if (epoch !== undefined && (typeof epoch !== "number" || !Number.isSafeInteger(epoch) || epoch < 0 || typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 0)) return invalid();
      if (ttlMs !== undefined && (typeof ttlMs !== "number" || !Number.isSafeInteger(ttlMs) || ttlMs < 0 || ttlMs > maximumTtl)) return invalid();
      ids.add(id);
      result.push({ id, name, color, anchor, head, ...(active === undefined ? {} : { active }), ...(epoch === undefined ? {} : { epoch: epoch as number, sequence: sequence as number }), ...(ttlMs === undefined ? {} : { ttlMs: ttlMs as number }) });
    }
    if (items.length !== count) return { ok: false, reason: "invalid-cursor" };
    return { ok: true, cursors: result };
  } catch { return { ok: false, reason: "invalid-cursor" }; }
}

/** Copy a bounded presence batch without trusting its runtime shape. */
export function validateRemoteCursors(input: unknown, length: number): RemoteCursor[] | null {
  const result = parseCursorBatch(input, length);
  return result.ok ? result.cursors : null;
}

function sameContent(a: RemoteCursor, b: RemoteCursor): boolean {
  return a.id === b.id && a.name === b.name && a.color === b.color && a.anchor === b.anchor && a.head === b.head && (a.active !== false) === (b.active !== false) && (a.ttlMs ?? defaultTtl) === (b.ttlMs ?? defaultTtl);
}

function sameVersion(a: RemoteCursor, b: RemoteCursor): boolean {
  return a.epoch === b.epoch && a.sequence === b.sequence;
}

function orderCursor(cursor: RemoteCursor, reference: RemoteCursor, removed: boolean): RemoteCursorFailureReason | null {
  if (reference.epoch === undefined) return null;
  if (cursor.epoch === undefined || cursor.sequence === undefined) return "stale-cursor";
  const order = cursor.epoch - reference.epoch || cursor.sequence - (reference.sequence ?? 0);
  if (order < 0 || order === 0 && removed) return "stale-cursor";
  if (order === 0 && !sameContent(cursor, reference)) return "version-conflict";
  return null;
}

/** Preserve the directed endpoints while canonical edits move the range. */
export function mapRemoteCursors(cursors: readonly RemoteCursor[], changes: readonly TextChange[], length: number): RemoteCursor[] {
  return cursors.map(cursor => {
    const backward = cursor.anchor > cursor.head;
    const mapped = mapTransactionSelection({
      start: Math.min(cursor.anchor, cursor.head), end: Math.max(cursor.anchor, cursor.head),
      direction: backward ? "backward" : cursor.anchor === cursor.head ? "none" : "forward"
    }, changes);
    const start = Math.min(length, Math.max(0, mapped.start));
    const end = Math.min(length, Math.max(0, mapped.end));
    return { ...cursor, anchor: backward ? end : start, head: backward ? start : end };
  });
}

/** Evaluate cubic-bezier(0.2, 0, 0, 1) without overshoot. */
export function presenceEase(progress: number): number {
  const x = Math.min(1, Math.max(0, progress));
  if (x === 0 || x === 1) return x;
  let lower = 0;
  let upper = 1;
  for (let index = 0; index < 18; index++) {
    const t = (lower + upper) / 2;
    const curveX = 0.6 * (1 - t) * (1 - t) * t + t * t * t;
    if (curveX < x) lower = t;
    else upper = t;
  }
  const t = (lower + upper) / 2;
  return 3 * (1 - t) * t * t + t * t * t;
}

/** Select the higher contrast label color for a validated hex color. */
export function presenceLabelForeground(color: string): string {
  const digits = color.length === 4 ? color.slice(1).split("").map(character => character + character).join("") : color.slice(1);
  const channel = (offset: number) => {
    const value = Number.parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}

function sameViewport(a: Rect, b: Rect) {
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

function overlap(a: Rect, b: Rect) {
  return a.left < b.left + b.width + 4 && a.left + a.width + 4 > b.left && a.top < b.top + b.height + 2 && a.top + a.height + 2 > b.top;
}

export class PresenceController {
  private geometry: PresenceGeometry;
  private geometryStopped = false;
  private readonly hooks: PresenceHooks;
  private readonly overlay: HTMLDivElement;
  private readonly roster: HTMLUListElement;
  private readonly entries = new Map<string, Entry>();
  private readonly tombstones = new Map<string, Tombstone>();
  private readonly view: Window;
  private readonly reducedMotion: MediaQueryList;
  private readonly cleanups: (() => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private frame: number | null = null;
  private layoutFrame: number | null = null;
  private fadeTimer: number | null = null;
  private expiryTimer: number | null = null;
  private connected = false;
  private lastMode = "";
  private generation = 0;
  private anchorClock = 0;
  private showNames = false;
  private hovered: string | null = null;
  private lineValue: string | null = null;
  private lineStarts: number[] = [0];

  constructor(hooks: PresenceHooks) {
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

  set(cursors: readonly RemoteCursor[], options: RemoteCursorOptions = {}): boolean {
    return this.apply(() => {
      if (!options || typeof options !== "object" || Array.isArray(options)) return null;
      return { cursors, replace: true, baseRevision: options.baseRevision, animate: options.animate, showNames: options.showNames };
    }).ok;
  }

  update(update: RemoteCursorUpdate): RemoteCursorResult { return this.apply(() => update); }

  private apply(read: () => unknown): RemoteCursorResult {
    const revision = this.hooks.getRevision();
    const generation = this.generation;
    const length = this.hooks.getValue().length;
    let parsed: CursorBatch = { ok: false, reason: "invalid-update" };
    let remove: string[] = [];
    let replace: unknown;
    let baseRevision: unknown;
    let animate: unknown;
    let showNames: unknown;
    let invalid: RemoteCursorResult | null = null;
    try {
      const input = read();
      if (!input || typeof input !== "object" || Array.isArray(input)) invalid = failure("invalid-update");
      else {
        const value = input as Record<string, unknown>;
        const cursors = value.cursors;
        const removals = value.remove;
        replace = value.replace;
        baseRevision = value.baseRevision;
        animate = value.animate;
        showNames = value.showNames;
        parsed = parseCursorBatch(cursors, Number.MAX_SAFE_INTEGER);
        if (removals !== undefined) {
          if (!Array.isArray(removals)) invalid = failure("invalid-remove");
          else {
            const ids: readonly unknown[] = removals;
            const count = ids.length;
            if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0 || count > 64) invalid = failure("invalid-remove");
            else {
              const seen = new Set<string>();
              for (let index = 0; index < count; index++) {
                const id = ids[index];
                if (!validId(id) || seen.has(id)) { invalid = failure("invalid-remove", typeof id === "string" ? id : undefined); break; }
                seen.add(id);
                remove.push(id);
              }
              if (ids.length !== count) invalid = failure("invalid-remove");
            }
          }
        }
      }
    } catch { invalid = failure("invalid-update"); }
    if (this.generation !== generation || this.hooks.getRevision() !== revision) return failure("reentrant-change");
    if (invalid) return invalid;
    if (!parsed.ok) return failure(parsed.reason, parsed.id);
    if (replace !== undefined && typeof replace !== "boolean" || animate !== undefined && typeof animate !== "boolean" || showNames !== undefined && typeof showNames !== "boolean") return failure("invalid-update");
    if (baseRevision !== undefined && (typeof baseRevision !== "number" || !Number.isSafeInteger(baseRevision) || baseRevision < 0)) return failure("invalid-update");
    if (baseRevision !== undefined && baseRevision !== revision) return failure("stale-revision");
    if (!this.hooks.host.isConnected) return failure("not-connected");
    const now = this.now();
    const incoming = parsed.cursors;
    const ids = new Set(incoming.map(cursor => cursor.id));
    for (const id of remove) if (ids.has(id)) return failure("invalid-update", id);
    let count = replace ? 0 : Array.from(this.entries.values()).filter(entry => entry.expiresAt > now && !remove.includes(entry.data.id)).length;
    for (const cursor of incoming) {
      const current = this.entries.get(cursor.id);
      const tombstone = this.tombstones.get(cursor.id);
      const expired = Boolean(current && current.expiresAt <= now);
      const reference = (current && (!expired || now - current.expiresAt < tombstoneLifetime) ? current.wire : null) ?? (tombstone && now - tombstone.removedAt < tombstoneLifetime ? tombstone.wire : null);
      if (reference) {
        const reason = orderCursor(cursor, reference, expired || !current);
        if (reason) return failure(reason, cursor.id);
      }
      const heartbeat = cursor.epoch !== undefined && current && !expired && sameVersion(cursor, current.wire) && sameContent(cursor, current.wire);
      if ((cursor.anchor > length || cursor.head > length) && !heartbeat) return failure("invalid-cursor", cursor.id);
      if (replace || !current || expired || remove.includes(cursor.id)) count += 1;
    }
    if (count > 64) return failure("capacity-exceeded");
    this.generation += 1;
    this.pruneTombstones(now);
    let changed = this.expireEntries(now);
    let moved = false;
    for (const [id] of this.entries) {
      if (remove.includes(id) || replace === true && !ids.has(id)) { this.removeEntry(id, now); changed = true; }
    }
    for (const cursor of incoming) {
      const current = this.entries.get(cursor.id);
      if (!current) {
        this.tombstones.delete(cursor.id);
        this.entries.set(cursor.id, this.createEntry(cursor, now));
        changed = true;
        moved = true;
      } else {
        const heartbeat = cursor.epoch !== undefined && sameVersion(cursor, current.wire) && sameContent(cursor, current.wire);
        current.expiresAt = this.expiry(cursor, now);
        if (heartbeat) {
          current.data = { ...cursor, anchor: current.data.anchor, head: current.data.head };
          current.wire = { ...cursor };
          continue;
        }
        const positionChanged = current.data.anchor !== cursor.anchor || current.data.head !== cursor.head;
        if (positionChanged && this.hovered === cursor.id) this.hovered = null;
        const nameChanged = current.data.name !== cursor.name;
        const identityChanged = nameChanged || current.data.color !== cursor.color;
        const activeChanged = (current.data.active !== false) !== (cursor.active !== false);
        const revealed = current.data.active === false && cursor.active !== false || identityChanged;
        if (positionChanged || !sameVersion(cursor, current.wire)) current.anchorGeneration = ++this.anchorClock;
        if (positionChanged || revealed) { current.changedAt = now; moved = true; }
        changed = changed || positionChanged || identityChanged || activeChanged;
        current.data = { ...cursor };
        current.wire = { ...cursor };
        if (nameChanged || activeChanged) current.rosterItem.textContent = cursor.name + (cursor.active === false ? " (inactive)" : "");
      }
    }
    const namesChanged = showNames !== undefined && showNames !== this.showNames;
    if (typeof showNames === "boolean") this.showNames = showNames;
    if (!this.entries.size) { this.disconnect(); return { ok: true, count: 0 }; }
    if (!this.connected) this.connect();
    else if (changed) this.refresh(moved && animate !== false);
    else if (namesChanged) { this.paint(now); this.armFade(now); }
    this.armExpiry(now);
    return { ok: true, count: this.entries.size };
  }

  get(): RemoteCursor[] {
    if (this.expireEntries(this.now()) && this.entries.size) this.scheduleLayout();
    return Array.from(this.entries.values(), entry => ({ ...entry.data }));
  }

  captureAnchors(): PresenceAnchorSnapshot {
    return Array.from(this.entries.values(), entry => ({ id: entry.data.id, anchor: entry.data.anchor, head: entry.data.head, generation: entry.anchorGeneration }));
  }

  restoreAnchors(snapshot: PresenceAnchorSnapshot): void {
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

  mapChanges(changes: readonly TextChange[]): void {
    this.generation += 1;
    const mapped = mapRemoteCursors(Array.from(this.entries.values(), entry => entry.data), changes, this.hooks.getValue().length);
    for (const cursor of mapped) {
      const entry = this.entries.get(cursor.id);
      if (entry) {
        if (this.hovered === cursor.id && (entry.data.anchor !== cursor.anchor || entry.data.head !== cursor.head)) this.hovered = null;
        entry.data = cursor;
        entry.motion = null;
      }
    }
  }

  connect(): void {
    if (this.connected || !this.entries.size || !this.hooks.host.isConnected) return;
    this.expireEntries(this.now());
    if (!this.entries.size) return;
    this.connected = true;
    if (this.geometryStopped) { this.geometry = new PresenceGeometry(this.hooks); this.geometryStopped = false; }
    this.hooks.shell.append(this.overlay, this.roster);
    const schedule = () => this.scheduleLayout();
    const listen = (target: EventTarget, type: string, callback: EventListener, capture = false) => {
      target.addEventListener(type, callback, capture);
      this.cleanups.push(() => target.removeEventListener(type, callback, capture));
    };
    const doc = this.hooks.host.ownerDocument;
    listen(this.hooks.shell, "scroll", schedule, true);
    listen(doc, "scroll", schedule, true);
    listen(this.view, "scroll", schedule, true);
    listen(this.view, "resize", schedule);
    listen(doc.fonts, "loadingdone", schedule);
    listen(doc, "visibilitychange", () => {
      if (!doc.hidden) { schedule(); return; }
      this.stopMotion();
      if (this.layoutFrame !== null) this.view.cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = null;
    });
    listen(this.reducedMotion, "change", schedule);
    listen(this.hooks.shell, "pointermove", event => this.hover(event as PointerEvent));
    listen(this.hooks.shell, "pointerleave", () => { if (this.hovered !== null) { this.hovered = null; this.paint(this.now()); } });
    if (this.view.visualViewport) {
      listen(this.view.visualViewport, "resize", schedule);
      listen(this.view.visualViewport, "scroll", schedule);
    }
    this.resizeObserver = new ResizeObserver(schedule);
    for (const node of [this.hooks.shell, this.hooks.source, this.hooks.live]) this.resizeObserver.observe(node);
    this.mutationObserver = new MutationObserver(schedule);
    this.mutationObserver.observe(this.hooks.live, { childList: true, subtree: true, characterData: true });
    this.mutationObserver.observe(this.hooks.host, { attributes: true, attributeFilter: ["mode", "class", "style", "disabled", "hidden", "dir"] });
    for (let ancestor: Node | null = this.hooks.host.parentNode; ancestor; ancestor = ancestor.parentNode ?? (ancestor instanceof ShadowRoot ? ancestor.host : null)) {
      listen(ancestor, "scroll", schedule, true);
      if (ancestor instanceof Element) {
        this.resizeObserver.observe(ancestor);
        this.mutationObserver.observe(ancestor, { attributes: true, attributeFilter: ["class", "style", "hidden", "dir"] });
      }
    }
    this.refresh(false);
    this.armExpiry(this.now());
  }

  disconnect(): void {
    this.connected = false;
    this.geometry.disconnect();
    this.geometryStopped = true;
    this.cleanups.splice(0).forEach(cleanup => cleanup());
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

  refresh(animate = false): void {
    if (!this.connected) return;
    const now = this.now();
    this.expireEntries(now);
    if (!this.entries.size) return;
    const layoutPending = this.layoutFrame !== null;
    if (this.layoutFrame !== null) this.view.cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = null;
    const mode = this.hooks.getMode();
    const mayAnimate = animate && !layoutPending && !this.reducedMotion.matches && this.lastMode === mode;
    this.lastMode = mode;
    const entries = Array.from(this.entries.values());
    const measurements = this.geometry.measureBatch(entries.map(entry => entry.data));
    const labelMetrics: Entry[] = [];
    this.indexLines(this.hooks.getValue());
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index]!;
      this.advance(entry, now);
      const previous = entry.measurement;
      const measurement = measurements[index] ?? null;
      entry.measurement = measurement;
      const caret = measurement?.caret;
      if (this.hovered === entry.data.id && (!caret || !previous?.caret || Math.abs(caret.left - previous.caret.left) > 0.5 || Math.abs(caret.top - previous.caret.top) > 0.5 || measurement && !sameViewport(previous.viewport, measurement.viewport))) this.hovered = null;
      entry.cursor.hidden = !caret;
      const color = entry.data.color.length === 4 ? "#" + entry.data.color.slice(1).split("").map(character => character + character).join("") : entry.data.color;
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
      if (mayAnimate && sameRow && distance > 0.5 && distance < 100) entry.motion = { from: entry.x, to: caret.left, started: now };
      else { entry.x = caret.left; entry.motion = null; }
    }
    for (const entry of labelMetrics) {
      entry.labelWidth = entry.label.offsetWidth || 100;
      entry.labelHeight = entry.label.offsetHeight || 19;
    }
    this.paint(now);
    this.armFade(now);
    this.armFrame();
  }

  private now() { return this.view.performance.now(); }
  private expiry(cursor: RemoteCursor, now: number) { return cursor.ttlMs === 0 ? Infinity : now + (cursor.ttlMs ?? defaultTtl); }

  private createEntry(data: RemoteCursor, now: number): Entry {
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
    return { data: { ...data }, wire: { ...data }, cursor, caret, label, rosterItem, selections: [], changedAt: now, expiresAt: this.expiry(data, now), anchorGeneration: ++this.anchorClock, measurement: null, x: 0, y: 0, motion: null, logicalRow: -1, labelWidth: 100, labelHeight: 19 };
  }

  private syncSelections(entry: Entry, rectangles: readonly Rect[], color: string, previous?: readonly Rect[]): void {
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

  private indexLines(value: string): void {
    if (value === this.lineValue) return;
    this.lineValue = value;
    this.lineStarts = [0];
    for (let offset = value.indexOf("\n"); offset !== -1; offset = value.indexOf("\n", offset + 1)) this.lineStarts.push(offset + 1);
  }

  private logicalRow(offset: number): number {
    let lower = 0;
    let upper = this.lineStarts.length;
    while (lower < upper) {
      const middle = (lower + upper) >>> 1;
      if (this.lineStarts[middle]! <= offset) lower = middle + 1;
      else upper = middle;
    }
    return lower;
  }

  private advance(entry: Entry, now: number): void {
    if (!entry.motion) return;
    const progress = (now - entry.motion.started) / motionDuration;
    entry.x = entry.motion.from + (entry.motion.to - entry.motion.from) * presenceEase(progress);
    if (progress >= 1) { entry.x = entry.motion.to; entry.motion = null; }
  }

  private paint(now: number): void {
    const occupied: Rect[] = [];
    const sorted = Array.from(this.entries.values()).sort((a, b) => Number(b.data.id === this.hovered) - Number(a.data.id === this.hovered) || Number(a.data.active === false) - Number(b.data.active === false) || (a.data.id < b.data.id ? -1 : a.data.id > b.data.id ? 1 : 0));
    for (const entry of sorted) {
      const measured = entry.measurement;
      if (!measured?.caret) continue;
      this.advance(entry, now);
      entry.cursor.style.transform = `translate3d(${entry.x}px, ${entry.y}px, 0)`;
      const visible = this.showNames || this.hovered === entry.data.id || entry.data.active !== false && now - entry.changedAt < labelLifetime;
      const width = Math.min(measured.viewport.width, entry.labelWidth);
      const height = Math.min(measured.viewport.height, entry.labelHeight);
      const left = Math.max(measured.viewport.left, Math.min(entry.x, measured.viewport.left + measured.viewport.width - width));
      let chosen: Rect | null = null;
      if (visible && width > 0 && height > 0) {
        for (let lane = 0; lane < 4; lane++) {
          const top = Math.max(measured.viewport.top, entry.y - height - 2 - lane * (height + 2));
          const candidate = { left, top, width, height };
          if (top + height <= measured.viewport.top + measured.viewport.height && !occupied.some(rect => overlap(rect, candidate))) { chosen = candidate; break; }
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

  private hover(event: PointerEvent): void {
    const bounds = this.hooks.shell.getBoundingClientRect();
    const scaleX = bounds.width ? this.hooks.shell.offsetWidth / bounds.width : 1;
    const scaleY = bounds.height ? this.hooks.shell.offsetHeight / bounds.height : 1;
    const x = (event.clientX - bounds.left) * scaleX;
    const y = (event.clientY - bounds.top) * scaleY;
    let found: string | null = null;
    let nearest = Infinity;
    for (const entry of this.entries.values()) {
      const caret = entry.measurement?.caret;
      if (!caret) continue;
      const distance = Math.abs(x - entry.x);
      if (distance <= 7 && y >= entry.y - 4 && y <= entry.y + caret.height + 4 && distance < nearest) { nearest = distance; found = entry.data.id; }
    }
    if (found === this.hovered) return;
    this.hovered = found;
    this.paint(this.now());
  }

  private armFrame(): void {
    if (this.frame !== null || !this.connected || !Array.from(this.entries.values()).some(entry => entry.motion)) return;
    this.frame = this.view.requestAnimationFrame(() => { this.frame = null; this.paint(this.now()); this.armFrame(); });
  }

  private armFade(now: number): void {
    if (this.fadeTimer !== null) this.view.clearTimeout(this.fadeTimer);
    this.fadeTimer = null;
    if (this.showNames) return;
    const remaining = Array.from(this.entries.values()).filter(entry => entry.data.active !== false).map(entry => entry.changedAt + labelLifetime - now).filter(delay => delay > 0);
    if (!remaining.length) return;
    this.fadeTimer = this.view.setTimeout(() => { this.fadeTimer = null; this.paint(this.now()); this.armFade(this.now()); }, Math.min(...remaining) + 1);
  }

  private armExpiry(now: number): void {
    if (this.expiryTimer !== null) this.view.clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (!this.connected) return;
    const remaining = Array.from(this.entries.values()).map(entry => entry.expiresAt - now).filter(Number.isFinite);
    if (!remaining.length) return;
    this.expiryTimer = this.view.setTimeout(() => { this.expiryTimer = null; const changed = this.expireEntries(this.now()); if (changed && this.entries.size) this.refresh(false); this.armExpiry(this.now()); }, Math.max(0, Math.min(...remaining)) + 1);
  }

  private removeEntry(id: string, now: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.wire.epoch !== undefined) {
      this.tombstones.delete(id);
      this.tombstones.set(id, { wire: { ...entry.wire }, removedAt: now });
    }
    entry.cursor.remove();
    entry.rosterItem.remove();
    entry.selections.forEach(rectangle => rectangle.remove());
    this.entries.delete(id);
    if (this.hovered === id) this.hovered = null;
    this.pruneTombstones(now);
  }

  private pruneTombstones(now: number): void {
    for (const [id, tombstone] of this.tombstones) if (now - tombstone.removedAt >= tombstoneLifetime) this.tombstones.delete(id);
    while (this.tombstones.size > tombstoneLimit) {
      const oldest = this.tombstones.keys().next().value;
      if (oldest === undefined) break;
      this.tombstones.delete(oldest);
    }
  }

  private expireEntries(now: number): boolean {
    let changed = false;
    for (const [id, entry] of this.entries) if (entry.expiresAt <= now) { this.removeEntry(id, Math.min(now, entry.expiresAt)); changed = true; }
    if (!changed) return false;
    this.generation += 1;
    if (!this.entries.size) this.disconnect();
    return true;
  }

  private stopMotion(): void {
    if (this.frame !== null) this.view.cancelAnimationFrame(this.frame);
    this.frame = null;
    for (const entry of this.entries.values()) entry.motion = null;
  }

  private scheduleLayout(): void {
    if (!this.connected) return;
    this.stopMotion();
    this.hovered = null;
    if (this.layoutFrame !== null) return;
    this.layoutFrame = this.view.requestAnimationFrame(() => { this.layoutFrame = null; this.refresh(false); });
  }
}
