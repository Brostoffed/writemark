import * as commonmark from "commonmark";
import fc from "fast-check";
import {
  commonMarkCases,
  hostileMarkdownCases
} from "./fixtures/markdown-security-corpus.js";
import { expect, test } from "./support/editor-fixture.js";

const DEFAULT_FUZZ_RUNS = 200;
const SECURITY_SEED = 0x5eca11;
const RANGE_SEED = 0xb10c5;
const DIFFERENTIAL_SEED = 0xc0ffee;

const referenceParser = new commonmark.Parser();
const referenceRenderer = new commonmark.HtmlRenderer({ safe: true });

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function fuzzParameters(defaultSeed) {
  const parameters = {
    endOnFailure: true,
    numRuns: positiveInteger(
      process.env.WRITEMARK_FUZZ_RUNS,
      DEFAULT_FUZZ_RUNS
    ),
    seed: positiveInteger(process.env.WRITEMARK_FUZZ_SEED, defaultSeed)
  };
  if (process.env.WRITEMARK_FUZZ_PATH) {
    parameters.path = process.env.WRITEMARK_FUZZ_PATH;
  }
  return parameters;
}

function renderReferenceMarkdown(markdown) {
  return referenceRenderer.render(referenceParser.parse(markdown));
}

async function auditMarkdown(page, markdown, options = {}) {
  return page.evaluate(async ({ markdown: source, options: rendererOptions }) => {
    const { renderMarkdown } = await import("/dist/writemark-editor.js");
    const editor = document.querySelector("#editor");
    const rendered = renderMarkdown(source, rendererOptions);
    editor.value = source;

    const forbiddenTags = new Set([
      "audio",
      "base",
      "button",
      "embed",
      "form",
      "iframe",
      "link",
      "math",
      "meta",
      "object",
      "script",
      "select",
      "source",
      "style",
      "svg",
      "textarea",
      "track",
      "video"
    ]);
    const allowedRenderedAttributes = {
      a: new Set(["href", "rel", "target", "title"]),
      blockquote: new Set(),
      code: new Set(["class"]),
      del: new Set(),
      div: new Set(["class"]),
      em: new Set(),
      h1: new Set(["id"]),
      h2: new Set(["id"]),
      h3: new Set(["id"]),
      h4: new Set(["id"]),
      h5: new Set(["id"]),
      h6: new Set(["id"]),
      hr: new Set(),
      img: new Set(["alt", "src", "title"]),
      input: new Set(["checked", "disabled", "type"]),
      li: new Set(),
      ol: new Set(["start"]),
      p: new Set(),
      pre: new Set(),
      strong: new Set(),
      table: new Set(),
      tbody: new Set(),
      td: new Set(["style"]),
      th: new Set(["style"]),
      thead: new Set(),
      tr: new Set(),
      ul: new Set()
    };
    const unsafeUrl = value => {
      const compact = String(value ?? "")
        .replace(/[\u0000-\u001F\u007F\s]+/g, "")
        .toLowerCase();
      const scheme = /^([a-z][a-z0-9+.-]*):/.exec(compact)?.[1];
      return Boolean(
        scheme && !["http", "https", "mailto", "tel"].includes(scheme)
      );
    };

    const inspect = (root, strict) => {
      const issues = [];
      for (const element of root.querySelectorAll("*")) {
        const tag = element.localName;
        if (forbiddenTags.has(tag)) issues.push(`forbidden tag <${tag}>`);
        if (strict && !allowedRenderedAttributes[tag]) {
          issues.push(`unexpected rendered tag <${tag}>`);
        }

        for (const attribute of element.attributes) {
          const name = attribute.name.toLowerCase();
          if (name.startsWith("on")) {
            issues.push(`event handler ${name} on <${tag}>`);
          }
          if (["action", "formaction", "poster", "srcdoc", "xlink:href"].includes(name)) {
            issues.push(`dangerous attribute ${name} on <${tag}>`);
          }
          if (["href", "src"].includes(name) && unsafeUrl(attribute.value)) {
            issues.push(`unsafe ${name} on <${tag}>: ${attribute.value}`);
          }
          const safeStyle = /^text-align:\s*(?:center|left|right)\s*;?$/i.test(attribute.value)
            || (!strict && /^--md-list-depth:\s*\d+\s*;?$/i.test(attribute.value));
          if (name === "style" && !safeStyle) {
            issues.push(`unsafe style on <${tag}>: ${attribute.value}`);
          }
          if (strict
            && allowedRenderedAttributes[tag]
            && !allowedRenderedAttributes[tag].has(name)) {
            issues.push(`unexpected attribute ${name} on <${tag}>`);
          }
        }

        if (tag === "a" && element.target === "_blank") {
          const rel = new Set(element.rel.split(/\s+/).filter(Boolean));
          if (!rel.has("noopener") || !rel.has("noreferrer")) {
            issues.push("_blank link is missing noopener noreferrer");
          }
        }
        if (tag === "input") {
          if (element.type !== "checkbox" || (strict && !element.disabled)) {
            issues.push(strict
              ? "rendered input is not a disabled checkbox"
              : "live input is not a task checkbox");
          }
          if (element.hasAttribute("autofocus")
            || element.hasAttribute("form")
            || element.hasAttribute("name")) {
            issues.push("rendered checkbox can participate in or steal focus from a form");
          }
        }
      }
      return issues;
    };

    const template = document.createElement("template");
    template.innerHTML = rendered;
    const previewIssues = inspect(template.content, true);
    const live = editor.shadowRoot.querySelector(".live-editor");
    const liveIssues = inspect(live, false);

    return {
      hrefs: Array.from(template.content.querySelectorAll("a"), anchor =>
        anchor.getAttribute("href")
      ),
      html: rendered,
      liveIssues,
      previewIssues,
      sources: Array.from(template.content.querySelectorAll("img"), image =>
        image.getAttribute("src")
      )
    };
  }, { markdown, options });
}

async function auditBlockRanges(page, markdown, options = {}) {
  return page.evaluate(async ({ markdown: input, options: parserOptions }) => {
    const { parseBlocks } = await import("/dist/writemark-editor.js");
    const source = String(input ?? "").replace(/\r\n?/g, "\n");
    const blocks = parseBlocks(input, parserOptions);
    const issues = [];
    const allowedTypes = new Set([
      "blank",
      "blockquote",
      "bullet-list-item",
      "code-fence",
      "heading",
      "horizontal-rule",
      "ordered-list-item",
      "paragraph",
      "table",
      "task-list-item"
    ]);

    const validateRange = (from, to, path) => {
      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        issues.push(`${path} has non-integer range ${from}:${to}`);
      } else if (from < 0 || from > to || to > source.length) {
        issues.push(`${path} has out-of-bounds range ${from}:${to}/${source.length}`);
      }
    };

    const visit = (value, path) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }
      if (Object.hasOwn(value, "from") && Object.hasOwn(value, "to")) {
        validateRange(value.from, value.to, path);
      }
      if (Object.hasOwn(value, "start")
        && Object.hasOwn(value, "end")
        && Object.hasOwn(value, "text")) {
        validateRange(value.start, value.end, path);
        if (Number.isInteger(value.start)
          && Number.isInteger(value.end)
          && source.slice(value.start, value.end) !== value.text) {
          issues.push(`${path} text does not match its source range`);
        }
      }
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === "object" && child !== null) {
          visit(child, `${path}.${key}`);
        }
      }
    };

    let expectedFrom = 0;
    blocks.forEach((block, index) => {
      const path = `blocks[${index}]`;
      if (!allowedTypes.has(block.type)) {
        issues.push(`${path} has unknown type ${block.type}`);
      }
      if (block.from !== expectedFrom) {
        issues.push(`${path} starts at ${block.from}, expected ${expectedFrom}`);
      }
      if (!Number.isInteger(block.newlineEnd)
        || block.newlineEnd < block.to
        || block.newlineEnd > source.length) {
        issues.push(`${path} has invalid newlineEnd ${block.newlineEnd}`);
      }
      expectedFrom = block.newlineEnd;
      visit(block, path);
    });
    if (expectedFrom !== source.length) {
      issues.push(`blocks end at ${expectedFrom}, expected ${source.length}`);
    }

    return {
      issues,
      renderOne: (await import("/dist/writemark-editor.js"))
        .renderMarkdown(input, parserOptions),
      renderTwo: (await import("/dist/writemark-editor.js"))
        .renderMarkdown(input, parserOptions)
    };
  }, { markdown, options });
}

async function semanticSnapshots(page, actualHtml, referenceHtml) {
  return page.evaluate(({ actual, reference }) => {
    const snapshot = html => {
      const template = document.createElement("template");
      template.innerHTML = html;
      const inlineParents = new Set([
        "a", "code", "del", "em", "h1", "h2", "h3", "h4", "h5", "h6",
        "li", "p", "strong"
      ]);

      const walk = (node, parentTag = "") => {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue.replace(/\r\n?/g, "\n");
          if (parentTag === "code") text = text.replace(/\n$/, "");
          if (!text.trim()) {
            const blockListItem = parentTag === "li"
              && Array.from(node.parentElement?.children || [])
                .some(child => child.localName === "p");
            return inlineParents.has(parentTag) && !blockListItem ? " " : null;
          }
          return text;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        const tag = node.localName;
        const attributes = {};
        for (const name of ["alt", "class", "href", "src", "start", "title"]) {
          if (node.hasAttribute(name)) attributes[name] = node.getAttribute(name);
        }
        const children = Array.from(node.childNodes)
          .map(child => walk(child, tag))
          .filter(child => child !== null);
        return { attributes, children, tag };
      };

      return Array.from(template.content.childNodes)
        .map(node => walk(node))
        .filter(node => node !== null);
    };

    return {
      actual: snapshot(actual),
      reference: snapshot(reference)
    };
  }, { actual: actualHtml, reference: referenceHtml });
}

const hostileToken = fc.constantFrom(
  "<script>alert(1)</script>",
  '<img src=x onerror="alert(1)">',
  '<svg onload="alert(1)"></svg>',
  "[x](javascript:alert(1))",
  "[x](vbscript:msgbox(1))",
  "[x](data:text/html,pwned)",
  "![x](data:image/svg+xml,<svg onload=alert(1)>)",
  "```html\n<script>alert(1)</script>\n```",
  "\u0000\u0008\u001B\u007F",
  "\u202Ejavascript:alert(1)",
  "\uE0000\uE001",
  "__proto__ constructor prototype"
);
const arbitraryMarkdown = fc.oneof(
  fc.string({ maxLength: 1200 }),
  fc.array(
    fc.oneof(fc.string({ maxLength: 160 }), hostileToken),
    { maxLength: 12 }
  ).map(parts => parts.join("\n"))
);
const rendererCase = fc.record({
  markdown: arbitraryMarkdown,
  options: fc.record({
    linkTarget: fc.constantFrom("_self", "_blank"),
    markdownFlavor: fc.constantFrom("commonmark", "gfm")
  })
});

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const word = fc.array(fc.constantFrom(...alphabet), {
  maxLength: 12,
  minLength: 1
}).map(characters => characters.join(""));
const plainLine = fc.array(word, {
  maxLength: 5,
  minLength: 1
}).map(words => words.join(" "));
const inlineAtom = fc.oneof(
  word,
  word.map(value => `*${value}*`),
  word.map(value => `**${value}**`),
  word.map(value => `\`${value}\``),
  word.map(value => `[${value}](https://example.com/${value})`)
);
const inlineLine = fc.array(inlineAtom, {
  maxLength: 5,
  minLength: 1
}).map(parts => parts.join(" "));
const commonMarkBlock = fc.oneof(
  inlineLine,
  inlineLine.map(value => `# ${value}`),
  inlineLine.map(value => `> ${value}`),
  fc.tuple(inlineLine, inlineLine)
    .map(([first, second]) => `- ${first}\n- ${second}`),
  fc.tuple(inlineLine, inlineLine)
    .map(([first, second]) => `1. ${first}\n2. ${second}`),
  plainLine.map(value => `\`\`\`\n${value}\n\`\`\``),
  fc.constant("---")
);
const generatedCommonMark = fc.array(commonMarkBlock, {
  maxLength: 4,
  minLength: 1
}).map(blocks => blocks.join("\n\n"));

test.describe("hostile Markdown corpus", () => {
  for (const scenario of hostileMarkdownCases) {
    test(scenario.name, async ({ editor, page }) => {
      const audit = await auditMarkdown(page, scenario.markdown, {
        linkTarget: "_blank"
      });
      expect(audit.previewIssues).toEqual([]);
      expect(audit.liveIssues).toEqual([]);
      if (scenario.allowedHrefs) {
        expect(audit.hrefs).toEqual(expect.arrayContaining(scenario.allowedHrefs));
      }
      if (scenario.allowedSources) {
        expect(audit.sources).toEqual(
          expect.arrayContaining(scenario.allowedSources)
        );
      }
      expect(await editor.value()).toBe(scenario.markdown);
    });
  }
});

test.describe("property-based Markdown fuzzing", () => {
  test("arbitrary Markdown renders deterministically without executable output", async ({ editor, page }) => {
    test.setTimeout(180_000);
    const parameters = fuzzParameters(SECURITY_SEED);
    test.info().annotations.push({
      description: `seed=${parameters.seed} runs=${parameters.numRuns}`,
      type: "fuzz"
    });

    await fc.assert(
      fc.asyncProperty(rendererCase, async ({ markdown, options }) => {
        const first = await auditMarkdown(page, markdown, options);
        const second = await auditMarkdown(page, markdown, options);
        if (first.html !== second.html) {
          throw new Error("renderMarkdown returned different HTML for the same input");
        }
        const maximumExpectedLength = (markdown.length * 64) + 4096;
        if (first.html.length > maximumExpectedLength) {
          throw new Error(
            `renderMarkdown amplified ${markdown.length} characters to ${first.html.length}`
          );
        }
        const issues = [...first.previewIssues, ...first.liveIssues];
        if (issues.length) throw new Error(issues.join("\n"));
      }),
      parameters
    );
  });

  test("arbitrary Markdown produces bounded source ranges and stable output", async ({ editor, page }) => {
    test.setTimeout(180_000);
    const parameters = fuzzParameters(RANGE_SEED);
    test.info().annotations.push({
      description: `seed=${parameters.seed} runs=${parameters.numRuns}`,
      type: "fuzz"
    });

    await fc.assert(
      fc.asyncProperty(rendererCase, async ({ markdown, options }) => {
        const audit = await auditBlockRanges(page, markdown, options);
        if (audit.issues.length) throw new Error(audit.issues.join("\n"));
        if (audit.renderOne !== audit.renderTwo) {
          throw new Error("renderMarkdown changed output between identical calls");
        }
      }),
      parameters
    );
  });
});

test.describe("CommonMark differential behavior", () => {
  for (const scenario of commonMarkCases) {
    test(scenario.name, async ({ editor, page }) => {
      const reference = renderReferenceMarkdown(scenario.markdown);
      const actual = await page.evaluate(async markdown => {
        const { renderMarkdown } = await import("/dist/writemark-editor.js");
        return renderMarkdown(markdown, { markdownFlavor: "commonmark" });
      }, scenario.markdown);
      const snapshots = await semanticSnapshots(page, actual, reference);
      expect(snapshots.actual).toEqual(snapshots.reference);
    });
  }

  test("generated unambiguous CommonMark subset matches the reference renderer", async ({ editor, page }) => {
    test.setTimeout(180_000);
    const parameters = fuzzParameters(DIFFERENTIAL_SEED);
    test.info().annotations.push({
      description: `seed=${parameters.seed} runs=${parameters.numRuns}`,
      type: "differential-fuzz"
    });

    await fc.assert(
      fc.asyncProperty(generatedCommonMark, async markdown => {
        const reference = renderReferenceMarkdown(markdown);
        const actual = await page.evaluate(async source => {
          const { renderMarkdown } = await import("/dist/writemark-editor.js");
          return renderMarkdown(source, { markdownFlavor: "commonmark" });
        }, markdown);
        const snapshots = await semanticSnapshots(page, actual, reference);
        if (JSON.stringify(snapshots.actual) !== JSON.stringify(snapshots.reference)) {
          throw new Error([
            "Writemark diverged from the CommonMark reference",
            `actual HTML: ${actual}`,
            `reference HTML: ${reference}`,
            `actual tree: ${JSON.stringify(snapshots.actual)}`,
            `reference tree: ${JSON.stringify(snapshots.reference)}`
          ].join("\n"));
        }
      }),
      parameters
    );
  });
});
