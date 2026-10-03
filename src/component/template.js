import styles from "./styles.css";

export function renderTemplate(ids) {
  return `<style>${styles}</style>
      <div class="container" part="container">
        <label class="label" part="label" id="${ids.label}" for="${ids.source}"></label>
        <div class="workspace">
          <div class="editor-shell" part="editor">
            <div class="live-editor" part="live-editor" id="${ids.live}" role="textbox" aria-multiline="true" tabindex="0" aria-controls="${ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${ids.validation}"></div>
            <textarea part="textarea" id="${ids.source}" aria-controls="${ids.completion}" aria-expanded="false" aria-autocomplete="list" aria-describedby="${ids.validation}" rows="12"></textarea>
            <div class="completion-popup" part="completion-popup" id="${ids.completion}" role="listbox" hidden></div>
          </div>
          <div class="preview" part="preview" aria-label="Rendered markdown preview" tabindex="-1"></div>
        </div>
        <div class="validation" part="error" id="${ids.validation}"></div>
        <div class="sr-only" part="status" id="${ids.status}" aria-live="polite" aria-atomic="true"></div>
      </div>`;
}
