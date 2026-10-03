import {
  WritemarkEditorElement, MdLiveEditorElement, renderMarkdown, renderInlineMarkdown,
  parseTags, parseBlocks, parseHeading, parseBlockquote, parseListItem,
  htmlToMarkdown, tsvToMarkdownTable,
  type Action, type CompletionProvider, type TagProvider, type SourceSelection,
} from "writemark-editor";
import { WritemarkEditorElement as ExplicitEditor } from "writemark-editor/writemark-editor.js";
import { MdLiveEditorElement as LegacyEditor } from "writemark-editor/md-live-editor.js";

const editor: WritemarkEditorElement = new ExplicitEditor();
const legacy: MdLiveEditorElement = new LegacyEditor();
class ExtendedEditor extends WritemarkEditorElement {
  override connectedCallback() { super.connectedCallback(); }
  greeting() { return this.getMarkdown(); }
}
customElements.define("extended-writemark", ExtendedEditor);
editor.value = "# Hello";
editor.mode = "source";
editor.preview = "below";
editor.markdownFlavor = "commonmark";
editor.tagsEnabled = true;
editor.shiftEnterBehavior = "smart-enter";
editor.tabBehavior = "editor-first";
editor.setSelectionRange(0, 2, "backward");
editor.focus({ preventScroll: true });
const tags: string[] = editor.getTags().map(tag => tag.key);
const found: number | undefined = editor.find("Hello")?.start;
const formValid: boolean = editor.validity.valid;
const selection: SourceSelection = { start: 0, end: 0, direction: "none" };
const action: Action = {
  id: "example", label: "Example", structural: false,
  run(context) {
    const contentStart: number = context.currentLine.contentStart;
    const listMarker: string | undefined = context.block.list?.markerText;
    void contentStart; void listMarker;
    return { ok: true, transaction: {
      changes: [{ from: context.selectionStart, to: context.selectionEnd, insert: "hello" }],
      selectionAfter: selection,
    } };
  },
};
editor.registerAction(action);
const provider: CompletionProvider = {
  id: "example", match: context => ({ from: 0, to: context.selectionEnd, query: "" }),
  async getItems(_match, _context, signal) { return signal.aborted ? [] : [{ id: "one", label: "One" }]; },
  apply: () => ({ ok: false, reason: "not-applicable" }),
};
editor.registerCompletionProvider(provider);
const tagProvider: TagProvider = { getItems: request => request.documentTags.map(tag => tag.value) };
editor.tagProvider = tagProvider;
editor.addEventListener("md-input", event => {
  const value: string = event.detail.value;
  // @ts-expect-error The value is a string.
  const bad: number = event.detail.value;
  void value; void bad;
});
editor.addEventListener("md-before-change", event => {
  const insert: string | undefined = event.detail.transaction.changes[0]?.insert;
  event.preventDefault();
  void insert;
});
editor.addEventListener("click", event => { const x: number = event.clientX; void x; });
document.createElement("writemark-editor").getTags();
document.querySelector("md-live-editor")?.getMarkdown();
renderMarkdown("hello", { markdownFlavor: "gfm", tagsEnabled: true });
renderInlineMarkdown("hello");
parseTags("#tag")[0]?.ranges[0]?.from;
parseBlocks("# Hello")[0]?.heading?.contentStart;
const tableOffset: number | undefined = parseBlocks("| a | b |\n| --- | --- |")[0]?.header?.cells[0]?.from;
parseHeading("# Hello")?.markerText;
parseBlockquote("> Hello")?.fullContentStart;
parseListItem("1. Hello")?.number;
htmlToMarkdown("<b>Hello</b>");
tsvToMarkdownTable("a\tb");
// @ts-expect-error Invalid mode.
editor.mode = "unknown";
// @ts-expect-error Invalid direction.
editor.setSelectionRange(0, 1, "left");
// @ts-expect-error Missing completion methods.
editor.registerCompletionProvider({ id: "bad" });
// @ts-expect-error Missing action function.
editor.registerAction({ id: "bad" });
// @ts-expect-error The implementation state is private.
editor._value;
// @ts-expect-error Markdown must be a string.
renderMarkdown(42);
// @ts-expect-error Required parser fields must match the runtime shape.
const invalidListNumber: string | undefined = parseListItem("1. Hello")?.number;
void tags; void found; void formValid; void legacy; void invalidListNumber;
void tableOffset;
