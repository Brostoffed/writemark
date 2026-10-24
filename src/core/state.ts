import type { SourceSelection } from "../types.ts";
/** Canonical Markdown and source selection for one editor. */
export class DocumentState {
  declare value: string;
  declare defaultValue: string;
  declare selection: SourceSelection;
  declare dirty: boolean;

  constructor() {
    this.value = "";
    this.defaultValue = "";
    this.selection = { start: 0, end: 0, direction: "none" };
    this.dirty = false;
  }
}
