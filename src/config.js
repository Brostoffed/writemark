

export const TAG_NAME = "writemark-editor";

export const LEGACY_TAG_NAME = "md-live-editor";

export const DEFAULTS = Object.freeze({
  debug: 0,
  mode: "live",
  preview: "none",
  markdownFlavor: "gfm",
  tagsEnabled: false,
  shiftEnterBehavior: "soft-break",
  tabBehavior: "accessibility-first",
  indentString: "  ",
  placeholder: "Write markdown...",
  renderDebounceMs: 100,
  smallDocChars: 20_000,
  largeDocChars: 100_000,
  linkTarget: "_self",
  allowRawHtml: false,
  sanitize: true,
  emptyRequiredTrim: true,
});

export const REFLECTED_ATTRIBUTES = [
  "name",
  "value",
  "label",
  "placeholder",
  "mode",
  "preview",
  "markdown-flavor",
  "tags-enabled",
  "shift-enter-behavior",
  "tab-behavior",
  "indent-string",
  "debug",
  "debug-log",
  "required",
  "disabled",
  "readonly",
  "spellcheck",
  "maxlength",
  "minlength",
  "aria-label",
  "aria-labelledby",
  "dir",
];

export const LANGUAGES = [
  "python", "javascript", "typescript", "tsx", "jsx", "html", "css", "json", "bash", "shell", "sh",
  "sql", "yaml", "toml", "xml", "markdown", "text", "go", "rust", "java", "c", "cpp", "csharp",
  "php", "ruby", "swift", "kotlin", "r", "scala", "dockerfile", "nginx", "graphql", "regex"
];

export const ALIASES = new Map([
  ["py", "python"],
  ["js", "javascript"],
  ["ts", "typescript"],
  ["yml", "yaml"],
  ["md", "markdown"],
  ["rb", "ruby"],
  ["rs", "rust"],
  ["cs", "csharp"],
  ["kt", "kotlin"],
]);

export const LIVE_ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

export const NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

export const LIVE_STRUCTURAL_BLOCK_TYPES = new Set([
  "blockquote",
  "bullet-list-item",
  "heading",
  "horizontal-rule",
  "ordered-list-item",
  "table",
  "task-list-item"
]);

export function normalizeIndentAttribute(value) {
  if (value === "tab" || value === "\\t") return "\t";
  if (value === "4" || value === "4-spaces") return "    ";
  if (value === "2" || value === "2-spaces") return "  ";
  if (value === "\t" || value === "  " || value === "    ") return value;
  return DEFAULTS.indentString;
}
