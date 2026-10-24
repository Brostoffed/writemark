import type { SourceRange, MarkdownOptions, MarkdownBlock } from "../types.ts";

export type TableBlock = Extract<MarkdownBlock, {
    type: "table";
}>;
export type CodeFenceBlock = Extract<MarkdownBlock, {
    type: "code-fence";
}>;
export type ReferenceMap = NonNullable<MarkdownOptions["references"]>;
export interface EmphasisRun {
    start: number;
    length: number;
    marker: "*" | "_";
    canOpen: boolean;
    canClose: boolean;
    leftUsed: number;
    rightUsed: number;
    readonly remaining: number;
}
export interface EmphasisPair {
    openStart: number;
    openEnd: number;
    closeStart: number;
    closeEnd: number;
    marker: string;
    tag: "strong" | "em";
}
export interface InlineRange extends SourceRange {
    innerFrom: number;
    innerTo: number;
}
