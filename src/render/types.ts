import type { EditorMode, PreviewMode, MarkdownFlavor, SourceSelection, TextChange, MarkdownOptions, MarkdownBlock, DebugDetails, WritemarkEventMap, EventDetail } from "../types.ts";

export type DecorateOptions = MarkdownOptions & {
    linkTarget?: string;
};
export interface VirtualState {
    active: boolean;
    start: number;
    end: number;
    total: number;
    lineHeight: number;
}
export interface VirtualMetrics {
    blocks: MarkdownBlock[];
    lineHeight: number;
    width: number;
    offsets: number[];
}
export interface RenderOptions {
    restoreSelection?: boolean;
    previousValue?: string | null;
    changes?: TextChange[] | null;
    force?: boolean;
    virtualAnchorOffset?: number | null;
}
export interface RenderHost {
    getLiveEditor: () => HTMLElement;
    setLiveEditor: (value: HTMLElement) => void;
    getSourceTextarea: () => HTMLTextAreaElement;
    getValue: () => string;
    _isSourceActive: () => boolean;
    getSelection: () => SourceSelection;
    getIsComposing: () => boolean;
    _restoreLiveSelection: (selection?: SourceSelection | undefined, options?: {
        deferredAttempt?: number;
        requestId?: number;
        strictDocumentRestore?: boolean;
        deferDocumentRestore?: boolean;
    } | undefined) => void;
    getMode: () => EditorMode;
    getPreview: () => PreviewMode;
    getAttribute: (qualifiedName: string) => string | null;
    getPreviewElement: () => HTMLElement;
    setPreview: (value: HTMLElement) => void;
    getHTML: () => string;
    _dispatch: <K extends keyof WritemarkEventMap>(name: K, detail: EventDetail<K>, options?: Pick<CustomEventInit<unknown>, "bubbles" | "composed" | "cancelable">) => WritemarkEventMap[K];
    _emitError: (phase: string, error: unknown, recoverable?: boolean, extra?: Record<string, unknown>) => void;
    _parseOptions: () => MarkdownOptions;
    _rebuildLiveIndex: () => void;
    getLiveIndexDirty: () => boolean;
    setLiveIndexDirty: (value: boolean) => void;
    _debug: (level: number, phase: string, detail?: Record<string, unknown>) => CustomEvent<DebugDetails> | null;
    getPlaceholder: () => string;
    getLiveSelectionAPI: () => boolean | null;
    _computedLineHeight: (el: HTMLElement) => number;
    _rendererOptions: () => {
        tagsEnabled: boolean;
        allowRawHtml: boolean;
        sanitize: boolean;
        linkTarget: "_self";
        references: Map<string, {
            url: string;
            title: string;
        }>;
        markdownFlavor?: MarkdownFlavor;
        gfm?: boolean;
    };
    getIndentString: () => string;
    getDisabled: () => boolean;
    setDisabled: (value: boolean) => void;
    getReadonly: () => boolean;
    setReadonly: (value: boolean) => void;
}
