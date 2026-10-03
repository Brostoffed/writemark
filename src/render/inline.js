import { usesGfm } from "../markdown/block-syntax.js";
import { emphasisPairs, isEscapablePunctuation, matchingBrackets, normalizeCodeSpanContent, parseCodeSpanAt, parseInlineLinkAt, parseReferenceLinkAt, placeholderPrefix } from "../markdown/inline.js";
import { parseTagAt } from "../markdown/tags.js";
import { escapeAttribute, escapeHtml, safeHref } from "../security.js";

export function renderEmphasisMarkdown(source, markerHtml = () => "") {
  const spans = [];
  for (const pair of emphasisPairs(source)) {
    spans.push({
      from: pair.openStart,
      to: pair.openEnd,
      html: `${markerHtml(pair.marker)}<${pair.tag}>`,
    });
    spans.push({
      from: pair.closeStart,
      to: pair.closeEnd,
      html: `</${pair.tag}>${markerHtml(pair.marker)}`,
    });
  }
  spans.sort((a, b) => a.from - b.from || b.to - a.to);
  let html = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.from < cursor) continue;
    html += escapeHtml(source.slice(cursor, span.from));
    html += span.html;
    cursor = span.to;
  }
  html += escapeHtml(source.slice(cursor));
  return html;
}

export function tagHtml(tag) {
  return `<span class="md-tag" part="tag" data-md-tag="${escapeAttribute(tag.value)}" data-tag-key="${escapeAttribute(tag.key)}">#${escapeHtml(tag.value)}</span>`;
}

export function decorateInline(raw, opts = {}) {
  const text = String(raw ?? "");
  const tokens = [];
  const prefix = placeholderPrefix(text);
  const brackets = matchingBrackets(text);
  const reserve = html => {
    const placeholder = `${prefix}${tokens.length}\uE001`;
    tokens.push([placeholder, html]);
    return placeholder;
  };
  const token = t => `<span class="md-token">${escapeHtml(t)}</span>`;
  let prepared = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`") {
      const code = parseCodeSpanAt(text, i);
      if (code) {
        prepared += reserve(`${token(code.marker)}<code>${escapeHtml(code.content)}</code>${token(code.marker)}`);
        i = code.to - 1;
        continue;
      }
    }
    if (text[i] === "\\" && isEscapablePunctuation(text[i + 1])) {
      prepared += reserve(token("\\") + escapeHtml(text[i + 1]));
      i += 2;
      i -= 1;
      continue;
    }
    const link = parseInlineLinkAt(text, i, brackets)
      || parseReferenceLinkAt(text, opts.references, i, brackets);
    if (link) {
      const safe = safeHref(link.url);
      const labelHtml = decorateInline(link.label, opts);
      const prefix = token(`${link.bang}[`);
      const inline = text[link.labelEnd + 1] === "(";
      const suffix = inline
        ? `${token("](")}<span class="md-url">${escapeHtml(link.url)}</span>${token(")")}`
        : token(text.slice(link.labelEnd, link.to));
      const rendered = link.bang
        ? `${prefix}${labelHtml}${suffix}`
        : `${prefix}<a href="${escapeAttribute(safe)}" tabindex="-1">${labelHtml}</a>${suffix}`;
      prepared += reserve(rendered);
      i = link.to - 1;
      continue;
    }
    const tag = opts.tagsEnabled === true ? parseTagAt(text, i) : null;
    if (tag) {
      prepared += reserve(tagHtml(tag));
      i = tag.to - 1;
      continue;
    }
    prepared += text[i];
  }
  if (usesGfm(opts)) {
    prepared = prepared.replace(/~~([^~\n]+)~~/g, (_, content) =>
      reserve(`${token("~~")}<del>${decorateInline(content, opts)}</del>${token("~~")}`));
  }
  const html = renderEmphasisMarkdown(prepared, token);
  let restored = html;
  for (const [placeholder, reserved] of tokens.reverse()) {
    restored = restored.replaceAll(escapeHtml(placeholder), reserved).replaceAll(placeholder, reserved);
  }
  return restored || "<br>";
}

export function renderInlineMarkdown(source, opts = {}) {
  // Preview renderer: sanitize by construction. Unlike decorateInline, markdown delimiters are not retained.
  let text = String(source ?? "");
  const tokens = [];
  const prefix = placeholderPrefix(text);
  const reserve = html => { const token = `${prefix}${tokens.length}\uE001`; tokens.push([token, html]); return token; };
  let codeReserved = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = parseCodeSpanAt(text, i);
    if (!code) { codeReserved += text[i]; continue; }
    codeReserved += reserve(`<code>${escapeHtml(normalizeCodeSpanContent(code.content))}</code>`);
    i = code.to - 1;
  }
  text = codeReserved;
  let escapesReserved = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\\" && isEscapablePunctuation(text[i + 1])) {
      escapesReserved += reserve(escapeHtml(text[i + 1]));
      i += 1;
    } else escapesReserved += text[i];
  }
  text = escapesReserved;
  let linked = "";
  const brackets = matchingBrackets(text);
  for (let i = 0; i < text.length; i += 1) {
    const link = parseInlineLinkAt(text, i, brackets)
      || parseReferenceLinkAt(text, opts.references, i, brackets);
    if (!link) { linked += text[i]; continue; }
    if (link.bang) {
      const safe = safeHref(link.url, { allowDataImage: false });
      linked += (safe === "#" && String(link.url).trim() !== "#")
        ? link.full
        : reserve(`<img src="${escapeAttribute(safe)}" alt="${escapeAttribute(link.label)}"${link.title ? ` title="${escapeAttribute(link.title)}"` : ""}>`);
    } else {
      const safe = safeHref(link.url);
      const target = opts.linkTarget === "_blank" ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
      linked += (safe === "#" && String(link.url).trim() !== "#")
        ? link.label
        : reserve(`<a href="${escapeAttribute(safe)}"${target}${link.title ? ` title="${escapeAttribute(link.title)}"` : ""}>${renderInlineMarkdown(link.label, opts)}</a>`);
    }
    i = link.to - 1;
  }
  text = linked;
  if (opts.tagsEnabled === true) {
    let tagged = "";
    for (let i = 0; i < text.length; i += 1) {
      const tag = parseTagAt(text, i);
      if (!tag) { tagged += text[i]; continue; }
      tagged += reserve(tagHtml(tag));
      i = tag.to - 1;
    }
    text = tagged;
  }
  if (usesGfm(opts)) {
    text = text.replace(/~~([^~\n]+)~~/g, (_, content) =>
      reserve(`<del>${renderInlineMarkdown(content, opts)}</del>`));
  }
  text = text.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?\])}])/g, (match, prefix, url) =>
    `${prefix}${reserve(`<a href="${escapeAttribute(safeHref(url))}">${escapeHtml(url)}</a>`)}`);
  text = text.replace(/(?: {2,}|\\)\n/g, () => `${reserve("<br>")}\n`);
  text = renderEmphasisMarkdown(text);
  for (const [token, html] of tokens.reverse()) text = text.replaceAll(escapeHtml(token), html).replaceAll(token, html);
  return text;
}
