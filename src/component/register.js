import { WritemarkEditorElement as Editor } from "./element.js";
import { TAG_NAME, LEGACY_TAG_NAME } from "../config.js";

const registry = globalThis.customElements;
export const WritemarkEditorElement = registry?.get(TAG_NAME) || Editor;
if (registry && !registry.get(TAG_NAME)) registry.define(TAG_NAME, WritemarkEditorElement);
const LegacyEditor = class MdLiveEditorElement extends WritemarkEditorElement {};
export const MdLiveEditorElement = registry?.get(LEGACY_TAG_NAME) || LegacyEditor;
if (registry && !registry.get(LEGACY_TAG_NAME)) registry.define(LEGACY_TAG_NAME, MdLiveEditorElement);
