import { fail, ok, tx } from "../core/transactions.js";
import { codeSpanMarkdown } from "../markdown/inline.js";
import { escapeMarkdownLabel, markdownLinkDestination } from "../security.js";

export function wrapInline(ctx, prefix, suffix, label) { const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd); if (selected) { const insert = `${prefix}${selected}${suffix}`; const cursor = ctx.selectionStart + insert.length; return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), `${label}.`); } const insert = `${prefix}${suffix}`; const cursor = ctx.selectionStart + prefix.length; return ok(tx(ctx, `inline.${label.toLowerCase().replace(/\s+/g, "")}`, [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), `${label}.`); }

export function wrapCode(ctx) {
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    const insert = codeSpanMarkdown(selected);
    const cursor = selected ? ctx.selectionStart + insert.length : ctx.selectionStart + 1;
    return ok(tx(ctx, "inline.code", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Inline code.");
  }

export function insertLink(ctx, args = {}) {
    const selected = ctx.value.slice(ctx.selectionStart, ctx.selectionEnd);
    const url = markdownLinkDestination(args.url ?? "");
    if (url == null) return fail("invalid-url");
    const label = escapeMarkdownLabel(selected);
    const insert = `[${label}](${url})`;
    const cursor = selected ? (url ? ctx.selectionStart + insert.length : ctx.selectionStart + label.length + 3) : ctx.selectionStart + 1;
    return ok(tx(ctx, "inline.link", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Link.");
  }

export function insertImage(ctx, args = {}) {
    const alt = escapeMarkdownLabel(args.alt ?? "");
    const src = markdownLinkDestination(args.src ?? "");
    if (src == null) return fail("invalid-url");
    const insert = `![${alt}](${src})`;
    const cursor = alt ? ctx.selectionStart + insert.length : ctx.selectionStart + 2;
    return ok(tx(ctx, "inline.image", [{ from: ctx.selectionStart, to: ctx.selectionEnd, insert }], { start: cursor, end: cursor, direction: "none" }, "inline"), "Image.");
  }
