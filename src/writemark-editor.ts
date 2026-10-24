/*
 * <writemark-editor> v1.8.1 live inline Markdown editor.
 * Dependency-free. No network calls. Markdown source is canonical.
 */
import { WritemarkEditorElement as Editor, MdLiveEditorElement as LegacyEditor } from "./component/register.ts";
import { renderMarkdown as renderMarkdownImpl } from "./render/html.ts";
import { renderInlineMarkdown as renderInlineMarkdownImpl } from "./render/inline.ts";
import { parseBlocks as parseBlocksImpl } from "./markdown/blocks.ts";
import { parseTags as parseTagsImpl } from "./markdown/tags.ts";
import { parseListItem as parseListItemImpl, parseHeading as parseHeadingImpl, parseBlockquote as parseBlockquoteImpl } from "./markdown/block-syntax.ts";
import { htmlToMarkdown as htmlToMarkdownImpl, tsvToMarkdownTable as tsvToMarkdownTableImpl } from "./browser/clipboard.ts";
import type { EditorConstructor, MarkdownOptions, MarkdownBlock, Tag, ListItem, Heading, Blockquote } from "./types.js";
export type * from "./types.js";
export type WritemarkEditorElement = import("./types.js").WritemarkEditorElement;
export type MdLiveEditorElement = import("./types.js").MdLiveEditorElement;
const WritemarkEditorElement: EditorConstructor = Editor;
const MdLiveEditorElement: EditorConstructor = LegacyEditor;
const renderMarkdown: (markdown: string, options?: MarkdownOptions) => string = renderMarkdownImpl;
const renderInlineMarkdown: (markdown: string, options?: MarkdownOptions) => string = renderInlineMarkdownImpl;
const parseBlocks: (markdown: string, options?: MarkdownOptions) => MarkdownBlock[] = parseBlocksImpl;
const parseTags: (markdown: string, options?: MarkdownOptions) => Tag[] = parseTagsImpl;
const parseListItem: (line: string, options?: MarkdownOptions) => ListItem | null = parseListItemImpl;
const parseHeading: (line: string) => Heading | null = parseHeadingImpl;
const parseBlockquote: (line: string) => Blockquote | null = parseBlockquoteImpl;
const htmlToMarkdown: (html: string) => string = htmlToMarkdownImpl;
const tsvToMarkdownTable: (text: string) => string | null = tsvToMarkdownTableImpl;
export { WritemarkEditorElement, MdLiveEditorElement, renderMarkdown, renderInlineMarkdown, parseBlocks, parseTags, parseListItem, parseHeading, parseBlockquote, htmlToMarkdown, tsvToMarkdownTable };
