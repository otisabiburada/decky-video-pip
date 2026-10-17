import { Router } from "@decky/ui";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PROBE_METHODS = [
  "SetBounds",
  "SetVisible",
  "LoadURL",
  "Destroy",
  "GetBrowser",
  "SetFocus",
  "SetAudioMuted",
  "SetName",
];

/**
 * Owns the one Steam browser view that shows the player page.
 *
 * Compared with the original decky-pip approach:
 *  - the view is created once and kept (hiding it keeps audio playing; it is only
 *    destroyed when "keep playing" is off), so closing the window no longer loses
 *    the video;
 *  - every call is dedupe'd and wrapped, so a missing Steam API gives a readable
 *    error instead of crashing the plugin;
 *  - a leftover view from a previous load of the plugin is destroyed first.
 */
class PipView {
  private view: any = null;
  private browser: any = null;
  private url = "";
  private visible: boolean | null = null;
  private boundsKey = "";
  error: string | null = null;
  lastBounds: Bounds | null = null;

  get exists(): boolean {
    return this.view !== null;
  }

  create(): boolean {
    if (this.view) return true;
    try {
      const w = window as any;
      if (w.__ytPipView) {
        try {
          w.__ytPipView.Destroy();
        } catch {
          /* already gone */
        }
        w.__ytPipView = null;
      }
      const root: any = (Router as any).WindowStore?.GamepadUIMainWindowInstance;
      if (!root || typeof root.CreateBrowserView !== "function") {
        this.error = "Steam's UI has no CreateBrowserView (a Steam update may have changed it).";
        return false;
      }
      const view = root.CreateBrowserView("youtube-pip");
      const browser = view?.GetBrowser?.();
      if (!view || !browser) {
        this.error = "CreateBrowserView returned nothing usable.";
        return false;
      }
      this.view = view;
      this.browser = browser;
      this.url = "";
      this.visible = null;
      this.boundsKey = "";
      this.error = null;
      w.__ytPipView = view;
      return true;
    } catch (e) {
      this.error = "Could not create the video view: " + (e instanceof Error ? e.message : String(e));
      this.view = this.browser = null;
      return false;
    }
  }

  private guard(what: string, fn: () => void): void {
    try {
      fn();
    } catch (e) {
      this.error = what + " failed: " + (e instanceof Error ? e.message : String(e));
    }
  }

  setBounds(b: Bounds): void {
    if (!this.browser) return;
    const key = [b.x, b.y, b.width, b.height].join(",");
    this.lastBounds = b;
    if (key === this.boundsKey) return;
    this.boundsKey = key;
    this.guard("SetBounds", () => this.browser.SetBounds(b.x, b.y, b.width, b.height));
  }

  load(url: string): void {
    if (!this.view || url === this.url) return;
    this.url = url;
    this.guard("LoadURL", () => this.view.LoadURL(url));
  }

  setVisible(v: boolean): void {
    if (!this.browser || v === this.visible) return;
    this.visible = v;
    this.guard("SetVisible", () => this.browser.SetVisible(v));
  }

  destroy(): void {
    if (!this.view) return;
    const v = this.view;
    this.view = this.browser = null;
    this.url = "";
    this.visible = null;
    this.boundsKey = "";
    try {
      v.Destroy();
    } catch {
      /* ignore */
    }
    const w = window as any;
    if (w.__ytPipView === v) w.__ytPipView = null;
  }

  /** Which of the methods this plugin could use exist on the Steam objects (for diagnostics). */
  probe(): { view: string[]; browser: string[] } {
    const have = (o: any) => (o ? PROBE_METHODS.filter((m) => typeof o[m] === "function") : []);
    return { view: have(this.view), browser: have(this.browser) };
  }
}

export const pip = new PipView();
