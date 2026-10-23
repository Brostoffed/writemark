import type { SelectionCandidate } from "./types.ts";
export function isAppleWebKitRuntime(navigator: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    if (!/AppleWebKit/.test(userAgent)) return false;
    if (isIOSWebKitRuntime(navigator)) return true;
    return /Safari\//.test(userAgent)
      && !/(?:Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|OPiOS|FxiOS|Firefox|Android)/.test(userAgent);
  }

export function isIOSWebKitRuntime(navigator: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints"> | undefined = globalThis.navigator) {
    const userAgent = navigator?.userAgent || "";
    const platform = navigator?.platform || "";
    const iOSDevice = /iPhone|iPad|iPod/.test(`${userAgent} ${platform}`)
      || (platform === "MacIntel" && Number(navigator?.maxTouchPoints) > 1);
    return iOSDevice && /AppleWebKit/.test(userAgent);
  }

export function readSelectionCandidates(shadowRoot: ShadowRoot | null): SelectionCandidate[] {
    const candidates: SelectionCandidate[] = [];
    const add = (channel: string, selection: Selection | null | undefined) => {
      if (!selection || candidates.some(candidate => candidate.selection === selection)) return;
      candidates.push({ channel, selection });
    };
    try {
      // Some browsers expose selection through the shadow root.
      const root = shadowRoot as (ShadowRoot & { getSelection?: () => Selection | null }) | null;
      if (typeof root?.getSelection === "function") add("shadow", root.getSelection());
    } catch {}
    try {
      add("document", globalThis.getSelection?.());
    } catch {}
    return candidates;
  }
