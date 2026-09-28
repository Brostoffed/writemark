import fc from "fast-check";
import { expect, test } from "./support/editor-fixture.js";

test.use({ tagsEnabled: true });

const TAG_FUZZ_SEED = 0x7a65;
const TAG_RANGE_SEED = 0x7a66;
const TAG_COMPLETION_SEED = 0x7a67;
const FUZZ_RUNS = 250;

const tagCharacter = fc.constantFrom(
  "a", "b", "Z", "0", "1", "_", "-", "é", "東", "д", "٣"
);
const tagSegment = fc.array(tagCharacter, { minLength: 1, maxLength: 16 })
  .map(characters => characters.join(""));
const validTag = fc.array(tagSegment, { minLength: 1, maxLength: 4 })
  .map(segments => segments.join("/"))
  .filter(value => /[\p{L}\p{M}_-]/u.test(value));
const numericTag = fc.array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"), {
  minLength: 1,
  maxLength: 30
}).map(characters => characters.join(""));

function samples(arbitrary, seed, count = FUZZ_RUNS) {
  return fc.sample(arbitrary, { numRuns: count, seed });
}

test.describe("tag parser fuzzing", () => {
  test("round-trips valid tags through every supported text container", async ({ editor }) => {
    const cases = samples(fc.record({
      tag: validTag,
      wrapper: fc.constantFrom("paragraph", "heading", "quote", "list", "table", "link", "reference")
    }), TAG_FUZZ_SEED);
    const issues = await editor.host.evaluate(async (_element, generated) => {
      const { parseTags } = await import("/dist/writemark-editor.js");
      const problems = [];
      const markdownFor = ({ tag, wrapper }) => ({
        heading: `## Heading #${tag}`,
        link: `[#${tag}](https://example.com)`,
        list: `- item #${tag}`,
        paragraph: `text #${tag}.`,
        quote: `> text #${tag}`,
        reference: `[#${tag}][ref]\n\n[ref]: https://example.com`,
        table: `| #${tag} | value |\n| --- | --- |\n| x | y |`
      })[wrapper];

      generated.forEach((entry, index) => {
        const markdown = markdownFor(entry);
        const tags = parseTags(markdown);
        if (tags.length !== 1) {
          problems.push(`${index}: expected one tag, got ${tags.length}`);
          return;
        }
        const expectedKey = entry.tag.normalize("NFC").toLowerCase();
        if (tags[0].key !== expectedKey || tags[0].count !== 1) {
          problems.push(`${index}: wrong tag ${JSON.stringify(tags[0])}`);
        }
        const range = tags[0].ranges[0];
        if (markdown.slice(range.from, range.to) !== `#${entry.tag}`) {
          problems.push(`${index}: wrong range ${range.from}:${range.to}`);
        }
      });
      return problems;
    }, cases);

    expect(issues).toEqual([]);
  });

  test("rejects generated numeric and attached tags", async ({ editor }) => {
    const cases = samples(fc.tuple(validTag, numericTag), TAG_FUZZ_SEED + 1);
    const issues = await editor.host.evaluate(async (_element, generated) => {
      const { parseTags } = await import("/dist/writemark-editor.js");
      const problems = [];
      generated.forEach(([tag, digits], index) => {
        const inputs = [
          `#${digits}`,
          `word#${tag}`,
          `C#${tag}`,
          `\\#${tag}`,
          `https://example.com/#${tag}`,
          `[label](https://example.com/#${tag})`,
          `\`#${tag}\``,
          `\`\`\`\n#${tag}\n\`\`\``
        ];
        for (const input of inputs) {
          if (parseTags(input).length) {
            problems.push(`${index}: parsed excluded input ${input}`);
            break;
          }
        }
      });
      return problems;
    }, cases);

    expect(issues).toEqual([]);
  });

  test("keeps generated indexes deterministic, unique, and in bounds", async ({ editor }) => {
    const markdownArbitrary = fc.array(fc.oneof(
      fc.string({ maxLength: 40 }),
      validTag.map(tag => ` #${tag} `),
      validTag.map(tag => ` \`#${tag}\` `),
      validTag.map(tag => ` [label](https://example.com/#${tag}) `),
      numericTag.map(tag => ` #${tag} `),
      fc.constant("\n")
    ), { minLength: 1, maxLength: 30 }).map(parts => parts.join(""));
    const cases = samples(markdownArbitrary, TAG_RANGE_SEED);
    const issues = await editor.host.evaluate(async (_element, generated) => {
      const { parseTags, renderMarkdown } = await import("/dist/writemark-editor.js");
      const problems = [];

      generated.forEach((markdown, index) => {
        const normalized = markdown.replace(/\r\n?/g, "\n");
        const first = parseTags(markdown);
        const second = parseTags(markdown);
        if (JSON.stringify(first) !== JSON.stringify(second)) {
          problems.push(`${index}: nondeterministic parser output`);
          return;
        }
        const keys = new Set();
        for (const tag of first) {
          if (keys.has(tag.key)) problems.push(`${index}: duplicate key ${tag.key}`);
          keys.add(tag.key);
          if (tag.count !== tag.ranges.length) problems.push(`${index}: count mismatch ${tag.key}`);
          let priorTo = -1;
          for (const range of tag.ranges) {
            if (!Number.isInteger(range.from) || !Number.isInteger(range.to)) {
              problems.push(`${index}: noninteger range ${tag.key}`);
              continue;
            }
            if (range.from < 0 || range.from >= range.to || range.to > normalized.length) {
              problems.push(`${index}: range out of bounds ${range.from}:${range.to}`);
            }
            if (range.from < priorTo) problems.push(`${index}: unsorted range ${tag.key}`);
            priorTo = range.to;
            const slicedKey = normalized.slice(range.from + 1, range.to)
              .normalize("NFC")
              .toLowerCase();
            if (slicedKey !== tag.key) problems.push(`${index}: range key mismatch ${tag.key}`);
          }
        }

        const template = document.createElement("template");
        template.innerHTML = renderMarkdown(markdown, { tagsEnabled: true });
        for (const span of template.content.querySelectorAll(".md-tag")) {
          const allowed = new Set(["class", "data-md-tag", "data-tag-key", "part"]);
          for (const attribute of span.attributes) {
            if (!allowed.has(attribute.name)) {
              problems.push(`${index}: unexpected tag attribute ${attribute.name}`);
            }
            if (attribute.name.startsWith("on")) {
              problems.push(`${index}: executable tag attribute ${attribute.name}`);
            }
          }
        }
      });
      return problems;
    }, cases);

    expect(issues).toEqual([]);
  });
});

test.describe("tag completion fuzzing", () => {
  test("filters and returns generated host catalogs by normalized prefix", async ({ editor }) => {
    const cases = samples(fc.array(validTag, { minLength: 1, maxLength: 40 }).map(catalog => {
      const target = catalog[0];
      const queryLength = Math.max(1, Math.min(target.length, Math.ceil(target.length / 2)));
      return { catalog: [target, ...catalog], query: target.slice(0, queryLength), target };
    }), TAG_COMPLETION_SEED, 100);
    const issues = await editor.host.evaluate(async (editor, generated) => {
      const problems = [];
      const valid = value => {
        if (!value || value.startsWith("/") || value.endsWith("/") || value.includes("//")) return false;
        if (!value.split("/").every(segment => segment && [...segment]
          .every(character => /[\p{L}\p{M}\p{N}_-]/u.test(character)))) return false;
        return /[\p{L}\p{M}_-]/u.test(value);
      };

      for (let index = 0; index < generated.length; index += 1) {
        const entry = generated[index];
        editor.value = `#${entry.query}`;
        editor.tagProvider = { getItems: () => entry.catalog };
        const match = { from: 0, query: entry.query, to: entry.query.length + 1 };
        const items = await editor._getTagItems(
          match,
          editor._getContext(),
          new AbortController().signal
        );
        const queryKey = entry.query.normalize("NFC").toLowerCase();
        const values = items.map(item => item.value);
        if (!values.includes(entry.target)) problems.push(`${index}: target missing`);
        if (items.length > 24) problems.push(`${index}: result bound exceeded`);
        const keys = new Set();
        for (const item of items) {
          const key = item.value.normalize("NFC").toLowerCase();
          if (!valid(item.value)) problems.push(`${index}: invalid result ${item.value}`);
          if (!key.startsWith(queryKey)) problems.push(`${index}: prefix mismatch ${item.value}`);
          if (keys.has(key)) problems.push(`${index}: duplicate result ${item.value}`);
          keys.add(key);
        }
      }
      return problems;
    }, cases);

    expect(issues).toEqual([]);
  });

  test("never exposes generated invalid provider values", async ({ editor }) => {
    const invalidCatalogs = samples(fc.array(fc.oneof(
      fc.string({ maxLength: 30 }),
      numericTag,
      validTag.map(tag => `/${tag}`),
      validTag.map(tag => `${tag}/`),
      validTag.map(tag => `${tag}//child`),
      validTag.map(tag => `${tag} with space`)
    ), { minLength: 1, maxLength: 50 }), TAG_COMPLETION_SEED + 1, 100);
    const issues = await editor.host.evaluate(async (editor, generated) => {
      const problems = [];
      for (let index = 0; index < generated.length; index += 1) {
        editor.value = "#";
        editor.tagProvider = { getItems: () => generated[index] };
        const items = await editor._getTagItems(
          { from: 0, query: "", to: 1 },
          editor._getContext(),
          new AbortController().signal
        );
        for (const item of items) {
          const value = item.value;
          const validSegments = value.split("/").every(segment => segment
            && [...segment].every(character => /[\p{L}\p{M}\p{N}_-]/u.test(character)));
          if (!validSegments || !/[\p{L}\p{M}_-]/u.test(value)) {
            problems.push(`${index}: invalid output ${value}`);
          }
        }
      }
      return problems;
    }, invalidCatalogs);

    expect(issues).toEqual([]);
  });
});
