import "../component/register.ts";
import type { NativeTextareaBridge } from "../component/types.ts";
import type { WritemarkEditorElement, TextareaEnhancement, SelectionDirection, TextChange } from "../types.ts";

export type { TextareaEnhancement } from "../types.ts";

type EnhancementEditor = WritemarkEditorElement & {
    _nativeTextareaBridge: NativeTextareaBridge | null;
    _syncAttributesToControls(): void;
    _updateValidity(): void;
    _setValueInternal(value: string, options: { source: string; preserveSelection: boolean; changes?: TextChange[] }): void;
    _setSelectionRangeWithoutFocus(start: number, end: number, direction: SelectionDirection): void;
};

// A shared symbol makes repeated classic script loads idempotent.
const handleKey = Symbol.for("writemark.textarea-enhancement");
type EnhancedTextarea = HTMLTextAreaElement & { [handleKey]?: TextareaEnhancement };

export function enhanceTextarea(textarea: HTMLTextAreaElement): TextareaEnhancement {
    if (textarea.localName !== "textarea") throw new TypeError("Expected a textarea.");
    const target = textarea as EnhancedTextarea;
    if (target[handleKey]) return target[handleKey];
    if (!textarea.parentNode) throw new Error("The textarea needs a parent.");
    const doc = textarea.ownerDocument;
    const view = doc.defaultView;
    if (!view) throw new Error("The textarea needs a window.");
    const editor = doc.createElement("writemark-editor") as EnhancementEditor;
    if (typeof editor.setMarkdown !== "function" || typeof editor.applyTransaction !== "function"
        || typeof editor._setValueInternal !== "function" || typeof editor._setSelectionRangeWithoutFocus !== "function"
        || !("_nativeTextareaBridge" in editor) || !Number.isSafeInteger(editor.revision)) throw new Error("The editor does not support textarea synchronization.");
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
    const read = () => String(descriptor.get!.call(textarea));
    const initialValue = read();
    const initialDefault = textarea.defaultValue;
    const initialSelection = [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection] as const;
    const write = (value: string) => { descriptor.set!.call(textarea, value); };
    let unregisterLifecycle: (() => void) | null = null;
    let initialized = false;
    let lengthValidation: "native" | "user" | "programmatic" = "native";
    let stopped = false;
    let syncing = false;
    let selectionDirection = textarea.selectionDirection;
    let lastChangeValue = initialValue;
    let userChanged = false;
    let focusWithin = false;
    let customMessage = textarea.validity.customError ? textarea.validationMessage : "";
    const nativeValidity = textarea.setCustomValidity.bind(textarea);
    editor._nativeTextareaBridge = {
        tabIndex: () => textarea.tabIndex,
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
            const flags: ValidityStateFlags = {};
            if (native.valueMissing) flags.valueMissing = true;
            if (native.customError) flags.customError = true;
            if (tooShort) flags.tooShort = true;
            if (tooLong) flags.tooLong = true;
            return { flags, message: textarea.validationMessage };
        }
    };
    editor.tabIndex = textarea.tabIndex;
    const listeners: (() => void)[] = [];
    const listen = (node: EventTarget, type: string, callback: EventListener, capture = false) => {
        node.addEventListener(type, callback, capture);
        listeners.push(() => node.removeEventListener(type, callback, capture));
    };
    const copySelection = () => {
        if (syncing) return;
        if (textarea.selectionStart !== editor.selectionStart || textarea.selectionEnd !== editor.selectionEnd || textarea.selectionDirection !== selectionDirection) {
            nativeSelectionRange(editor.selectionStart, editor.selectionEnd, selectionDirection);
        }
    };
    const syncValue = () => {
        if (syncing || stopped) return;
        syncing = true;
        if (read() !== editor.value) write(editor.value);
        if (textarea.defaultValue !== editor.defaultValue) textarea.defaultValue = editor.defaultValue;
        syncing = false;
        copySelection();
    };
    const forwardChange = () => {
        syncValue();
        const changed = userChanged && editor.value !== lastChangeValue;
        lastChangeValue = editor.value;
        userChanged = false;
        if (changed) textarea.dispatchEvent(new view.Event("change", { bubbles: true }));
    };
    let boundForm: HTMLFormElement | null = null;
    const onReset: EventListener = event => {
        editor.defaultValue = textarea.defaultValue;
        view.queueMicrotask(() => {
            if (!stopped && !event.defaultPrevented) {
                lengthValidation = "native";
                fromTextarea();
                userChanged = false;
                lastChangeValue = editor.value;
            }
        });
    };
    const bindForm = () => {
        if (boundForm === textarea.form) return;
        boundForm?.removeEventListener("reset", onReset, true);
        boundForm = textarea.form;
        boundForm?.addEventListener("reset", onReset, true);
    };
    const syncLabels = () => {
        if (editor.label) editor.label = "";
        if (textarea.hasAttribute("aria-label") || textarea.hasAttribute("aria-labelledby")) return;
        const candidates = new Set(Array.from(textarea.labels || []));
        const scope = textarea.getRootNode() as ParentNode;
        if (textarea.id) {
            for (const label of scope.querySelectorAll<HTMLLabelElement>(`label[for="${view.CSS.escape(textarea.id)}"]`)) candidates.add(label);
        }
        for (let parent = textarea.parentElement; parent; parent = parent.parentElement) {
            if (parent instanceof view.HTMLLabelElement) candidates.add(parent);
        }
        const labels = Array.from(candidates).filter(label => label.control === textarea).map(label => {
            const text: string[] = [];
            const walker = doc.createTreeWalker(label, view.NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                if (!walker.currentNode.parentElement?.closest("textarea,input,select,button,writemark-editor,md-live-editor,script,style")) text.push(walker.currentNode.textContent || "");
            }
            return text.join("").replace(/\s+/g, " ").trim();
        }).filter(Boolean).join(" ");
        if (editor.getAttribute("aria-label") !== labels) editor.setAttribute("aria-label", labels);
    };
    const syncAttributes = () => {
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
    };
    const fromTextarea = (changes?: TextChange[]) => {
        if (stopped || syncing) return;
        const wanted = read();
        const selection = [textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection] as const;
        const revision = editor.revision;
        syncing = true;
        try {
            if (wanted !== editor.value) editor._setValueInternal(wanted, { source: "api", preserveSelection: editor.matches(":focus-within"), ...(changes ? { changes } : {}) });
            if (editor.value === wanted && editor.revision <= revision + 1) editor._setSelectionRangeWithoutFocus(...selection);
        } finally { syncing = false; }
        syncValue();
        editor._updateValidity();
    };
    const focus = (options?: FocusOptions) => {
        syncAttributes();
        if (!editor.disabled) editor.focus(options);
    };
    const restore = (name: string, saved?: PropertyDescriptor) => {
        if (saved) Object.defineProperty(textarea, name, saved);
        else Reflect.deleteProperty(textarea, name);
    };
    let observedParent: Node | null = null;
    let labelRoot: Node | null = null;
    let observedAncestors: HTMLElement[] = [];
    const labelClick: EventListener = event => {
        const path = event.composedPath();
        const label = path.find(node => node instanceof view.HTMLLabelElement) as HTMLLabelElement | undefined;
        if (label?.control === textarea && !path.some(node => node instanceof view.HTMLElement && node !== label && /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(node.tagName))) {
            event.preventDefault();
            focus();
        }
    };
    const refreshOwnership = () => {
        const root = textarea.getRootNode();
        const ancestors: HTMLElement[] = [];
        for (let ancestor = textarea.parentElement; ancestor; ancestor = ancestor.parentElement) ancestors.push(ancestor);
        const fieldsets = ancestors.filter(ancestor => ancestor.localName === "fieldset");
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
    };
    const refreshLifecycle = () => {
        if (stopped) return;
        if (editor.parentNode !== textarea.parentNode || !editor.parentNode) { handle.destroy(); return; }
        if (refreshOwnership()) syncAttributes();
        else syncLabels();
    };
    const observer = new view.MutationObserver(() => {
        refreshLifecycle();
        if (stopped) return;
        syncAttributes();
        fromTextarea();
    });
    const handle: TextareaEnhancement = {
        editor, textarea,
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
            listeners.forEach(remove => remove());
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
            configurable: true, enumerable: descriptor.enumerable ?? true,
            get: read,
            set(value: string) { const before = read(); write(value); if (read() !== before) lengthValidation = "programmatic"; fromTextarea(); }
        });
        Object.defineProperty(textarea, "defaultValue", {
            configurable: true, enumerable: defaultDescriptor.enumerable ?? true,
            get() { return String(defaultDescriptor.get!.call(textarea)); },
            set(value: string) {
                defaultDescriptor.set!.call(textarea, value);
                if (syncing || stopped) return;
                const beforeRevision = editor.revision;
                const oldEditorValue = editor.value;
                const clean = !editor.dirty;
                syncing = true;
                try { editor.defaultValue = textarea.defaultValue; } finally { syncing = false; }
                const expectedRevision = beforeRevision + (clean && editor.defaultValue !== oldEditorValue ? 1 : 0);
                if (editor.revision > expectedRevision) syncValue();
                else fromTextarea();
            }
        });
        Object.defineProperty(textarea, "setSelectionRange", {
            configurable: true,
            value(start: number, end: number, direction?: SelectionDirection) {
                nativeSelectionRange(start, end, direction);
                if (!syncing && !stopped) editor._setSelectionRangeWithoutFocus(textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection);
            }
        });
        Object.defineProperty(textarea, "setRangeText", {
            configurable: true,
            value(...args: [replacement: string] | [replacement: string, start: number, end: number, selectionMode?: SelectionMode]) {
                const before = read();
                const revision = editor.revision;
                const beforeStart = textarea.selectionStart;
                const beforeEnd = textarea.selectionEnd;
                Reflect.apply(nativeRangeText, textarea, args);
                const after = read();
                if (after !== before) lengthValidation = "programmatic";
                const unsigned = (value: number) => Number.isFinite(value) ? ((Math.trunc(value) % 4294967296) + 4294967296) % 4294967296 : 0;
                const from = args.length === 1 ? beforeStart : typeof args[1] === "number" ? Math.min(before.length, unsigned(args[1])) : null;
                const to = args.length === 1 ? beforeEnd : typeof args[2] === "number" ? Math.min(before.length, unsigned(args[2])) : null;
                let changes: TextChange[] | undefined;
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
            value(message: string) { customMessage = String(message); nativeValidity(customMessage); editor.setCustomValidity(customMessage); }
        });
        listen(editor, "md-value-sync", syncValue);
        listen(editor, "md-input", ((event: CustomEvent<{ source: string }>) => {
            syncValue();
            if (["user", "keyboard", "paste", "pointer", "undo", "redo"].includes(event.detail.source)) {
                userChanged = editor.value !== lastChangeValue;
                textarea.dispatchEvent(new view.Event("input", { bubbles: true, composed: true }));
            } else if (!userChanged) lastChangeValue = editor.value;
        }) as EventListener);
        listen(editor, "md-change", ((event: CustomEvent<{ origin: { kind: string } }>) => {
            if (event.detail.origin.kind === "user") forwardChange();
            else syncValue();
        }) as EventListener);
        if (editor.shadowRoot) {
            listen(editor.shadowRoot, "input", event => event.stopPropagation());
            listen(editor.shadowRoot, "change", event => event.stopPropagation());
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
        listen(editor, "md-selection-change", ((event: CustomEvent<{ selectionDirection: "none" | "forward" | "backward" }>) => {
            selectionDirection = event.detail.selectionDirection;
            copySelection();
        }) as EventListener);
        listen(textarea, "input", () => fromTextarea());
        listen(textarea, "change", () => fromTextarea());
        listen(textarea, "select", () => {
            if (!syncing) editor._setSelectionRangeWithoutFocus(textarea.selectionStart, textarea.selectionEnd, textarea.selectionDirection);
        });
        listen(textarea, "invalid", event => { event.preventDefault(); focus(); editor.reportValidity(); });
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
        defaultDescriptor.set!.call(textarea, initialDefault);
        write(initialValue);
        textarea.setSelectionRange(...initialSelection);
        throw error;
    }
}

/** Enhance only textareas that explicitly opt in. Each failure keeps its textarea. */
export function enhanceTextareas(root: ParentNode = document): TextareaEnhancement[] {
    const node = root as Node;
    if (node.nodeType === 11 && "host" in root && node.ownerDocument) managerFor(node.ownerDocument).watch(root as ShadowRoot);
    const nodes = Array.from(root.querySelectorAll<HTMLTextAreaElement>("textarea[data-writemark]"));
    if ((root as Node).nodeType === 1 && (root as Element).matches("textarea[data-writemark]")) nodes.unshift(root as HTMLTextAreaElement);
    const handles: TextareaEnhancement[] = [];
    for (const textarea of nodes) {
        try { handles.push(enhanceTextarea(textarea)); } catch { /* Keep the native fallback. */ }
    }
    return handles;
}

interface EnhancementManager {
    watch(root: ShadowRoot): void;
    add(handle: TextareaEnhancement, refresh: () => void): () => void;
    start(): void;
}
const managerKey = Symbol.for("writemark.textarea-manager");
type ManagedDocument = Document & { [managerKey]?: EnhancementManager };

function managerFor(doc: Document): EnhancementManager {
    const managed = doc as ManagedDocument;
    const existing = managed[managerKey];
    if (existing) return existing;
    const view = doc.defaultView;
    if (!view) throw new Error("The document needs a window.");
    const handles = new Set<{ reference: WeakRef<TextareaEnhancement>; connected: boolean }>();
    const roots = new Map<ShadowRoot, MutationObserver>();
    const refreshers = new WeakMap<TextareaEnhancement, () => void>();
    let automatic = false;
    const cleanup = () => {
        for (const record of handles) {
            const handle = record.reference.deref();
            if (!handle) { handles.delete(record); continue; }
            if (handle.textarea.isConnected && handle.textarea.ownerDocument === doc) {
                record.connected = true;
                refreshers.get(handle)?.();
                const root = handle.textarea.getRootNode();
                if (root instanceof view.ShadowRoot) observeShadow(root);
            } else if (record.connected) handle.destroy();
        }
        for (const [root, observer] of roots) {
            if (!root.host.isConnected || root.host.ownerDocument !== doc) {
                observer.disconnect();
                roots.delete(root);
            }
        }
    };
    const scan = (root: ParentNode) => {
        if ((root as Node).nodeType === 1 && /^(writemark-editor|md-live-editor)$/.test((root as Element).localName)) return;
        enhanceTextareas(root);
        const elements = (root as Node).nodeType === 1 ? [root as Element, ...root.querySelectorAll("*")] : Array.from(root.querySelectorAll("*"));
        for (const element of elements) {
            if (element.shadowRoot && !/^(writemark-editor|md-live-editor)$/.test(element.localName)) {
                observeShadow(element.shadowRoot);
                scan(element.shadowRoot);
            }
        }
    };
    const mutations: MutationCallback = records => {
        cleanup();
        if (!automatic) return;
        for (const record of records) {
            if (record.type === "attributes") {
                const target = record.target as Element;
                if (target.matches("textarea[data-writemark]")) enhanceTextareas(target);
            } else {
                for (const added of record.addedNodes) {
                    if (added.isConnected && added.nodeType === 1) scan(added as Element);
                }
            }
        }
    };
    const observeShadow = (root: ShadowRoot) => {
        if (!root.host.isConnected || roots.has(root)) return;
        const observer = new view.MutationObserver(mutations);
        observer.observe(root, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["data-writemark", "for", "id"] });
        roots.set(root, observer);
    };
    const observer = new view.MutationObserver(mutations);
    observer.observe(doc, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["data-writemark", "for", "id"] });
    const manager: EnhancementManager = {
        watch: observeShadow,
        add(handle, refresh) {
            refreshers.set(handle, refresh);
            const record = { reference: new WeakRef(handle), connected: handle.textarea.isConnected };
            handles.add(record);
            const root = handle.textarea.getRootNode();
            if (root instanceof view.ShadowRoot) observeShadow(root);
            return () => { handles.delete(record); refreshers.delete(handle); };
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

export function startTextareaEnhancement(): void {
    if (typeof document === "undefined") return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => managerFor(document).start(), { once: true });
    else managerFor(document).start();
}
