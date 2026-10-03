/*
 * <writemark-editor> v1.8.0 live inline Markdown editor.
 * Dependency-free. No network calls. Markdown source is canonical.
 */
import { WritemarkEditorElement as Editor, MdLiveEditorElement as LegacyEditor } from "./component/register.js";
import { renderMarkdown as renderMarkdownImpl } from "./render/html.js";
import { renderInlineMarkdown as renderInlineMarkdownImpl } from "./render/inline.js";
import { parseBlocks as parseBlocksImpl } from "./markdown/blocks.js";
import { parseTags as parseTagsImpl } from "./markdown/tags.js";
import { parseListItem as parseListItemImpl, parseHeading as parseHeadingImpl, parseBlockquote as parseBlockquoteImpl } from "./markdown/block-syntax.js";
import { htmlToMarkdown as htmlToMarkdownImpl, tsvToMarkdownTable as tsvToMarkdownTableImpl } from "./browser/clipboard.js";

/** @typedef {import("./types.js").WritemarkEditorElement} WritemarkEditorElement */
/** @typedef {import("./types.js").MdLiveEditorElement} MdLiveEditorElement */
/** @type {import("./types.js").EditorConstructor} */
const WritemarkEditorElement = /** @type {unknown} */ (Editor);
/** @type {import("./types.js").EditorConstructor} */
const MdLiveEditorElement = /** @type {unknown} */ (LegacyEditor);
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => string} */
const renderMarkdown = /** @type {unknown} */ (renderMarkdownImpl);
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => string} */
const renderInlineMarkdown = /** @type {unknown} */ (renderInlineMarkdownImpl);
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").MarkdownBlock[]} */
const parseBlocks = /** @type {unknown} */ (parseBlocksImpl);
/** @type {(markdown: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").Tag[]} */
const parseTags = /** @type {unknown} */ (parseTagsImpl);
/** @type {(line: string, options?: import("./types.js").MarkdownOptions) => import("./types.js").ListItem | null} */
const parseListItem = /** @type {unknown} */ (parseListItemImpl);
/** @type {(line: string) => import("./types.js").Heading | null} */
const parseHeading = /** @type {unknown} */ (parseHeadingImpl);
/** @type {(line: string) => import("./types.js").Blockquote | null} */
const parseBlockquote = /** @type {unknown} */ (parseBlockquoteImpl);
/** @type {(html: string) => string} */
const htmlToMarkdown = /** @type {unknown} */ (htmlToMarkdownImpl);
/** @type {(text: string) => string} */
const tsvToMarkdownTable = /** @type {unknown} */ (tsvToMarkdownTableImpl);
/** @typedef {import("./types.js").Action} Action */
/** @typedef {import("./types.js").ActionContext} ActionContext */
/** @typedef {import("./types.js").ActionResult} ActionResult */
/** @typedef {import("./types.js").Transaction} Transaction */
/** @typedef {import("./types.js").TextChange} TextChange */
/** @typedef {import("./types.js").SourceSelection} SourceSelection */
/** @typedef {import("./types.js").Snapshot} Snapshot */
/** @typedef {import("./types.js").Tag} Tag */
/** @typedef {import("./types.js").TagProvider} TagProvider */
/** @typedef {import("./types.js").CompletionProvider} CompletionProvider */
/** @typedef {import("./types.js").CompletionItem} CompletionItem */
/** @typedef {import("./types.js").CompletionMatch} CompletionMatch */
/** @typedef {import("./types.js").MarkdownOptions} MarkdownOptions */
/** @typedef {import("./types.js").MarkdownBlock} MarkdownBlock */
/** @typedef {import("./types.js").EditorMode} EditorMode */
/** @typedef {import("./types.js").PreviewMode} PreviewMode */
/** @typedef {import("./types.js").MarkdownFlavor} MarkdownFlavor */
/** @typedef {import("./types.js").FindOptions} FindOptions */
/** @typedef {import("./types.js").FindMatch} FindMatch */
/** @typedef {import("./types.js").WritemarkEventMap} WritemarkEventMap */

export { WritemarkEditorElement, MdLiveEditorElement, renderMarkdown, renderInlineMarkdown, parseBlocks, parseTags, parseListItem, parseHeading, parseBlockquote, htmlToMarkdown, tsvToMarkdownTable };
