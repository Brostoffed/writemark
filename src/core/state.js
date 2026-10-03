/** Canonical Markdown and source selection for one editor. */
export class DocumentState {
  constructor() {
    this.value = "";
    this.defaultValue = "";
    this.selection = { start: 0, end: 0, direction: "none" };
    this.dirty = false;
  }
}

// Distribution pipeline contract check.
