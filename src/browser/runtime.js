export function isAppleWebKitRuntime(navigator = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    if (!/AppleWebKit/.test(userAgent)) return false;
    if (isIOSWebKitRuntime(navigator)) return true;
    return /Safari\//.test(userAgent)
      && !/(?:Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|OPiOS|FxiOS|Firefox|Android)/.test(userAgent);
  }

export function isIOSWebKitRuntime(navigator = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    const platform = navigator?.platform || "";
    const iOSDevice = /iPhone|iPad|iPod/.test(`${userAgent} ${platform}`)
      || (platform === "MacIntel" && Number(navigator?.maxTouchPoints) > 1);
    return iOSDevice && /AppleWebKit/.test(userAgent);
  }

export function readSelectionCandidates(shadowRoot) {
    const candidates = [];
    const add = (channel, selection) => {
      if (!selection || candidates.some(candidate => candidate.selection === selection)) return;
      candidates.push({ channel, selection });
    };
    try {
      if (typeof shadowRoot?.getSelection === "function") {
        add("shadow", shadowRoot.getSelection());
      }
    } catch {}
    try {
      add("document", globalThis.getSelection?.());
    } catch {}
    return candidates;
  }
