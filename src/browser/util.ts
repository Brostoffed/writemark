

export function displayShortcut(shortcut: string | undefined) {
  if (!shortcut) return "";
  const isMac = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform ?? "");
  return shortcut.replace(/Mod/g, isMac ? "⌘" : "Ctrl").replace(/Alt/g, isMac ? "⌥" : "Alt").replace(/Shift/g, isMac ? "⇧" : "Shift");
}

export function uid(prefix: string = "mfe") { return `${prefix}-${Math.random().toString(36).slice(2)}`; }
