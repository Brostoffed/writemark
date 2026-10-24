import type { EditorConstructor } from "../types.ts";
import { WritemarkEditorElement as Editor } from "./element.ts";
import { TAG_NAME, LEGACY_TAG_NAME } from "../config.ts";

const registry = globalThis.customElements;
export const WritemarkEditorElement = (registry?.get(TAG_NAME) as EditorConstructor | undefined) || Editor;
if (registry && !registry.get(TAG_NAME)) registry.define(TAG_NAME, WritemarkEditorElement);
const LegacyEditor = class MdLiveEditorElement extends WritemarkEditorElement {};
export const MdLiveEditorElement = (registry?.get(LEGACY_TAG_NAME) as EditorConstructor | undefined) || LegacyEditor;
if (registry && !registry.get(LEGACY_TAG_NAME)) registry.define(LEGACY_TAG_NAME, MdLiveEditorElement);
