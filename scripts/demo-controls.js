export function readNumberInputValue(input) {
  if (input.value.trim() === '') {
    return null;
  }
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function bindDemoControls({ editor, fontFamily, fontSize, maxHeight }) {
  const minFontSize = 10;
  const maxFontSize = 28;
  const minMaxHeight = 100;
  const maxMaxHeight = 1200;
  const initialInlineMinHeight = editor.style.getPropertyValue('--md-editor-min-height');
  const initialComputedMinHeight = Number.parseFloat(getComputedStyle(editor).getPropertyValue('--md-editor-min-height'));

  function restoreMinHeight() {
    if (initialInlineMinHeight) editor.style.setProperty('--md-editor-min-height', initialInlineMinHeight);
    else editor.style.removeProperty('--md-editor-min-height');
  }

  function applyEffectiveMinHeight(height) {
    if (Number.isFinite(initialComputedMinHeight) && height < initialComputedMinHeight) {
      editor.style.setProperty('--md-editor-min-height', `${height}px`);
    } else restoreMinHeight();
  }

  function applyTypography(options = {}) {
    const { commit = false } = options;
    const rawSize = readNumberInputValue(fontSize);
    if (rawSize === null) {
      if (!commit) {
        editor.style.setProperty('--md-editor-font', fontFamily.value);
        return;
      }
      fontSize.value = '15';
      editor.style.setProperty('--md-editor-font-size', '15px');
      editor.style.setProperty('--md-editor-font', fontFamily.value);
      return;
    }
    if (!commit && (rawSize < minFontSize || rawSize > maxFontSize)) {
      editor.style.setProperty('--md-editor-font', fontFamily.value);
      return;
    }
    const size = commit ? clampNumber(rawSize, minFontSize, maxFontSize) : rawSize;
    if (commit) {
      fontSize.value = String(size);
    }
    editor.style.setProperty('--md-editor-font', fontFamily.value);
    editor.style.setProperty('--md-editor-font-size', `${size}px`);
  }

  function applyHeight(options = {}) {
    const { commit = false } = options;
    const rawHeight = readNumberInputValue(maxHeight);
    if (rawHeight === null) {
      if (commit) {
        maxHeight.value = '';
      }
      editor.style.removeProperty('--md-editor-max-height');
      restoreMinHeight();
      return;
    }
    if (!commit && (rawHeight < minMaxHeight || rawHeight > maxMaxHeight)) {
      return;
    }
    const height = commit ? clampNumber(rawHeight, minMaxHeight, maxMaxHeight) : rawHeight;
    if (commit) {
      maxHeight.value = String(height);
    }
    editor.style.setProperty('--md-editor-max-height', `${height}px`);
    applyEffectiveMinHeight(height);
  }

  applyTypography();
  applyHeight();

  fontFamily.addEventListener('change', applyTypography);
  fontSize.addEventListener('input', applyTypography);
  fontSize.addEventListener('change', () => applyTypography({ commit: true }));
  fontSize.addEventListener('blur', () => applyTypography({ commit: true }));
  maxHeight.addEventListener('input', applyHeight);
  maxHeight.addEventListener('change', () => applyHeight({ commit: true }));
  maxHeight.addEventListener('blur', () => applyHeight({ commit: true }));

  return { applyTypography, applyHeight };
}
