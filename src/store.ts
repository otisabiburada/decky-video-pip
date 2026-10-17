import { useEffect, useState } from "react";

/** Tiny observable store with optional localStorage persistence of chosen keys. */
export class Store<T extends object> {
  private v: T;
  private subs = new Set<() => void>();

  constructor(
    init: T,
    private key?: string,
    private persist: (keyof T)[] = [],
    private sanitize?: (v: T) => T,
  ) {
    this.v = init;
    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<T>;
          const merged: T = { ...init };
          for (const k of persist) {
            if (saved[k] !== undefined && typeof saved[k] === typeof init[k]) merged[k] = saved[k] as T[keyof T];
          }
          this.v = sanitize ? sanitize(merged) : merged;
        }
      } catch {
        /* storage can be unavailable; defaults are fine */
      }
    }
  }

  get(): T {
    return this.v;
  }

  set(patch: Partial<T>): void {
    const next = { ...this.v, ...patch };
    this.v = this.sanitize ? this.sanitize(next) : next;
    if (this.key && this.persist.some((k) => k in patch)) {
      try {
        const out: Partial<T> = {};
        for (const k of this.persist) out[k] = this.v[k];
        localStorage.setItem(this.key, JSON.stringify(out));
      } catch {
        /* ignore */
      }
    }
    this.subs.forEach((fn) => fn());
  }

  subscribe(fn: () => void): () => void {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }
}

export function useStore<T extends object>(store: Store<T>): T {
  const [value, setValue] = useState<T>(store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(() => setValue(store.get()));
  }, [store]);
  return value;
}

// ---------------------------------------------------------------------------
export enum Mode {
  Off = 0,
  Picture = 1,
}

export interface Settings {
  mode: Mode;
  corner: number; // 0 top left, 1 top right, 2 bottom left, 3 bottom right
  size: number; // picture width as a fraction of the screen width
  margin: number;
  keepPlaying: boolean; // keep audio going when the window is hidden
  autoOpen: boolean; // open the window when a video is sent from the phone
  hideForMenus: boolean; // hide the window while the Steam menu or Quick Access menu is open
}

export const DEFAULT_SETTINGS: Settings = {
  mode: Mode.Off,
  corner: 1,
  size: 0.4,
  margin: 24,
  keepPlaying: true,
  autoOpen: true,
  hideForMenus: false,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const settings = new Store<Settings>(
  DEFAULT_SETTINGS,
  "ytpip.settings.v2",
  ["corner", "size", "margin", "keepPlaying", "autoOpen", "hideForMenus"],
  (s) => ({
    ...s,
    corner: clamp(Math.round(s.corner), 0, 3),
    size: clamp(s.size, 0.2, 0.5),
    margin: clamp(Math.round(s.margin), 0, 80),
  }),
);

// ---------------------------------------------------------------------------
export interface VideoItem {
  video: string | null;
  list: string | null;
  title: string;
}

export interface Report {
  state?: number;
  t?: number;
  d?: number;
  vol?: number;
  muted?: boolean;
  title?: string;
  err?: number;
  blocked?: boolean;
  seq?: number;
  cc?: string;
  age: number | null;
}

export interface BackendState {
  ok: boolean;
  version: string;
  error: string | null;
  port: number | null;
  lan_ip: string | null;
  bind_all: boolean;
  player_url: string | null;
  remote_url: string | null;
  seq: number;
  now: VideoItem | null;
  queue: VideoItem[];
  report: Report;
  start_muted: boolean;
  volume: number;
  subtitles: boolean;
  repeat: "off" | "all" | "one";
  cast: { on: boolean; advertising: boolean; connected: boolean; phones: string[]; active: boolean; seq: number; name: string; error: string | null };
}

export interface Runtime {
  state: BackendState | null;
  error: string | null;
  lastOk: number;
}

export const runtime = new Store<Runtime>({ state: null, error: null, lastOk: 0 });
