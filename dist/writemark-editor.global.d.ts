import type * as API from "./writemark-editor.js";
declare global {
  var WritemarkEditor: Readonly<typeof API>;
  interface Window { WritemarkEditor: Readonly<typeof API>; }
}
export {};
