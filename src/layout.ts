import { Router, getGamepadNavigationTrees } from "@decky/ui";
import { Bounds } from "./view";

export interface ScreenSize {
  w: number;
  h: number;
  source: string;
}

export interface DeckParts {
  navWidth: number; // Steam button menu, on the left
  qamWidth: number; // Quick Access menu, on the right
  keyboard: boolean; // on-screen keyboard open (not detectable yet: always false, see readDeckParts)
  menuOpen: boolean; // Steam menu or Quick Access menu is showing
}

export const DEFAULT_SCREEN = { w: 854, h: 534 }; // Steam UI size on a Steam Deck
const KEYBOARD_FRACTION = 240 / 534; // decky-pip's measured guess

const sane = (w: any, h: any): boolean =>
  typeof w === "number" && typeof h === "number" && w >= 320 && w <= 4000 && h >= 200 && h <= 3000;

/** Size of Steam's UI window in the units SetBounds uses. Falls back to the Deck's default. */
export function getScreenSize(): ScreenSize {
  try {
    const bw = (Router as any).WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow;
    if (bw && sane(bw.innerWidth, bw.innerHeight)) {
      return { w: bw.innerWidth, h: bw.innerHeight, source: "Steam main window" };
    }
  } catch {
    /* fall through */
  }
  return { ...DEFAULT_SCREEN, source: "default (Steam Deck)" };
}

function treeWindow(trees: any[], id: string): any {
  return trees.find((t: any) => t?.id === id)?.m_Root?.m_element?.ownerDocument?.defaultView ?? null;
}

const width = (win: any): number => {
  if (!win || win.document?.hidden) return 0;
  const n = win.outerWidth;
  return typeof n === "number" && n > 0 && n < 4000 ? n : 0;
};

// A menu is never wider than this share of the screen. A bigger reading means we measured
// the wrong thing (on a real Deck it collapsed the video window to a thumbnail), so it is ignored.
const MAX_MENU_SHARE = 0.45;

/** Raw readings for "Check setup": which navigation trees exist and what they measure. */
export function describeParts(): string[] {
  const out: string[] = [];
  try {
    const trees: any[] = getGamepadNavigationTrees() ?? [];
    out.push("Trees: " + trees.map((t: any) => t?.id).join(", "));
    for (const id of ["MainNavMenuContainer", "QuickAccess-NA", "virtual keyboard"]) {
      const win = treeWindow(trees, id);
      out.push(id + ": " + (win ? "window " + win.outerWidth + "x" + win.outerHeight + ", hidden=" + !!win.document?.hidden + (win === mainWindow() ? ", main window" : "") : "none"));
    }
  } catch (e) {
    out.push("Could not read the menus: " + (e instanceof Error ? e.message : String(e)));
  }
  return out;
}

function mainWindow(): any {
  try {
    return (Router as any).WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow ?? null;
  } catch {
    return null;
  }
}

/** A menu counts as open when it has its own window and Steam shows that window. A menu that lives in the main
 *  window tells us nothing (the main window is always showing), so it never counts. */
export function menuShowing(win: any, main: any): boolean {
  return !!win && win !== main && !win.document?.hidden;
}

/** Which parts of Steam's own UI currently cover the screen. Cheap enough to poll. */
export function readDeckParts(screenW: number = DEFAULT_SCREEN.w): DeckParts {
  try {
    const trees: any[] = getGamepadNavigationTrees() ?? [];
    const cap = screenW * MAX_MENU_SHARE;
    const ok = (n: number) => (n > 0 && n <= cap ? n : 0);
    const main = mainWindow();
    const nav = treeWindow(trees, "MainNavMenuContainer");
    const qam = treeWindow(trees, "QuickAccess-NA");
    return {
      navWidth: ok(width(nav)),
      qamWidth: ok(width(qam)),
      // The keyboard's navigation tree sits in the main window on a real Deck, so "found" does not mean "open"
      // (it always looked open and pushed the bottom corners up). Ignored until there is a reliable signal.
      keyboard: false,
      menuOpen: menuShowing(nav, main) || menuShowing(qam, main),
    };
  } catch {
    return { navWidth: 0, qamWidth: 0, keyboard: false, menuOpen: false };
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Pure layout: where the video window goes. Corners: 0 top left, 1 top right, 2 bottom left, 3 bottom right. */
export function computeBounds(
  corner: number,
  size: number,
  margin: number,
  screen: { w: number; h: number },
  parts: DeckParts,
): Bounds {
  const keyboardH = parts.keyboard ? Math.round(screen.h * KEYBOARD_FRACTION) : 0;
  // Never let the usable area shrink below half the screen: the window must stay visible
  // even when the menu readings are off.
  const area = {
    x: parts.navWidth + margin,
    y: margin,
    w: Math.max(screen.w * 0.5, screen.w - parts.navWidth - parts.qamWidth - margin * 2),
    h: Math.max(screen.h * 0.4, screen.h - keyboardH - margin * 2),
  };
  let w = clamp(screen.w * size, 160, area.w);
  let h = (w * 9) / 16;
  if (h > area.h) {
    h = area.h;
    w = (h * 16) / 9;
  }
  const c = clamp(Math.round(corner), 0, 3);
  return {
    x: Math.round(area.x + (c % 2) * (area.w - w)),
    y: Math.round(area.y + Math.floor(c / 2) * (area.h - h)),
    width: Math.round(w),
    height: Math.round(h),
  };
}
