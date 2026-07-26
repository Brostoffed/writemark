export const hostileMarkdownCases = [
  {
    name: "raw script element",
    markdown: "<script>alert(document.domain)</script>"
  },
  {
    name: "mixed-case script element",
    markdown: "<ScRiPt src=https://attacker.invalid/x.js></sCrIpT>"
  },
  {
    name: "raw image event handler",
    markdown: '<img src=x onerror="alert(1)">'
  },
  {
    name: "SVG load handler",
    markdown: '<svg><g onload="alert(1)"></g></svg>'
  },
  {
    name: "iframe srcdoc payload",
    markdown: '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
  },
  {
    name: "object and embed payloads",
    markdown: '<object data="javascript:alert(1)"><embed src="data:text/html,pwned"></object>'
  },
  {
    name: "style expression payload",
    markdown: '<style>@import "https://attacker.invalid/x.css";</style><p style="background:url(javascript:alert(1))">x</p>'
  },
  {
    name: "form-action payload",
    markdown: '<form action="javascript:alert(1)"><button formaction="https://attacker.invalid">go</button></form>'
  },
  {
    name: "javascript Markdown link",
    markdown: "[unsafe](javascript:alert(1))"
  },
  {
    name: "mixed-case JavaScript Markdown link",
    markdown: "[unsafe](JaVaScRiPt:alert(1))"
  },
  {
    name: "javascript reference-style link",
    markdown: "[unsafe][target]\n\n[target]: javascript:alert(1)"
  },
  {
    name: "control-character-obfuscated JavaScript link",
    markdown: "[unsafe](java\u0000script:alert(1))"
  },
  {
    name: "whitespace-obfuscated JavaScript link",
    markdown: "[unsafe](java\tscript:alert(1))"
  },
  {
    name: "VBScript Markdown link",
    markdown: "[unsafe](vbscript:msgbox(1))"
  },
  {
    name: "file Markdown link",
    markdown: "[unsafe](file:///etc/passwd)"
  },
  {
    name: "HTML data URL link",
    markdown: "[unsafe](data:text/html,<script>alert(1)</script>)"
  },
  {
    name: "SVG data URL image",
    markdown: "![unsafe](data:image/svg+xml,<svg onload=alert(1)>)"
  },
  {
    name: "raster data URL image",
    markdown: "![unsafe](data:image/png;base64,iVBORw0KGgo=)"
  },
  {
    name: "image URL event-attribute breakout",
    markdown: '![x" onerror="alert(1)](https://example.com/x.png "title\\" onload=\\"alert(1)")'
  },
  {
    name: "link title event-attribute breakout",
    markdown: '[safe](https://example.com "title\\" onclick=\\"alert(1)")'
  },
  {
    name: "heading attribute breakout",
    markdown: '# hello" autofocus onfocus="alert(1)'
  },
  {
    name: "fence language attribute breakout",
    markdown: "```js\" onmouseover=\"alert(1)\nconst x = 1;\n```"
  },
  {
    name: "script payload inside code fence",
    markdown: "```html\n<script>alert(1)</script>\n```"
  },
  {
    name: "raw HTML inside table cells",
    markdown: "| A | B |\n| --- | --- |\n| <img src=x onerror=alert(1)> | [x](javascript:alert(1)) |"
  },
  {
    name: "raw HTML inside task text",
    markdown: '- [ ] <input autofocus onfocus="alert(1)">'
  },
  {
    name: "raw HTML inside blockquote",
    markdown: '> <video><source onerror="alert(1)"></video>'
  },
  {
    name: "HTML comment and declaration payload",
    markdown: "<!--><script>alert(1)</script>--><!doctype html>"
  },
  {
    name: "entity-obfuscated scheme",
    markdown: "[unsafe](jav&#x61;script:alert(1))"
  },
  {
    name: "percent-encoded scheme-like relative URL",
    markdown: "[encoded](%6a%61%76%61%73%63%72%69%70%74:alert(1))"
  },
  {
    name: "private-use renderer-token text",
    markdown: "`safe code` \uE0000\uE001 **safe strong**"
  },
  {
    name: "prototype-shaped labels and destinations",
    markdown: "[__proto__](constructor) [constructor](prototype)"
  },
  {
    name: "bidirectional controls around unsafe scheme",
    markdown: "[unsafe](\u202Ejavascript:alert(1))"
  },
  {
    name: "deeply malformed delimiter sequence",
    markdown: [
      "[".repeat(512),
      "![*`<script>`*](javascript:alert(1))",
      "](data:text/html,pwned)",
      ")".repeat(512),
      "]".repeat(512)
    ].join("")
  },
  {
    name: "safe URL controls remain usable",
    markdown: [
      "[https](https://example.com/a)",
      "[mail](mailto:test@example.com)",
      "[phone](tel:+15551234567)",
      "[relative](../guide.md)",
      "[fragment](#target)",
      "![local](/tests/fixtures/a_(b).svg)"
    ].join(" "),
    allowedHrefs: [
      "https://example.com/a",
      "mailto:test@example.com",
      "tel:+15551234567",
      "../guide.md",
      "#target"
    ],
    allowedSources: ["/tests/fixtures/a_(b).svg"]
  }
];

export const commonMarkCases = [
  {
    name: "plain paragraph",
    markdown: "alpha beta gamma"
  },
  {
    name: "soft line break",
    markdown: "alpha\nbeta"
  },
  {
    name: "ATX heading",
    markdown: "## Alpha beta"
  },
  {
    name: "setext headings",
    markdown: "Alpha\n=====\n\nBeta\n-----"
  },
  {
    name: "emphasis",
    markdown: "before *alpha beta* after"
  },
  {
    name: "strong emphasis",
    markdown: "before **alpha beta** after"
  },
  {
    name: "combined inline formatting",
    markdown: "**strong** and *emphasis* and `code`"
  },
  {
    name: "nested emphasis inside strong emphasis",
    markdown: "**outer *inner* outer**"
  },
  {
    name: "nested strong emphasis inside emphasis",
    markdown: "*outer **inner** outer*"
  },
  {
    name: "same-marker emphasis nested inside strong emphasis",
    markdown: "**outer **inner** outer**"
  },
  {
    name: "same-marker emphasis nested inside emphasis",
    markdown: "*outer *inner* outer*"
  },
  {
    name: "adjacent triple-delimiter emphasis",
    markdown: "**a** ***b*** **c**"
  },
  {
    name: "multi-backtick code span",
    markdown: "``alpha ` beta``"
  },
  {
    name: "backslash escapes",
    markdown: "\\*literal asterisks\\* and \\[brackets\\]"
  },
  {
    name: "safe link",
    markdown: "[example](https://example.com/a \"Example\")"
  },
  {
    name: "safe image",
    markdown: "![alt text](https://example.com/image.png \"Image\")"
  },
  {
    name: "blockquote",
    markdown: "> alpha\n> beta"
  },
  {
    name: "nested blockquote",
    markdown: "> outer\n> > inner"
  },
  {
    name: "bullet list",
    markdown: "- alpha\n- beta"
  },
  {
    name: "nested bullet list",
    markdown: "- parent\n  - child"
  },
  {
    name: "nested mixed list",
    markdown: "1. parent\n   - child\n   - sibling"
  },
  {
    name: "lazy list continuation",
    markdown: "- first line\ncontinuation"
  },
  {
    name: "indented list continuation",
    markdown: "- first line\n  continuation"
  },
  {
    name: "ordered list",
    markdown: "1. alpha\n2. beta"
  },
  {
    name: "ordered list with non-default start",
    markdown: "3. alpha\n4. beta"
  },
  {
    name: "loose list separated by one blank line",
    markdown: "- alpha\n- beta\n\n- gamma\n- delta"
  },
  {
    name: "full reference link with title",
    markdown: "[guide][docs]\n\n[docs]: https://example.com/guide \"Guide\""
  },
  {
    name: "collapsed reference link",
    markdown: "[guide][]\n\n[guide]: /guide"
  },
  {
    name: "shortcut reference link",
    markdown: "[guide]\n\n[guide]: /guide"
  },
  {
    name: "two-space hard line break",
    markdown: "alpha  \nbeta"
  },
  {
    name: "backslash hard line break",
    markdown: "alpha\\\nbeta"
  },
  {
    name: "thematic break",
    markdown: "---"
  },
  {
    name: "backtick fenced code",
    markdown: "```js\nconst x = 1;\n```"
  },
  {
    name: "tilde fenced code",
    markdown: "~~~\nalpha\nbeta\n~~~"
  },
  {
    name: "multiple simple blocks",
    markdown: "# Heading\n\nParagraph with **strong** text.\n\n- one\n- two"
  }
];
