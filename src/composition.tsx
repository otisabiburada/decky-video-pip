import { findModuleChild } from "@decky/ui";

// Steam keeps its UI under the game unless a component asks for a "minimum composition
// state". Level 1 (Notification) draws the UI layer over the running game, which is
// what lets the browser view show up in game. Approach taken from decky-pip (BSD-3).
export enum UIComposition {
  Hidden = 0,
  Notification = 1,
  Overlay = 2,
  Opaque = 3,
  OverlayKeyboard = 4,
}

type UseUIComposition = (composition: UIComposition) => { releaseComposition: () => void };

let hook: UseUIComposition | null = null;
export let compositionError: string | null = null;

try {
  const found = findModuleChild((m: any) => {
    if (typeof m !== "object") return undefined;
    for (const prop in m) {
      if (typeof m[prop] !== "function") continue;
      const src = m[prop].toString();
      if (
        src.includes("AddMinimumCompositionStateRequest") &&
        src.includes("ChangeMinimumCompositionStateRequest") &&
        src.includes("RemoveMinimumCompositionStateRequest") &&
        !src.includes("m_mapCompositionStateRequests")
      ) {
        return m[prop];
      }
    }
    return undefined;
  });
  hook = (found as UseUIComposition) ?? null;
  if (!hook) compositionError = "Steam's composition hook was not found.";
} catch (e) {
  compositionError = "Searching for the composition hook failed: " + (e instanceof Error ? e.message : String(e));
}

export const compositionAvailable = (): boolean => hook !== null;

/**
 * Mount this only while the window is showing. The request is released when it unmounts,
 * so a hidden window no longer holds the UI layer above the game.
 */
export const Composition = ({ level }: { level: UIComposition }) => {
  if (hook) hook(level);
  return null;
};
