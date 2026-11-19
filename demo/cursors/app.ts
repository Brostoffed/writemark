import type { RemoteCursor, SelectionDirection, SourceSelection, WritemarkEditorElement } from "../../src/types.ts";

const initialMarkdown = `# Friday field notes

A small plan for a thoughtful launch.

## Before we share

- [x] Choose a clear owner
- [ ] Read the draft together
- [ ] Leave room for questions

## What we noticed

Good notes make the next step easier. Keep the useful detail, then make a little space.

| Item | Next step |
| --- | --- |
| Draft | Add two examples |
| Review | Check the small screens |

> A clear page helps everyone find their place.
`;
const palette = ["#b45c42", "#5273a3", "#7c679a", "#51836c", "#a07a36", "#a25f82"] as const;

function element<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing demo element: ${selector}`);
  return value;
}

async function start() {
  await customElements.whenDefined("writemark-editor");
  const editor = element<WritemarkEditorElement>("#cursor-editor");
  const list = element<HTMLDivElement>("#cursor-list");
  const nameInput = element<HTMLInputElement>("#cursor-name");
  const colorInput = element<HTMLInputElement>("#cursor-color");
  const anchorInput = element<HTMLInputElement>("#cursor-anchor");
  const headInput = element<HTMLInputElement>("#cursor-head");
  const showNamesInput = element<HTMLInputElement>("#show-names");
  const olderButton = element<HTMLButtonElement>("#test-older-update");
  const followInput = element<HTMLInputElement>("#follow-selection");
  const placeButton = element<HTMLButtonElement>("#place-cursor");
  const addButton = element<HTMLButtonElement>("#add-cursor");
  const removeButton = element<HTMLButtonElement>("#remove-cursor");
  const liveButton = element<HTMLButtonElement>("#mode-live");
  const sourceButton = element<HTMLButtonElement>("#mode-source");
  const status = element<HTMLParagraphElement>("#demo-status");
  let samples: RemoteCursor[] = [];
  let selectedId: string | null = "sample-1";
  let nextId = 3;
  let currentSelection: SourceSelection = { start: 0, end: 0, direction: "none" };
  editor.value = initialMarkdown;
  editor.commit();

  const selected = () => samples.find(cursor => cursor.id === selectedId);
  const lineAt = (offset: number) => editor.value.slice(0, offset).split("\n").length;
  const showStatus = (message: string, error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
  };
  const readSelection = (): SourceSelection => {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    return { start, end, direction: start === end ? "none" : currentSelection.direction ?? "none" };
  };
  const endpoints = () => currentSelection.direction === "backward"
    ? { anchor: currentSelection.end, head: currentSelection.start }
    : { anchor: currentSelection.start, head: currentSelection.end };

  function render() {
    const activeChoice = document.activeElement instanceof HTMLButtonElement && list.contains(document.activeElement)
      ? document.activeElement.dataset.cursorId : undefined;
    list.replaceChildren();
    for (const cursor of samples) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "cursor-choice";
      choice.dataset.cursorId = cursor.id;
      choice.title = cursor.name;
      choice.style.setProperty("--cursor-color", cursor.color);
      choice.setAttribute("aria-pressed", String(cursor.id === selectedId));
      choice.setAttribute("aria-label", `Choose ${cursor.name}`);
      const swatch = document.createElement("span");
      swatch.className = "cursor-swatch";
      swatch.textContent = cursor.name.trim().slice(0, 1).toUpperCase();
      swatch.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = cursor.name;
      const location = document.createElement("small");
      location.textContent = `Line ${lineAt(cursor.head)} · ${cursor.anchor === cursor.head ? "Caret" : "Range"}`;
      copy.append(name, location);
      const check = document.createElement("span");
      check.className = "choice-check";
      check.setAttribute("aria-hidden", "true");
      choice.append(swatch, copy, check);
      choice.addEventListener("click", () => {
        selectedId = cursor.id;
        render();
        showStatus(followInput.checked ? `${cursor.name} will follow your next selection.` : `${cursor.name} is selected.`);
      });
      list.append(choice);
    }
    if (!samples.length) {
      const empty = document.createElement("p");
      empty.className = "empty-list";
      empty.textContent = "Add a cursor sample at your current selection.";
      list.append(empty);
    }
    if (activeChoice) {
      for (const choice of list.querySelectorAll<HTMLButtonElement>("button")) {
        if (choice.dataset.cursorId === activeChoice) choice.focus({ preventScroll: true });
      }
    }
    const cursor = selected();
    for (const control of [nameInput, colorInput, anchorInput, headInput, placeButton, removeButton, followInput, olderButton]) control.disabled = !cursor;
    const positionButton = element<HTMLButtonElement>("#position-form button");
    positionButton.disabled = !cursor;
    if (document.activeElement !== nameInput) nameInput.value = cursor?.name ?? "";
    colorInput.value = cursor?.color ?? "#b45c42";
    if (document.activeElement !== anchorInput) anchorInput.value = String(cursor?.anchor ?? 0);
    if (document.activeElement !== headInput) headInput.value = String(cursor?.head ?? 0);
    anchorInput.max = String(editor.value.length);
    headInput.max = String(editor.value.length);
    addButton.disabled = samples.length >= 12;
    element<HTMLElement>("#sample-count").textContent = String(samples.length);
    const plain = editor.getPlainText().trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    element<HTMLElement>("#word-count").textContent = `${words} ${words === 1 ? "word" : "words"} · Editable page`;
    element<HTMLElement>("#selection-label").textContent = currentSelection.start === currentSelection.end
      ? `Caret at ${currentSelection.start}` : `Selection ${currentSelection.start}–${currentSelection.end}`;
  }

  function apply(next: readonly RemoteCursor[], message?: string, animate = true) {
    const ids = new Set(next.map(cursor => cursor.id));
    const remove = samples.filter(cursor => !ids.has(cursor.id)).map(cursor => cursor.id);
    const changed = next.filter(cursor => JSON.stringify(cursor) !== JSON.stringify(samples.find(previous => previous.id === cursor.id)));
    const result = editor.updateRemoteCursors({ cursors: changed, remove, baseRevision: editor.revision, animate, showNames: showNamesInput.checked });
    if (!result.ok) {
      showStatus(`The editor rejected this update (${result.reason}).`, true);
      return false;
    }
    samples = editor.getRemoteCursors();
    render();
    if (message) showStatus(message);
    return true;
  }

  function updateSelected(patch: Partial<Pick<RemoteCursor, "name" | "color" | "anchor" | "head">>, message?: string) {
    if (!selected()) return;
    apply(samples.map(cursor => cursor.id === selectedId ? { ...cursor, ...patch, epoch: cursor.epoch ?? 1, sequence: (cursor.sequence ?? 0) + 1 } : cursor), message);
  }

  function moveSelected(message?: string) {
    const cursor = selected();
    if (!cursor) return;
    const positions = endpoints();
    if (cursor.anchor === positions.anchor && cursor.head === positions.head) {
      render();
      if (message) showStatus(message);
      return;
    }
    updateSelected(positions, message);
  }

  nameInput.addEventListener("input", () => {
    const name = nameInput.value.trim();
    if (!name) { showStatus("Enter a cursor name.", true); return; }
    updateSelected({ name }, "The cursor name changed.");
  });
  nameInput.addEventListener("blur", () => { nameInput.value = selected()?.name ?? ""; });
  colorInput.addEventListener("input", () => updateSelected({ color: colorInput.value }, "The cursor color changed."));
  placeButton.addEventListener("click", () => {
    moveSelected(`${selected()?.name ?? "The cursor"} now uses your selection.`);
  });
  showNamesInput.addEventListener("change", () => {
    const result = editor.updateRemoteCursors({ cursors: [], showNames: showNamesInput.checked, baseRevision: editor.revision });
    showStatus(result.ok ? (showNamesInput.checked ? "Cursor names stay visible when space permits." : "Names now appear on movement or hover. Full names stay in the sample list.") : `The editor rejected this update (${result.reason}).`, !result.ok);
  });
  olderButton.addEventListener("click", () => {
    const cursor = selected();
    if (!cursor) return;
    const result = editor.updateRemoteCursors({ cursors: [{ ...cursor, sequence: Math.max(0, (cursor.sequence ?? 1) - 1) }], baseRevision: editor.revision });
    if (!result.ok && result.reason === "stale-cursor") showStatus("Older update ignored. The cursor did not move.");
    else showStatus(result.ok ? "The update was accepted." : `The editor rejected this update (${result.reason}).`, !result.ok);
  });
  followInput.addEventListener("change", () => {
    showStatus(followInput.checked ? "Click or select text to move the selected sample." : "The sample will stay at its supplied position.");
  });
  addButton.addEventListener("click", () => {
    const number = nextId++;
    const color = palette[(number - 1) % palette.length] ?? "#b45c42";
    const cursor: RemoteCursor = { id: `sample-${number}`, name: `Cursor ${number}`, color, ...endpoints(), active: true, epoch: 1, sequence: 1, ttlMs: 0 };
    const previousId = selectedId;
    selectedId = cursor.id;
    if (!apply([...samples, cursor], `${cursor.name} was added at your selection.`)) selectedId = previousId;
  });
  removeButton.addEventListener("click", () => {
    const cursor = selected();
    if (!cursor) return;
    const next = samples.filter(sample => sample.id !== cursor.id);
    selectedId = next[0]?.id ?? null;
    apply(next, `${cursor.name} was removed.`);
  });
  element<HTMLFormElement>("#position-form").addEventListener("submit", event => {
    event.preventDefault();
    const anchor = anchorInput.valueAsNumber;
    const head = headInput.valueAsNumber;
    if (![anchor, head].every(offset => Number.isSafeInteger(offset) && offset >= 0 && offset <= editor.value.length)) {
      showStatus(`Use whole source offsets from 0 to ${editor.value.length}.`, true);
      return;
    }
    updateSelected({ anchor, head }, "The source positions changed.");
  });
  const setMode = (mode: "live" | "source") => {
    editor.mode = mode;
    liveButton.setAttribute("aria-pressed", String(mode === "live"));
    sourceButton.setAttribute("aria-pressed", String(mode === "source"));
    showStatus(mode === "live" ? "The live view shows your formatted Markdown." : "The source view shows your Markdown and cursor samples.");
  };
  liveButton.addEventListener("click", () => setMode("live"));
  sourceButton.addEventListener("click", () => setMode("source"));
  editor.addEventListener("md-selection-change", event => {
    const { selectionStart: start, selectionEnd: end, selectionDirection: direction } = event.detail;
    currentSelection = { start, end, direction };
    if (followInput.checked) moveSelected();
    else render();
  });
  editor.addEventListener("md-input", () => {
    samples = editor.getRemoteCursors();
    currentSelection = readSelection();
    if (followInput.checked) moveSelected();
    else render();
  });

  const first = initialMarkdown.indexOf("small plan");
  const second = initialMarkdown.indexOf("clear owner");
  apply([
    { id: "sample-1", name: "Cursor 1", color: palette[0], anchor: first, head: first, active: true, epoch: 1, sequence: 1, ttlMs: 0 },
    { id: "sample-2", name: "Cursor 2", color: palette[1], anchor: second, head: second + "clear owner".length, active: true, epoch: 1, sequence: 1, ttlMs: 0 }
  ], undefined, false);
  document.documentElement.dataset.cursorDemoReady = "true";
}

void start().catch((error: unknown) => {
  const status = document.querySelector<HTMLElement>("#demo-status");
  if (status) {
    status.textContent = error instanceof Error ? error.message : "The cursor demo could not start.";
    status.dataset.error = "true";
  }
});
