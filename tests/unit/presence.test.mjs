import assert from "node:assert/strict";
import { test } from "node:test";
import { PresenceController, mapRemoteCursors, presenceEase, presenceLabelForeground, validateRemoteCursors } from "../../src/browser/presence.ts";

const cursor = { id: "peer", name: "雪 <img onerror=x>", color: "#0af", anchor: 2, head: 6 };

test("presence accepts bounded text and copies each cursor", () => {
  const original = { ...cursor };
  const result = validateRemoteCursors([original], 10);
  assert.deepEqual(result, [original]);
  assert.notEqual(result[0], original);
  original.name = "changed";
  assert.equal(result[0].name, cursor.name);
  assert.deepEqual(validateRemoteCursors([], 10), []);
  assert.notEqual(validateRemoteCursors([{ ...cursor, active: false }], 10), null);
  assert.notEqual(validateRemoteCursors([{ ...cursor, name: "x".repeat(80), id: "x".repeat(128), color: "#12AbEF" }], 10), null);
});

test("presence rejects an invalid batch without a partial result", () => {
  const invalid = [
    null, {}, [{ ...cursor, id: "" }], [{ ...cursor, name: " " }],
    [{ ...cursor, id: "x".repeat(129) }], [{ ...cursor, name: "x".repeat(81) }],
    [{ ...cursor, name: "line\nbreak" }], [{ ...cursor, id: "peer\u0000" }],
    [{ ...cursor, color: "red" }], [{ ...cursor, color: "#fff;background:url(x)" }],
    [{ ...cursor, color: "#ffffffff" }], [{ ...cursor, anchor: -1 }],
    [{ ...cursor, head: 11 }], [{ ...cursor, anchor: 0.5 }],
    [{ ...cursor, anchor: Number.NaN }], [{ ...cursor, active: "true" }],
    [cursor, { ...cursor, name: "duplicate" }],
    Array.from({ length: 65 }, (_, index) => ({ ...cursor, id: String(index) })),
    [cursor, { ...cursor, id: "second", head: Infinity }],
    [{ get id() { throw new Error("getter"); } }]
  ];
  for (const value of invalid) assert.equal(validateRemoteCursors(value, 10), null);
});

test("presence mapping retains forward and backward range direction", () => {
  const source = [{ ...cursor }, { ...cursor, id: "backward", anchor: 6, head: 2 }, { ...cursor, id: "caret", anchor: 2, head: 2 }];
  const result = mapRemoteCursors(source, [{ from: 2, to: 2, insert: "😀" }], 12);
  assert.deepEqual(result.map(({ anchor, head }) => [anchor, head]), [[2, 8], [8, 2], [4, 4]]);
  assert.deepEqual(source.map(({ anchor, head }) => [anchor, head]), [[2, 6], [6, 2], [2, 2]]);
  const deleted = mapRemoteCursors(result, [{ from: 0, to: 10, insert: "" }], 2);
  assert.deepEqual(deleted.map(({ anchor, head }) => [anchor, head]), [[0, 0], [0, 0], [0, 0]]);
});

test("presence easing stays monotonic and cannot overshoot", () => {
  assert.equal(presenceEase(-1), 0);
  assert.equal(presenceEase(0), 0);
  assert.equal(presenceEase(1), 1);
  assert.equal(presenceEase(2), 1);
  let previous = 0;
  for (let index = 0; index <= 10000; index++) {
    const value = presenceEase(index / 10000);
    assert.ok(value >= previous && value >= 0 && value <= 1);
    previous = value;
  }
});


test("invalid presence options stop before DOM or controller state changes", () => {
  const fixture = controllerState();
  const invalid = [null, [], { baseRevision: 3 }, { baseRevision: -1 }, { baseRevision: 4.5 }, { baseRevision: "4" }, { animate: "true" }, { get baseRevision() { throw new Error("base getter"); } }, { get animate() { throw new Error("animate getter"); } }];
  for (const options of invalid) assert.equal(fixture.state.set([cursor], options), false);
  assert.equal(fixture.paints(), 0);
});

test("presence label text uses the higher contrast black or white", () => {
  assert.equal(presenceLabelForeground("#fff"), "#000000");
  assert.equal(presenceLabelForeground("#FFFFFF"), "#000000");
  assert.equal(presenceLabelForeground("#ffff00"), "#000000");
  assert.equal(presenceLabelForeground("#000"), "#ffffff");
  assert.equal(presenceLabelForeground("#0000ff"), "#ffffff");
});

function controllerState({ seed = true } = {}) {
  let revision = 4;
  let value = "0123456789";
  let paints = 0;
  let time = 0;
  let releases = 0;
  const state = Object.assign(Object.create(PresenceController.prototype), {
    generation: 0, anchorClock: 0, connected: true, showNames: false, hovered: null,
    hooks: { host: { isConnected: true }, getValue: () => value, getRevision: () => revision },
    entries: new Map(), tombstones: new Map(),
    now: () => time,
    refresh() { paints += 1; },
    scheduleLayout() { paints += 1; },
    armExpiry() {}, armFade() {}, paint() {},
    connect() { state.connected = true; paints += 1; },
    disconnect() { state.connected = false; releases += 1; },
    createEntry(data, now) {
      return { data: { ...data }, wire: { ...data }, changedAt: now, expiresAt: state.expiry(data, now), anchorGeneration: ++state.anchorClock, motion: null, cursor: { remove() {} }, rosterItem: { remove() {}, textContent: data.name }, selections: [] };
    }
  });
  if (seed) state.entries.set(cursor.id, state.createEntry(cursor, time));
  return { state, mutateValue() { value += "new"; revision += 1; }, setValue(next) { value = next; revision += 1; }, advance(ms) { time += ms; }, releases: () => releases, paints: () => paints };
}

test("presence removal-only batches repaint the remaining labels", () => {
  const fixture = controllerState();
  assert.equal(fixture.state.set([]), true);
  assert.equal(fixture.state.entries.size, 0);
  assert.equal(fixture.releases(), 1);
});

test("a nested presence setter retains the newer batch", () => {
  const { state } = controllerState();
  const options = {
    get baseRevision() {
      assert.equal(state.set([{ ...cursor, head: 7 }]), true);
      return 4;
    }
  };
  assert.equal(state.set([{ ...cursor, head: 8 }], options), false);
  assert.equal(state.entries.get(cursor.id).data.head, 7);
  assert.equal(state.generation, 1);
});

test("cursor and option getters cannot apply an older text revision", () => {
  for (const target of ["cursor", "options"]) {
    const fixture = controllerState();
    const entry = { ...cursor, head: 8 };
    const options = {};
    Object.defineProperty(target === "cursor" ? entry : options, target === "cursor" ? "name" : "animate", {
      get() { fixture.mutateValue(); return target === "cursor" ? "changed" : true; }
    });
    assert.equal(fixture.state.set([entry], options), false);
    assert.equal(fixture.state.entries.get(cursor.id).data.head, cursor.head);
    assert.equal(fixture.state.generation, 0);
    assert.equal(fixture.paints(), 0);
  }
});

test("canonical edit mapping invalidates a batch during getter reads", () => {
  const { state } = controllerState();
  state.get = () => Array.from(state.entries.values(), entry => ({ ...entry.data }));
  const options = {
    get animate() {
      PresenceController.prototype.mapChanges.call(state, [{ from: 0, to: 0, insert: "x" }]);
      return true;
    }
  };
  assert.equal(state.set([{ ...cursor, head: 8 }], options), false);
  assert.equal(state.entries.get(cursor.id).data.head, 7);
  assert.equal(state.generation, 1);
});


test("crowded labels hide immediately while idle labels can fade", () => {
  const entries = new Map(Array.from({ length: 20 }, (_, index) => {
    const id = String(index).padStart(2, "0");
    return [id, {
      data: { ...cursor, id }, changedAt: 0, motion: null, x: 20, y: 100,
      cursor: { style: {} },
      label: { style: { opacity: "0", visibility: "hidden" } }, labelWidth: 100, labelHeight: 19,
      measurement: { caret: { left: 20, top: 100, width: 2, height: 20 }, selection: [], viewport: { left: 0, top: 0, width: 200, height: 200 } }
    }];
  }));
  const state = { entries, advance() {} };
  PresenceController.prototype.paint.call(state, 0);
  const visible = Array.from(entries.values()).filter(entry => entry.label.style.visibility === "visible");
  assert.equal(visible.length, 4);
  for (const entry of Array.from(entries.values()).slice(4)) {
    assert.equal(entry.label.style.visibility, "hidden");
    assert.equal(entry.label.style.opacity, "0");
  }
  PresenceController.prototype.paint.call(state, 1700);
  for (const entry of visible) {
    assert.equal(entry.label.style.visibility, "visible");
    assert.equal(entry.label.style.opacity, "0");
  }
  for (const entry of Array.from(entries.values()).slice(4)) assert.equal(entry.label.style.visibility, "hidden");
});

test("cursor versions and TTL values require valid bounded pairs", () => {
  for (const fields of [{ epoch: 1 }, { sequence: 1 }, { epoch: -1, sequence: 0 }, { epoch: 0, sequence: 0.5 }, { epoch: 0, sequence: Infinity }, { ttlMs: -1 }, { ttlMs: 300001 }, { ttlMs: 0.5 }]) {
    assert.equal(validateRemoteCursors([{ ...cursor, ...fields }], 10), null);
  }
  assert.deepEqual(validateRemoteCursors([{ ...cursor, epoch: 0, sequence: 0, ttlMs: 0 }], 10), [{ ...cursor, epoch: 0, sequence: 0, ttlMs: 0 }]);
});

test("incremental updates merge, remove, replace, and report atomic errors", () => {
  const fixture = controllerState();
  const { state } = fixture;
  const second = { ...cursor, id: "second" };
  assert.deepEqual(state.update({ cursors: [second] }), { ok: true, count: 2 });
  assert.deepEqual(state.update({ cursors: [], remove: [cursor.id] }), { ok: true, count: 1 });
  assert.deepEqual(state.get().map(item => item.id), [second.id]);
  const before = state.get();
  assert.deepEqual(state.update({ cursors: [second], remove: [second.id] }), { ok: false, reason: "invalid-update", id: second.id });
  assert.deepEqual(state.update({ cursors: [second, second] }), { ok: false, reason: "duplicate-id", id: second.id });
  assert.deepEqual(state.update({ cursors: [], remove: ["x", "x"] }), { ok: false, reason: "invalid-remove", id: "x" });
  assert.deepEqual(state.update({ cursors: [], baseRevision: 5 }), { ok: false, reason: "stale-revision" });
  assert.deepEqual(state.get(), before);
  assert.deepEqual(state.update({ cursors: [cursor], replace: true }), { ok: true, count: 1 });
  assert.deepEqual(state.get().map(item => item.id), [cursor.id]);
});

test("tuple ordering rejects delayed data and preserves removed versions", () => {
  const { state } = controllerState({ seed: false });
  const versioned = { ...cursor, epoch: 1, sequence: 2, ttlMs: 0 };
  assert.deepEqual(state.update({ cursors: [versioned] }), { ok: true, count: 1 });
  assert.deepEqual(state.update({ cursors: [{ ...versioned, sequence: 1 }] }), { ok: false, reason: "stale-cursor", id: cursor.id });
  assert.deepEqual(state.update({ cursors: [{ ...versioned, head: 7 }] }), { ok: false, reason: "version-conflict", id: cursor.id });
  assert.deepEqual(state.update({ cursors: [cursor] }), { ok: false, reason: "stale-cursor", id: cursor.id });
  assert.deepEqual(state.update({ cursors: [{ ...versioned, epoch: 2, sequence: 0 }] }), { ok: true, count: 1 });
  state.update({ cursors: [], remove: [cursor.id] });
  assert.deepEqual(state.update({ cursors: [{ ...versioned, epoch: 2, sequence: 0 }] }), { ok: false, reason: "stale-cursor", id: cursor.id });
  assert.deepEqual(state.update({ cursors: [{ ...versioned, epoch: 2, sequence: 1 }] }), { ok: true, count: 1 });
});

test("heartbeats extend TTL without changing labels or mapped anchors", () => {
  const fixture = controllerState({ seed: false });
  const { state } = fixture;
  const versioned = { ...cursor, epoch: 1, sequence: 1, ttlMs: 2000 };
  state.update({ cursors: [versioned] });
  const token = state.captureAnchors()[0].generation;
  fixture.advance(1700);
  state.mapChanges([{ from: 0, to: 0, insert: "x" }]);
  const paints = fixture.paints();
  assert.deepEqual(state.update({ cursors: [versioned] }), { ok: true, count: 1 });
  assert.equal(fixture.paints(), paints);
  assert.equal(state.entries.get(cursor.id).changedAt, 0);
  assert.equal(state.get()[0].head, 7);
  assert.equal(state.captureAnchors()[0].generation, token);
  fixture.advance(1999);
  assert.equal(state.get().length, 1);
  fixture.advance(1);
  assert.equal(state.get().length, 0);
  assert.equal(fixture.releases(), 1);
  assert.equal(state.tombstones.size, 1);
});

test("default expiration, disabled expiration, and bounded tombstone retention", () => {
  const fixture = controllerState({ seed: false });
  const { state } = fixture;
  state.update({ cursors: [cursor, { ...cursor, id: "permanent", ttlMs: 0 }] });
  fixture.advance(30000);
  assert.deepEqual(state.get().map(item => item.id), ["permanent"]);
  for (let index = 0; index < 260; index++) {
    state.update({ cursors: [{ ...cursor, id: String(index), epoch: 1, sequence: 1, ttlMs: 0 }] });
    state.update({ cursors: [], remove: [String(index)] });
  }
  assert.equal(state.tombstones.size, 256);
  assert.equal(state.tombstones.has("0"), false);
  assert.equal(state.tombstones.has("259"), true);
  fixture.advance(300000);
  assert.deepEqual(state.update({ cursors: [{ ...cursor, id: "259", epoch: 1, sequence: 0, ttlMs: 0 }] }), { ok: true, count: 2 });
  assert.equal(state.tombstones.size, 0);
});

test("anchor snapshots restore only unchanged authority tokens", () => {
  const fixture = controllerState();
  const { state } = fixture;
  const before = state.captureAnchors();
  state.mapChanges([{ from: 1, to: 8, insert: "" }]);
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[1, 1]]);
  state.restoreAnchors(before);
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[2, 6]]);
  state.update({ cursors: [{ ...cursor, head: 7 }] });
  state.restoreAnchors(before);
  assert.equal(state.get()[0].head, 7);
  state.update({ cursors: [], remove: [cursor.id] });
  state.update({ cursors: [cursor] });
  const readded = state.captureAnchors()[0].generation;
  assert.notEqual(readded, before[0].generation);
  state.mapChanges([{ from: 0, to: 0, insert: "x" }]);
  state.restoreAnchors(before);
  assert.equal(state.get()[0].head, 7);
});

test("a newer tuple applies authoritative offsets after local mapping", () => {
  const { state } = controllerState({ seed: false });
  const original = { ...cursor, epoch: 1, sequence: 1, ttlMs: 0 };
  state.update({ cursors: [original] });
  state.mapChanges([{ from: 0, to: 0, insert: "x" }]);
  assert.equal(state.get()[0].head, 7);
  state.update({ cursors: [{ ...original, sequence: 2 }] });
  assert.equal(state.get()[0].head, 6);
  assert.equal(state.get()[0].anchor, 2);
});


test("equal-version wire heartbeats survive shorter mapped documents", () => {
  const fixture = controllerState({ seed: false });
  const { state } = fixture;
  const peer = { ...cursor, anchor: 8, head: 9, epoch: 1, sequence: 1, ttlMs: 1000 };
  state.update({ cursors: [peer] });
  fixture.setValue("89");
  state.mapChanges([{ from: 0, to: 8, insert: "" }]);
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[0, 1]]);
  fixture.advance(800);
  assert.deepEqual(state.update({ cursors: [peer] }), { ok: true, count: 1 });
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[0, 1]]);
  assert.deepEqual(state.update({ cursors: [{ ...peer, sequence: 2 }] }), { ok: false, reason: "invalid-cursor", id: cursor.id });
  assert.deepEqual(state.update({ cursors: [{ ...peer, id: "new" }] }), { ok: false, reason: "invalid-cursor", id: "new" });
  assert.deepEqual(state.update({ cursors: [{ ...peer, sequence: 2 }], baseRevision: 4 }), { ok: false, reason: "stale-revision" });
  fixture.advance(800);
  assert.equal(state.get().length, 1);
  fixture.advance(201);
  assert.equal(state.get().length, 0);
});

test("authoritative moves and local mapping clear a stationary hover", () => {
  const { state } = controllerState();
  state.hovered = cursor.id;
  state.update({ cursors: [{ ...cursor, head: 7 }] });
  assert.equal(state.hovered, null);
  state.hovered = cursor.id;
  state.mapChanges([{ from: 0, to: 0, insert: "x" }]);
  assert.equal(state.hovered, null);
});

test("an expiry discovered by an otherwise unchanged update repaints survivors", () => {
  const fixture = controllerState({ seed: false });
  const { state } = fixture;
  const survivor = { ...cursor, id: "survivor", ttlMs: 0 };
  state.update({ cursors: [{ ...cursor, ttlMs: 50 }, survivor] });
  const before = fixture.paints();
  fixture.advance(50);
  assert.deepEqual(state.update({ cursors: [survivor] }), { ok: true, count: 1 });
  assert.equal(fixture.paints(), before + 1);
  assert.deepEqual(state.get().map(peer => peer.id), ["survivor"]);
});

test("presence arrays ignore caller iterators and retain their captured bounds", () => {
  let iteratorReads = 0;
  const batch = [{ ...cursor, anchor: 0, head: 0 }];
  Object.defineProperty(batch, Symbol.iterator, { get() { iteratorReads += 1; throw new Error("Do not read the iterator."); } });
  assert.deepEqual(validateRemoteCursors(batch, 1), [{ ...cursor, anchor: 0, head: 0 }]);
  assert.equal(iteratorReads, 0);
  const growing = [{ ...cursor }];
  Object.defineProperty(growing, 0, { get() { growing.push({ ...cursor, id: "extra" }); return { ...cursor }; } });
  assert.equal(validateRemoteCursors(growing, 10), null);
  const throwing = [{ ...cursor }];
  Object.defineProperty(throwing, 0, { get() { throw new Error("Index getter"); } });
  assert.equal(validateRemoteCursors(throwing, 10), null);
  for (const length of [NaN, -1, 0.5, "1", undefined, Infinity, 65]) {
    const proxy = new Proxy([{ ...cursor }], { get(target, key, receiver) { return key === "length" ? length : Reflect.get(target, key, receiver); } });
    assert.equal(validateRemoteCursors(proxy, 10), null);
  }
  const sixtyFive = Array.from({ length: 65 }, (_, index) => ({ ...cursor, id: String(index) }));
  assert.equal(validateRemoteCursors(sixtyFive, 10), null);
});

test("incremental removals ignore iterators and reject changed array shapes atomically", () => {
  const fixture = controllerState();
  const ids = [cursor.id];
  let iteratorReads = 0;
  Object.defineProperty(ids, Symbol.iterator, { get() { iteratorReads += 1; throw new Error("Do not read the iterator."); } });
  assert.deepEqual(fixture.state.update({ cursors: [], remove: ids }), { ok: true, count: 0 });
  assert.equal(iteratorReads, 0);
  for (const kind of ["growing", "throwing", "bogus", "sixty-five"]) {
    const next = controllerState();
    let remove = [cursor.id];
    if (kind === "growing") Object.defineProperty(remove, 0, { get() { remove.push("extra"); return cursor.id; } });
    if (kind === "throwing") Object.defineProperty(remove, 0, { get() { throw new Error("Index getter"); } });
    if (kind === "bogus") remove = new Proxy(remove, { get(target, key, receiver) { return key === "length" ? "1" : Reflect.get(target, key, receiver); } });
    if (kind === "sixty-five") remove = Array.from({ length: 65 }, (_, index) => String(index));
    const before = next.state.get();
    assert.equal(next.state.update({ cursors: [], remove }).ok, false);
    assert.deepEqual(next.state.get(), before);
  }
});

test("presence refresh finishes its DOM writes before label metric reads", () => {
  const operations = [];
  const style = id => new Proxy({ setProperty() { operations.push(`write:${id}`); } }, {
    set(target, key, value) { operations.push(`write:${id}`); target[key] = value; return true; }
  });
  const entries = new Map(Array.from({ length: 3 }, (_, index) => {
    const id = String(index);
    let text = "old";
    const label = {
      style: style(id),
      get textContent() { return text; },
      set textContent(value) { operations.push(`text:${id}`); text = value; },
      get offsetWidth() { operations.push(`read:${id}`); return 100; },
      get offsetHeight() { operations.push(`read:${id}`); return 19; }
    };
    return [id, { data: { ...cursor, id }, cursor: { style: style(id) }, caret: { style: style(id) }, label, selections: [], measurement: null, motion: null, logicalRow: 1, x: 0, y: 0 }];
  }));
  const rectangle = { left: 15, top: 20, width: 2, height: 20 };
  const measurement = { caret: rectangle, selection: [], viewport: { left: 0, top: 0, width: 200, height: 200 } };
  const state = Object.assign(Object.create(PresenceController.prototype), {
    connected: true, layoutFrame: null, lastMode: "source", hovered: null, lineValue: null, lineStarts: [0],
    hooks: { getMode: () => "source", getValue: () => "0123456789" },
    reducedMotion: { matches: false }, entries,
    geometry: { measureBatch(cursors) { return cursors.map(() => measurement); } },
    now: () => 0, expireEntries: () => false, paint() {}, armFade() {}, armFrame() {}
  });
  state.refresh(false);
  const firstRead = operations.findIndex(operation => operation.startsWith("read:"));
  const lastWrite = operations.findLastIndex(operation => !operation.startsWith("read:"));
  assert.ok(firstRead > lastWrite);
  assert.equal(operations.filter(operation => operation.startsWith("read:")).length, 6);
  operations.length = 0;
  state.refresh(false);
  assert.equal(operations.some(operation => operation.startsWith("text:")), false);
});

test("an unversioned replacement applies its offsets after local mapping", () => {
  const { state } = controllerState();
  const before = state.captureAnchors()[0].generation;
  state.mapChanges([{ from: 0, to: 0, insert: "x" }]);
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[3, 7]]);
  assert.equal(state.set([cursor]), true);
  assert.deepEqual(state.get().map(({ anchor, head }) => [anchor, head]), [[2, 6]]);
  assert.notEqual(state.captureAnchors()[0].generation, before);
});
