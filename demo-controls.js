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
    if (!commit && (rawSize < 12 || rawSize > 28)) {
      editor.style.setProperty('--md-editor-font', fontFamily.value);
      return;
    }
    const size = commit ? clampNumber(rawSize, 12, 28) : rawSize;
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
      return;
    }
    if (!commit && (rawHeight < 220 || rawHeight > 1200)) {
      return;
    }
    const height = commit ? clampNumber(rawHeight, 220, 1200) : rawHeight;
    if (commit) {
      maxHeight.value = String(height);
    }
    editor.style.setProperty('--md-editor-max-height', `${height}px`);
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
