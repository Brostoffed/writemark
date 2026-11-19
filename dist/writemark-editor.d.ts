import type { EditorConstructor, MarkdownOptions, MarkdownBlock, Tag, ListItem, Heading, Blockquote, TextareaEnhancement } from "./types.js";
export type * from "./types.js";
export type WritemarkEditorElement = import("./types.js").WritemarkEditorElement;
export type MdLiveEditorElement = import("./types.js").MdLiveEditorElement;
declare const WritemarkEditorElement: EditorConstructor;
declare const MdLiveEditorElement: EditorConstructor;
declare const renderMarkdown: (markdown: string, options?: MarkdownOptions) => string;
declare const renderInlineMarkdown: (markdown: string, options?: MarkdownOptions) => string;
declare const parseBlocks: (markdown: string, options?: MarkdownOptions) => MarkdownBlock[];
declare const parseTags: (markdown: string, options?: MarkdownOptions) => Tag[];
declare const parseListItem: (line: string, options?: MarkdownOptions) => ListItem | null;
declare const parseHeading: (line: string) => Heading | null;
declare const parseBlockquote: (line: string) => Blockquote | null;
declare const htmlToMarkdown: (html: string) => string;
declare const tsvToMarkdownTable: (text: string) => string | null;
declare const enhanceTextarea: (textarea: HTMLTextAreaElement) => TextareaEnhancement;
declare const enhanceTextareas: (root?: ParentNode) => TextareaEnhancement[];
export { WritemarkEditorElement, MdLiveEditorElement, renderMarkdown, renderInlineMarkdown, parseBlocks, parseTags, parseListItem, parseHeading, parseBlockquote, htmlToMarkdown, tsvToMarkdownTable, enhanceTextarea, enhanceTextareas };

declare global {
  interface HTMLElementTagNameMap {
    "writemark-editor": WritemarkEditorElement;
    "md-live-editor": MdLiveEditorElement;
  }
}
