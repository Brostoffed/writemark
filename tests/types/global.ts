import type {} from "writemark-editor/writemark-editor.global.min.js";
import type {} from "writemark-editor/writemark-editor.global.js";

const editor = new WritemarkEditor.WritemarkEditorElement();
const html: string = globalThis.WritemarkEditor.renderMarkdown("hello");
const tags = window.WritemarkEditor.parseTags("#tag");
editor.addEventListener("md-tags-change", event => {
  const key: string | undefined = event.detail.current[0]?.key;
  void key;
});
// @ts-expect-error The global helper takes a string.
WritemarkEditor.parseTags(123);
void html; void tags;
