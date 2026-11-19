# Known issues and issue history

## Remote cursor display in 1.9.0

The cursor API supplies display only.
The host must supply transport and shared document positions.
Preview mode hides remote cursors.
Visible carets and selection fragments remain available when other selection endpoints are outside the mounted view.
At crowded positions, the display hides some names and keeps all visible carets.
Hover reveals a caret name, and the screen-reader roster exposes all names.
Host keyboard controls can set the persistent name policy.
The demo controls sample cursors through the real display API.
It has no shared room or network transport.
Version tuples reject old updates for active peers and bounded retained removal records.
The host owns authentication and messages beyond the five-minute, 256-record retention limit.
Whole document writes cannot identify the intended insertion among repeated identical characters.
Supply exact transaction ranges when they are available.
Physical-device and native IME results remain separate from browser regression results.

## Textarea enhancement in 1.9.0

Automatic enhancement scans opted-in textareas when the document is ready and after document insertions.
It also observes open shadow roots found in scanned inserted subtrees.
Late or closed shadow roots need one `enhanceTextareas(root)` call to register future insertions.
Native prototype value setter calls need an `input` or `change` event to synchronize.
Instance `setRangeText()` calls synchronize immediately.
Direct `textarea.value` assignments synchronize immediately.
Attribute changes synchronize at the next mutation checkpoint.

## Clipboard corpus in 1.9.0

The corpus uses traceable upstream regression inputs with pinned source revisions and license records.
It includes Word and Google Docs producer evidence.
Upstream sources do not state their native capture method.
The native spreadsheet capture covers LibreOffice Calc on Linux.
Fresh Word and Google Docs captures are pending.
Table cells flatten code blocks to inline code and collapse internal line breaks.
The source tree records changes and known losses in `tests/fixtures/clipboard-corpus/manifest.json`.

## Table cell input in 1.8.1

The 1.8.1 source fix preserves cell spaces and keeps the cursor after each typed space.
Backspace removes spaces before it removes a letter.
Local Chromium checks covered pasted tables, rapid and slow Space presses, and header and body cells.

The reported period insertion remains unconfirmed.
Desktop and mobile Safari checks remain pending.

## Issues fixed after Writemark 1.7.0

The September 11, 2026 review confirmed these 15 issues through source checks
and Chromium 149 reproductions. Version 1.7.1 addresses each issue.

| # | Priority | Area | Confirmed behavior in 1.7.0 |
| --- | --- | --- | --- |
| 1 | High | Find and replace | Unicode lowercase conversion can shift offsets. Replacing `x` with `Q` in `İXa` produces `İXQ` and removes `a`. |
| 2 | High | Virtualization | The virtualizer assigns one line of height to each omitted block. Blocks with several lines can cause visible content jumps. |
| 3 | Medium | References | The renderer extracts reference definitions from fenced code and active paragraphs. The extracted text can also affect later links. |
| 4 | Medium | Clipboard | Table detection can override explicit Markdown when the plain-text clipboard value contains tabs. |
| 5 | Medium | HTML paste | The HTML converter does not preserve Markdown delimiter context. It can change text, code spans, links, images, and blank lines. |
| 6 | Medium | Formatting actions | Fixed code delimiters and unescaped link or image fields can produce incorrect Markdown. Code language arguments can inject line breaks. |
| 7 | Medium | Code language | `code.setLanguage` can replace a valid tilde opener with backticks while it keeps the tilde closing fence. |
| 8 | Medium | Heading IDs | `Foo`, `Foo`, and `Foo-1` produce duplicate `foo-1` IDs. |
| 9 | Medium | Links | An apostrophe in a URL destination can prevent the intended link from parsing. |
| 10 | Medium | Block parser | Table detection can consume a valid fenced-code opener whose information string contains a vertical bar. |
| 11 | Medium | Plain text | `getText()` and `getPlainText()` can return HTML entities and remove blank lines from code. |
| 12 | Medium | Active marks | `getActiveMarks()` can disagree with code, emphasis, and escape parsing. |
| 13 | Medium | Copy | A line of unmatched opening brackets causes repeated forward scans. Copy time grows about fourfold when the line length doubles. |
| 14 | Medium/Low | Deletion | A single character deletion can send the entire source to `Intl.Segmenter` and build all grapheme boundaries. |
| 15 | Low/Medium | Rendering | Literal private-use characters can match internal placeholders and become duplicate rendered content. |

These measurements describe 1.7.0 before the fixes.

The virtualization reproduction used 2,600 code blocks with ten lines per
block. At scrollTop 4000, a scroll event changed the first visible block from
13 to 70. The scroll position did not change.

The copy reproduction selected one character from a line of unmatched opening
brackets. Five samples gave these median handler times:

| Line length | Median copy time |
| ---: | ---: |
| 4,000 | 18.9 ms |
| 8,000 | 76.2 ms |
| 16,000 | 298.2 ms |

The deletion reproduction used a collapsed selection at offset 2. The
segmenter received all 30,003 source characters for one character deletion.
That sample took 13.1 ms. It does not establish latency across document sizes
or devices.

In 1.7.0, HTML paste removed internal blank lines from `<pre>` content. The
final conversion step reduced each run of three or more newlines to two.
For example, the payload `before\n\n\nafter` became `before\n\nafter`.

The original checks established correctness and performance defects. They did
not establish an XSS or code-execution security result.
