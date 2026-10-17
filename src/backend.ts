import { callable } from "@decky/api";
import { BackendState, Mode, runtime, settings } from "./store";

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("The plugin's background part isn't answering.")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export interface ControlResult {
  ok: boolean;
  message: string;
}

const _getState = callable<[], BackendState>("get_state");
const _control = callable<[string, number | null, string | null], ControlResult>("control");
const _setStartMuted = callable<[boolean], boolean>("set_start_muted");
const _resetLink = callable<[], { ok: boolean }>("reset_link");
const _setCast = callable<[boolean], { ok: boolean }>("set_cast");
const _tvCode = callable<[], ControlResult>("tv_code");
const _forgetPhones = callable<[], ControlResult>("forget_phones");
const _logLine = callable<[string], boolean>("log_line");

export const getState = () => withTimeout(_getState(), 3500);
export const control = (action: string, value: number | null = null, url: string | null = null) =>
  withTimeout(_control(action, value, url), 4000);
export const setStartMuted = (v: boolean) => withTimeout(_setStartMuted(v), 4000);
export const resetLink = () => withTimeout(_resetLink(), 4000);
export const setCast = (v: boolean) => withTimeout(_setCast(v), 12000);
export const tvCode = () => withTimeout(_tvCode(), 20000);
export const forgetPhones = () => withTimeout(_forgetPhones(), 15000);
export const logLine = (t: string) => withTimeout(_logLine(t), 3000).catch(() => false);

// ---------------------------------------------------------------------------
// Background poll: keeps the host and the panel in sync, and opens the window
// when a video arrives from the phone.
let timer: ReturnType<typeof setInterval> | null = null;
let lastSeq: number | null = null;
let lastCastSeq: number | null = null;
let busy = false;

export async function refresh(): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    const st = await getState();
    runtime.set({ state: st, error: null, lastOk: Date.now() });
    const s = settings.get();
    if (lastSeq !== null && st.seq !== lastSeq && st.now && s.autoOpen && s.mode === Mode.Off) {
      settings.set({ mode: Mode.Picture });
    }
    lastSeq = st.seq;
    // a phone started casting: show the window 
    if (lastCastSeq !== null && st.cast.seq !== lastCastSeq && st.cast.active && s.mode === Mode.Off) {
      settings.set({ mode: Mode.Picture });
    }
    lastCastSeq = st.cast.seq;
  } catch (e) {
    runtime.set({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    busy = false;
  }
}

export function startPolling(): void {
  if (timer) return;
  void refresh();
  timer = setInterval(() => void refresh(), 1500);
}

export function stopPolling(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
