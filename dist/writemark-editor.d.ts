export type WritemarkEditorElement = import("./types.js").WritemarkEditorElement;
export type MdLiveEditorElement = import("./types.js").MdLiveEditorElement;
export type Action = import("./types.js").Action;
export type ActionContext = import("./types.js").ActionContext;
export type ActionResult = import("./types.js").ActionResult;
export type Transaction = import("./types.js").Transaction;
export type TextChange = import("./types.js").TextChange;
export type SourceSelection = import("./types.js").SourceSelection;
export type Snapshot = import("./types.js").Snapshot;
export type Tag = import("./types.js").Tag;
export type TagProvider = import("./types.js").TagProvider;
export type CompletionProvider = import("./types.js").CompletionProvider;
export type CompletionItem = import("./types.js").CompletionItem;
export type CompletionMatch = import("./types.js").CompletionMatch;
export type MarkdownOptions = import("./types.js").MarkdownOptions;
export type MarkdownBlock = import("./types.js").MarkdownBlock;
export type EditorMode = import("./types.js").EditorMode;
export type PreviewMode = import("./types.js").PreviewMode;
export type MarkdownFlavor = import("./types.js").MarkdownFlavor;
export type FindOptions = import("./types.js").FindOptions;
export type FindMatch = import("./types.js").FindMatch;
export type WritemarkEventMap = import("./types.js").WritemarkEventMap;
/** @typedef {import("./types.js").WritemarkEditorElement} WritemarkEditorElement */
/** @typedef {import("./types.js").MdLiveEditorElement} MdLiveEditorElement */
/** @type {import("./types.js").EditorConstructor} */
export const WritemarkEditorElement: import("./types.js").EditorConstructor;
/** @type {import("./types.js").EditorConstructor} */
export const MdLiveEditorElement: import("./types.js").EditorConstructor;
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => string} */
export const renderMarkdown: (markdown: string, options?: import("./types.js").MarkdownOptions) => string;
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => string} */
export const renderInlineMarkdown: (markdown: string, options?: import("./types.js").MarkdownOptions) => string;
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").MarkdownBlock[]} */
export const parseBlocks: (markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").MarkdownBlock[];
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").Tag[]} */
export const parseTags: (markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").Tag[];
/** @type {(line: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").ListItem | null} */
export const parseListItem: (line: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").ListItem | null;
/** @type {(line: string) => import("./types.js").Heading | null} */
export const parseHeading: (line: string) => import("./types.js").Heading | null;
/** @type {(line: string) => import("./types.js").Blockquote | null} */
export const parseBlockquote: (line: string) => import("./types.js").Blockquote | null;
/** @type {(html: string) => string} */
export const htmlToMarkdown: (html: string) => string;
/** @type {(text: string) => string} */
export const tsvToMarkdownTable: (text: string) => string;

declare global {
  interface HTMLElementTagNameMap {
    "writemark-editor": WritemarkEditorElement;
    "md-live-editor": MdLiveEditorElement;
  }
}
