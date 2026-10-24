import type { RenderOptions } from "../render/types.ts";

export interface ValueChangeOptions extends RenderOptions {
    source?: string;
    inputType?: string | null | undefined;
    silent?: boolean | undefined;
    preserveLiveDom?: boolean;
    recordUndo?: boolean;
    preserveSelection?: boolean;
    undoGroup?: string;
}
export interface TemplateIds {
    label: string;
    source: string;
    live: string;
    completion: string;
    status: string;
    validation: string;
}
