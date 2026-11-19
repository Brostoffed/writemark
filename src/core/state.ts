import type { SourceSelection } from "../types.ts";
/** Canonical Markdown and source selection for one editor. */
export class DocumentState {
  private _value = "";
  revision = 0;
  get value() { return this._value; }
  set value(value: string) {
    if (value !== this._value) { this._value = value; this.revision += 1; }
  }
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
