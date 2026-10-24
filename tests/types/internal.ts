import type { CompletionHost, InputHost } from "../../src/browser/types.ts";
import type { ActionResult, MarkdownBlock, CompletionState } from "../../src/types.ts";

const documentPort: Pick<InputHost, "getValue" | "setValue"> = {
  getValue: () => "markdown",
  setValue: (value: string) => { void value; },
};
// @ts-expect-error The document port accepts a string.
documentPort.setValue(false);
// @ts-expect-error The controller cannot omit its setValue capability.
const missingCapability: Pick<InputHost, "getValue" | "setValue"> = { getValue: () => "" };
declare const dispatch: CompletionHost["dispatch"];
dispatch("md-input", { value: "", source: "api", inputType: null });
// @ts-expect-error The event payload requires a string value.
dispatch("md-input", { value: 1, source: "api", inputType: null });
// @ts-expect-error The event payload belongs to a different event.
dispatch("md-render", { dirty: true });
declare const block: MarkdownBlock;
if (block.type === "table") block.header.cells;
// @ts-expect-error A code fence cannot omit its source lines and fence.
const brokenFence: MarkdownBlock = { type: "code-fence", from: 0, to: 0, newlineEnd: 0 };
// @ts-expect-error A loading completion requires an abort controller.
const brokenRequest: CompletionState = { status: "loading", open: false, providerId: "tags", match: { from: 0, to: 0, query: "" }, items: [], activeIndex: 0, requestId: 1, abort: null };
declare const result: ActionResult;
if (!result.ok) {
  result.reason;
  // @ts-expect-error A failed action cannot supply a transaction.
  result.transaction;
}
void missingCapability; void brokenFence; void brokenRequest;
