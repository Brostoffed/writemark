

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttribute(value: unknown) { return escapeHtml(value).replace(/`/g, "&#96;"); }

export function isProbablyUrl(text: unknown) { return /^(https?:\/\/|mailto:|tel:|\/|#|\.\/|\.\.\/)[^\s]+$/i.test(String(text ?? "").trim()); }

export function isSafeUrl(url: string, { allowDataImage = false }: { allowDataImage?: boolean } = {}) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (compact.startsWith("javascript:") || compact.startsWith("vbscript:") || compact.startsWith("file:")) return false;
  if (compact.startsWith("data:")) return allowDataImage && /^data:image\/(png|gif|jpe?g|webp);/i.test(compact);
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return /^(https?:|mailto:|tel:)/i.test(raw);
  return true;
}

export function safeHref(url: string, opts: { allowDataImage?: boolean } = {}) { const raw = String(url ?? "").trim(); return raw === "" ? "" : isSafeUrl(raw, opts) ? raw : "#"; }

export function escapeMarkdownLabel(value: unknown) { return String(value ?? "").replace(/[\\\[\]]/g, "\\$&").replace(/\r\n?|\n/g, " "); }

export function markdownLinkDestination(value: unknown) {
  const raw = String(value ?? "");
  if (/[\r\n\u0000-\u001F\u007F]/.test(raw)) return null;
  return raw.replace(/[\s()<>"'\\]/gu, char => encodeURIComponent(char).replace(/[!'()*]/g, nested => `%${nested.charCodeAt(0).toString(16).toUpperCase()}`));
}

export function codeLanguage(value: unknown) {
  const raw = String(value ?? "").trim();
  if (/[\r\n\u2028\u2029\u0000-\u0008\u000B-\u001F\u007F`~\\]/.test(raw)) return null;
  const language = raw.replace(/[ \t]+/g, "-");
  return /^[\p{L}\p{N}_+.-]*$/u.test(language) ? language : null;
}
