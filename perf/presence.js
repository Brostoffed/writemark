import "../dist/writemark-editor.js";

await customElements.whenDefined("writemark-editor");
const editor = document.querySelector("#benchmark-editor");
const form = document.querySelector("#benchmark-form");
const status = document.querySelector("#status");
const output = document.querySelector("#result");
const runButton = document.querySelector("#run");
const lifecycleButton = document.querySelector("#lifecycle");
const downloadButton = document.querySelector("#download");
let lastReport = null;
let benchmarkEpoch = 0;

const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    medianMs: sorted[Math.floor(sorted.length * .5)] ?? 0,
    p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? 0,
    maxMs: sorted.at(-1) ?? 0
  };
};
const environment = () => ({
  userAgent: navigator.userAgent,
  viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  visibility: document.visibilityState,
  time: new Date().toISOString()
});
const samples = (sequence, length, epoch = 1, selection = "short") => Array.from({ length: 64 }, (_, index) => {
  const anchor = selection === "long" ? index + sequence - 1 : (index * 29 + sequence * 3) % Math.min(1800, length - 8);
  const head = selection === "long" ? length - anchor : anchor + 5;
  return { id: `sample-${index}`, name: `Sample ${index + 1}`, color: index % 2 ? "#5273a3" : "#b45c42", anchor, head, epoch, sequence, ttlMs: 0 };
});

async function workload() {
  const lines = Number(document.querySelector("#lines").value);
  const frames = Number(document.querySelector("#frames").value);
  const mode = document.querySelector("#mode").value;
  const selection = document.querySelector("#selection").value;
  const animate = document.querySelector("#animate").checked;
  const epoch = ++benchmarkEpoch;
  const setupStart = performance.now();
  editor.updateRemoteCursors({ cursors: [], replace: true });
  editor.mode = mode;
  editor.value = Array.from({ length: lines }, (_, index) => `Line ${index}: Keep the useful detail. Café, 雪, and 😀 belong in the same note.`).join("\n\n");
  const surface = editor.shadowRoot.querySelector(mode === "live" ? ".live-editor" : "textarea");
  surface.scrollTop = selection === "long" ? 540 : 0;
  const setupMs = performance.now() - setupStart;
  const value = editor.value;
  const revision = editor.revision;
  const updates = [];
  const intervals = [];
  let nodes = 0;
  let selectionRectPeak = 0;
  const warmupFrames = 5;
  await frame();
  let previous = performance.now();
  for (let index = 0; index < frames; index++) {
    const start = performance.now();
    const result = editor.updateRemoteCursors({ cursors: samples(index + 1, value.length, epoch, selection), animate, showNames: false });
    if (!result.ok || result.count !== 64) throw Error(`Cursor update failed: ${JSON.stringify(result)}`);
    updates.push(performance.now() - start);
    await frame();
    const now = performance.now();
    intervals.push(now - previous);
    previous = now;
    nodes = Math.max(nodes, editor.shadowRoot.querySelectorAll(".remote-presence *").length);
    selectionRectPeak = Math.max(selectionRectPeak, editor.shadowRoot.querySelectorAll(".remote-presence-selection").length);
    if (index % 30 === 0) status.textContent = `Measured ${index + 1} of ${frames} update frames.`;
  }
  return {
    kind: "64-cursor workload",
    environment: environment(),
    configuration: { lines, frames, mode, animate, samples: 64, nonemptySelections: 64, selection, characters: value.length },
    timing: { clock: "performance.now", frameBoundary: "requestAnimationFrame callback", warmupFrames, frameSamples: intervals.length, animationFrameSupported: typeof requestAnimationFrame === "function" },
    setupMs,
    updates: stats(updates.slice(warmupFrames)),
    framesAfterWarmup: stats(intervals.slice(warmupFrames)),
    framesOver50Ms: intervals.slice(warmupFrames).filter(ms => ms > 50).length,
    updateTimesMs: updates,
    frameIntervalsMs: intervals,
    peakOverlayNodes: nodes,
    peakSelectionRects: selectionRectPeak,
    finalSelectionRects: editor.shadowRoot.querySelectorAll(".remote-presence-selection").length,
    documentUnchanged: editor.value === value,
    revisionUnchanged: editor.revision === revision,
    finalCursorCount: editor.getRemoteCursors().length
  };
}

async function lifecycle() {
  const timings = [];
  let maxOverlays = 0;
  for (let cycle = 0; cycle < 40; cycle++) {
    const start = performance.now();
    const instance = document.createElement("writemark-editor");
    instance.style.setProperty("--md-editor-max-height", "120px");
    instance.value = "A short lifecycle document.\n\nA second line with café and 雪.";
    document.body.append(instance);
    const result = instance.updateRemoteCursors({ cursors: samples(cycle + 1, instance.value.length), animate: false, showNames: false });
    if (!result.ok) throw Error(`Lifecycle update failed: ${JSON.stringify(result)}`);
    await frame();
    instance.remove();
    const rejected = instance.updateRemoteCursors({ cursors: [] });
    if (rejected.ok || rejected.reason !== "not-connected") throw Error("Disconnected update did not fail safely.");
    document.body.append(instance);
    await frame();
    const overlays = instance.shadowRoot.querySelectorAll(".remote-presence").length;
    maxOverlays = Math.max(maxOverlays, overlays);
    if (overlays !== 1 || instance.getRemoteCursors().length !== 64) throw Error("Reconnect changed the cursor display state.");
    instance.remove();
    timings.push(performance.now() - start);
    status.textContent = `Measured ${cycle + 1} of 40 lifecycle checks.`;
  }
  return {
    kind: "presence lifecycle",
    environment: environment(),
    cycles: stats(timings),
    samplesPerCycle: 64,
    timing: { clock: "performance.now", frameBoundary: "requestAnimationFrame callback", animationFrameSupported: typeof requestAnimationFrame === "function" },
    maximumOverlaysPerEditor: maxOverlays,
    limitation: "DOM lifecycle measurements do not prove heap collection or mobile device performance."
  };
}

async function run(task) {
  runButton.disabled = true;
  lifecycleButton.disabled = true;
  downloadButton.disabled = true;
  document.documentElement.dataset.benchmarkRunning = "true";
  try {
    lastReport = await task();
    output.textContent = JSON.stringify(lastReport, null, 2);
    status.textContent = "The benchmark finished. Review the measured results below.";
    downloadButton.disabled = false;
    return lastReport;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    runButton.disabled = false;
    lifecycleButton.disabled = false;
    document.documentElement.dataset.benchmarkRunning = "false";
  }
}
form.addEventListener("submit", event => { event.preventDefault(); void run(workload).catch(() => {}); });
lifecycleButton.addEventListener("click", () => { void run(lifecycle).catch(() => {}); });
downloadButton.addEventListener("click", () => {
  if (!lastReport) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "writemark-presence-benchmark.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
