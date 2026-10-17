import { ButtonItem, DialogButton, PanelSection, PanelSectionRow, SliderField, TextField, ToggleField } from "@decky/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { control, getState, logLine, forgetPhones, refresh, resetLink, setCast, setStartMuted, tvCode } from "./backend";
import { compositionAvailable, compositionError } from "./composition";
import { describeParts, getScreenSize, readDeckParts } from "./layout";
import { encodeQr, qrPath } from "./qr";
import { BackendState, Mode, runtime, settings, useStore } from "./store";
import { pip } from "./view";

const CSS = `
/* Button rows. Each button sits in its own cell and the cells' padding makes the space between buttons, so the
   gap does not depend on how Steam styles (or wraps) its buttons. */
.ytp-seg { display: flex !important; flex-wrap: wrap !important; box-sizing: border-box !important;
  width: calc(100% + 10px) !important; margin: 3px -5px !important; padding: 0 !important; }
.ytp-cell { box-sizing: border-box !important; padding: 4px 5px !important; min-width: 0 !important; margin: 0 !important; }
.ytp-cell > * { margin: 0 !important; padding: 0 !important; min-width: 0 !important; width: 100% !important; }
.ytp-cell button { margin: 0 !important; min-width: 0 !important; width: 100% !important; height: 36px !important;
  min-height: 36px !important; padding: 0 4px !important; font-size: 12.5px !important; line-height: 1.1 !important;
  display: flex !important; align-items: center !important; justify-content: center !important; box-sizing: border-box !important;
  white-space: normal !important; text-align: center !important; }
.ytp-cell .on, .ytp-cell .on button { background: #1a9fff !important; color: #fff !important; font-weight: bold; }
.ytp-now { padding: 8px 2px 4px; }
.ytp-title { font-size: 14px; font-weight: bold; line-height: 1.25; word-break: break-word; }
.ytp-sub { font-size: 12px; opacity: .75; margin-top: 3px; line-height: 1.3; }
.ytp-warn { font-size: 12px; color: #ffb86b; margin-top: 4px; line-height: 1.3; }
.ytp-qr { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px 0; }
.ytp-qr svg { width: 176px; height: 176px; background: #fff; border-radius: 6px; }
.ytp-url { font-size: 11px; opacity: .8; word-break: break-all; text-align: center; }
.ytp-lines { font-size: 11.5px; line-height: 1.45; word-break: break-word; }
.ytp-lines div { margin: 2px 0; }
.ytp-ok { color: #8fd1a5; } .ytp-fail { color: #ff8a8a; } .ytp-info { opacity: .8; }
.ytp-gap { height: 8px; }
.ytp-qitem { padding: 6px 0 2px; }
.ytp-qitem .ytp-sub { margin: 0 0 4px; }
`;

const fmt = (sec?: number): string => {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const two = (n: number) => (n < 10 ? "0" + n : String(n));
  return h > 0 ? h + ":" + two(m) + ":" + two(r) : m + ":" + two(r);
};

const LOADED_AT = Date.now();

/** Kept outside the component so the panel reopens the way it was left. */
const ui = { more: false, tab: "window" };

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const PLAYER_ERRORS: Record<number, string> = {
  2: "Invalid video link.",
  5: "Player error.",
  100: "Video not found or private.",
  101: "This video can't be embedded.",
  150: "This video can't be embedded.",
  153: "YouTube refused to embed this video.",
};

interface SegItem {
  id: string | number;
  label: string;
}

const Seg = ({ items, value, onChange, cols }: { items: SegItem[]; value: string | number; onChange: (id: any) => void; cols: number }) => (
  <div className="ytp-seg">
    {items.map((it) => (
      <div key={String(it.id)} className="ytp-cell" style={{ width: 100 / cols + "%" }}>
        <DialogButton className={it.id === value ? "on" : ""} onClick={() => onChange(it.id)}>
          {it.label}
        </DialogButton>
      </div>
    ))}
  </div>
);

const Qr = ({ url }: { url: string }) => {
  const q = useMemo(() => {
    try {
      return qrPath(encodeQr(url, "M"));
    } catch {
      return null;
    }
  }, [url]);
  if (!q) return <div className="ytp-warn">The phone link is too long for a QR code.</div>;
  return (
    <div className="ytp-qr">
      <svg viewBox={q.viewBox} shapeRendering="crispEdges">
        <path d={q.path} fill="#000" />
      </svg>
      <div className="ytp-url">{url}</div>
    </div>
  );
};

const ErrorCard = ({ message }: { message: string }) => (
  <PanelSection title="YouTube PiP">
    <PanelSectionRow>
      <div className="ytp-now">
        <div className="ytp-title">YouTube PiP couldn't start</div>
        <div className="ytp-sub">{message}</div>
        <div className="ytp-sub">Log: ~/homebrew/logs/"YouTube PiP"/</div>
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem layout="below" onClick={() => void refresh()}>
        Retry
      </ButtonItem>
    </PanelSectionRow>
  </PanelSection>
);

export const Panel = () => {
  const s = useStore(settings);
  const rt = useStore(runtime);
  const [, setTick] = useState(0);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [armed, setArmed] = useState(false);
  const [seekVal, setSeekVal] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [code, setCode] = useState("");
  const [forgetArmed, setForgetArmed] = useState(false);
  const [castBusy, setCastBusy] = useState(false);
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [volVal, setVolVal] = useState<number | null>(null);
  const volTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lines, setLines] = useState<{ ok: boolean | null; text: string }[]>([]);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      if (armTimer.current) clearTimeout(armTimer.current);
      if (seekTimer.current) clearTimeout(seekTimer.current);
      if (volTimer.current) clearTimeout(volTimer.current);
    };
  }, []);

  const st = rt.state;
  const style = <style>{CSS}</style>;
  if (!st) {
    return (
      <>
        {style}
        {rt.error && Date.now() - LOADED_AT > 6000 ? (
          <ErrorCard message={rt.error} />
        ) : (
          <PanelSection title="YouTube PiP">
            <PanelSectionRow>
              <div className="ytp-sub">Loading...</div>
            </PanelSectionRow>
          </PanelSection>
        )}
      </>
    );
  }
  if (!st.ok) return <>{style}<ErrorCard message={st.error || "The local server did not start."} /></>;

  const act = async (action: string, value: number | null = null, url: string | null = null) => {
    try {
      const r = await control(action, value, url);
      setMsg(r.ok ? "" : r.message);
      if (r.ok && (action === "play" || action === "queue")) {
        const patch: Partial<typeof s> = {};
        if (s.mode === Mode.Off) patch.mode = Mode.Picture;
        settings.set(patch);
        setLink("");
      }
      void refresh();
    } catch (e) {
      setMsg(errText(e));
    }
  };

  const switchCast = async (on: boolean) => {
    if (castBusy || on === st.cast.on) return;
    setCastBusy(true);
    setCode("");
    try {
      await setCast(on);
      await refresh();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setCastBusy(false);
    }
  };

  const onForget = async () => {
    if (!forgetArmed) {
      setForgetArmed(true);
      setTimeout(() => setForgetArmed(false), 4000);
      return;
    }
    setForgetArmed(false);
    setCode("");
    try {
      const r = await forgetPhones();
      setMsg(r.message);
      void refresh();
    } catch (e) {
      setMsg(errText(e));
    }
  };

  const getCode = async () => {
    setCode("Asking YouTube...");
    try {
      const r = await tvCode();
      setCode(r.ok ? r.message : "");
      if (!r.ok) setMsg(r.message);
    } catch (e) {
      setCode("");
      setMsg(errText(e));
    }
  };

  const onVolume = (v: number) => {
    setVolVal(v);
    if (volTimer.current) clearTimeout(volTimer.current);
    volTimer.current = setTimeout(() => {
      void act("setvol", v);
      setTimeout(() => setVolVal(null), 2500);
    }, 250);
  };

  const onSeek = (v: number) => {
    setSeekVal(v);
    if (seekTimer.current) clearTimeout(seekTimer.current);
    seekTimer.current = setTimeout(() => {
      void act("seekto", v);
      setTimeout(() => setSeekVal(null), 1500);
    }, 500);
  };

  const onReset = async () => {
    if (!armed) {
      setArmed(true);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    try {
      await resetLink();
      setMsg("Phone link reset. Scan the new code.");
      void refresh();
    } catch (e) {
      setMsg(errText(e));
    }
  };

  const runDiag = async () => {
    const out: { ok: boolean | null; text: string }[] = [];
    const add = (ok: boolean | null, text: string) => out.push({ ok, text });
    let fresh: BackendState | null = null;
    try {
      fresh = await getState();
      add(true, "Backend v" + fresh.version + " is answering");
    } catch (e) {
      add(false, "Backend: " + errText(e));
    }
    if (fresh) {
      add(fresh.ok, fresh.ok ? "Local server on port " + fresh.port : "Server not running: " + (fresh.error || "unknown"));
      add(fresh.bind_all, fresh.bind_all ? "Reachable from the network (phone link works)" : "This device only, so no phone link");
      add(!!fresh.lan_ip, fresh.lan_ip ? "Wi-Fi address " + fresh.lan_ip : "No Wi-Fi address found");
      const r = fresh.report;
      const live = r.age !== null && r.age < 5;
      add(live, live ? "Player page reporting (" + r.age + "s ago" + (r.state !== undefined ? ", state " + r.state : "") + ")" : "Player page not reporting yet (turn the window On)");
    }
    add(pip.exists ? !pip.error : pip.error ? false : null, pip.error ? pip.error : pip.exists ? "Video view created" : "Video view not created yet (turn the window On)");
    const pr = pip.probe();
    add(null, "View methods: " + (pr.view.join(", ") || "none") + " | browser: " + (pr.browser.join(", ") || "none"));
    add(compositionAvailable(), compositionAvailable() ? "Steam composition hook found" : compositionError || "Composition hook missing");
    for (const l of describeParts()) add(null, l);
    add(null, "Menu open right now: " + (readDeckParts(getScreenSize().w).menuOpen ? "yes" : "no") + " (should say yes while this panel is open)");
    const c = fresh?.cast;
    if (c) {
      add(c.on ? c.advertising : null, c.on ? (c.advertising ? "Casting is on: the phone should list " + c.name : "Casting is on but not advertising: " + (c.error || "unknown")) : "Casting is turned off");
      add(c.on ? c.connected : null, c.connected ? "Connected to YouTube's cast service" : "Not connected to YouTube's cast service");
      add(null, c.phones.length ? "Phones: " + c.phones.join(", ") : "No phone connected");
      if (c.error) add(false, c.error);
    }
    const sc = getScreenSize();
    add(null, "Screen " + sc.w + "x" + sc.h + " (" + sc.source + ")");
    if (pip.lastBounds) {
      const b = pip.lastBounds;
      add(null, "Window at " + b.x + "," + b.y + " size " + b.width + "x" + b.height);
    }
    setLines(out);
    void logLine(out.map((l) => (l.ok === null ? "INFO" : l.ok ? "OK" : "FAIL") + ": " + l.text).join(" | "));
  };

  const rep = st.report;
  const online = rep.age !== null && rep.age < 5;
  let status = "";
  if (st.now) {
    if (!online) status = "The video window is closed.";
    else if (rep.err) status = PLAYER_ERRORS[rep.err] || "Player error " + rep.err + ".";
    else if (rep.blocked) status = "Autoplay was blocked. Tap the video to start.";
    else status = rep.state === 1 ? "Playing" : rep.state === 2 ? "Paused" : rep.state === 3 ? "Buffering" : "Starting";
  }
  const nowTitle = st.now ? st.now.title || st.now.video || "Playlist" : "Nothing playing";
  const showTime = !!st.now && online && !!rep.d;
  const warn = !!rep.err || !!rep.blocked;

  const playing = !!st.now;
  const queueShown = showAll ? st.queue : st.queue.slice(0, 3);
  const setMore = (v: boolean) => {
    ui.more = v;
    setTick((n) => n + 1);
  };
  const setTab = (t: string) => {
    ui.tab = t;
    setTick((n) => n + 1);
  };

  return (
    <>
      {style}
      <PanelSection title="Now playing">
        <PanelSectionRow>
          <Seg
            cols={2}
            value={s.mode}
            onChange={(m: Mode) => settings.set({ mode: m })}
            items={[
              { id: Mode.Off, label: "Window off" },
              { id: Mode.Picture, label: "Window on" },
            ]}
          />
        </PanelSectionRow>
        {s.mode !== Mode.Off && pip.error ? (
          <PanelSectionRow>
            <div className="ytp-warn">{"Video window problem: " + pip.error}</div>
          </PanelSectionRow>
        ) : null}
        <PanelSectionRow>
          <div className="ytp-now">
            <div className="ytp-title">{nowTitle}</div>
            {status ? (
              <div className={warn ? "ytp-warn" : "ytp-sub"}>
                {status + (showTime ? "  " + fmt(rep.t) + " / " + fmt(rep.d) : "") +
                  (st.subtitles && rep.state === 1 ? (rep.cc ? "  Subtitles: " + rep.cc : "  (no subtitles found yet)") : "")}
              </div>
            ) : (
              <div className="ytp-sub">Cast from the YouTube app on your phone, or use the phone link under More.</div>
            )}
          </div>
        </PanelSectionRow>
        {showTime ? (
          <PanelSectionRow>
            <SliderField label="Position" value={Math.min(seekVal ?? Math.floor(rep.t ?? 0), Math.floor(rep.d ?? 0))} min={0} max={Math.max(1, Math.floor(rep.d ?? 0))} step={5} showValue={false} onChange={onSeek} />
          </PanelSectionRow>
        ) : null}
        {playing ? (
          <PanelSectionRow>
            <Seg
              cols={4}
              value=""
              onChange={(id: string) => {
                if (id === "back") void act("seek", -10);
                else if (id === "pp") void act("playpause");
                else if (id === "fwd") void act("seek", 10);
                else if (id === "next") void act("next");
              }}
              items={[
                { id: "back", label: "-10s" },
                { id: "pp", label: rep.state === 1 ? "Pause" : "Play" },
                { id: "fwd", label: "+10s" },
                { id: "next", label: "Next" },
              ]}
            />
          </PanelSectionRow>
        ) : null}
        {playing ? (
          <PanelSectionRow>
            <Seg
              cols={3}
              value={st.subtitles ? "subs" : ""}
              onChange={(id: string) => {
                if (id === "mute") void act("mute");
                else if (id === "subs") void act("subs", null, st.subtitles ? "off" : "on");
                else if (id === "stop") void act("stop");
              }}
              items={[
                { id: "mute", label: rep.muted ? "Unmute" : "Mute" },
                { id: "subs", label: st.subtitles ? "Subtitles on" : "Subtitles off" },
                { id: "stop", label: "Stop" },
              ]}
            />
          </PanelSectionRow>
        ) : null}
        {playing ? (
          <PanelSectionRow>
            <SliderField
              label="Video volume"
              description="Only the video in the window. Game and system sound stay as they are."
              value={volVal ?? (online && typeof rep.vol === "number" ? rep.vol : st.volume)}
              min={0}
              max={100}
              step={5}
              showValue
              onChange={onVolume}
            />
          </PanelSectionRow>
        ) : null}
        {warn ? (
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={() => void act("retry")}>
              Retry this video
            </ButtonItem>
          </PanelSectionRow>
        ) : null}
        {msg ? (
          <PanelSectionRow>
            <div className="ytp-warn">{msg}</div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>

      <PanelSection title="Cast from the YouTube app">
        <PanelSectionRow>
          <Seg
            cols={2}
            value={castBusy ? "" : st.cast.on ? "on" : "off"}
            onChange={(id: string) => void switchCast(id === "on")}
            items={[
              { id: "on", label: castBusy ? "..." : "Casting on" },
              { id: "off", label: castBusy ? "..." : "Casting off" },
            ]}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <div className="ytp-sub">
            {!st.cast.on
              ? "Off: the Deck does not show up on phones and no phone can control it."
              : st.cast.phones.length > 0
                ? "Connected: " + st.cast.phones.join(", ")
                : "In the YouTube app (same Wi-Fi), tap the cast icon and pick " + st.cast.name + "."}
          </div>
        </PanelSectionRow>
        {st.cast.on ? (
          <PanelSectionRow>
            <Seg
              cols={2}
              value=""
              onChange={(id: string) => (id === "code" ? void getCode() : void onForget())}
              items={[
                { id: "code", label: "TV code" },
                { id: "forget", label: forgetArmed ? "Press again" : "Disconnect phones" },
              ]}
            />
          </PanelSectionRow>
        ) : null}
        {forgetArmed ? (
          <PanelSectionRow>
            <div className="ytp-warn">Press again to disconnect and unpair every phone.</div>
          </PanelSectionRow>
        ) : null}
        {code ? (
          <PanelSectionRow>
            <div className="ytp-now">
              <div className="ytp-title">{code}</div>
              <div className="ytp-sub">In the YouTube app: Settings, then Watch on TV, then Enter TV code.</div>
            </div>
          </PanelSectionRow>
        ) : null}
        {st.cast.error ? (
          <PanelSectionRow>
            <div className="ytp-warn">{st.cast.error}</div>
          </PanelSectionRow>
        ) : null}
      </PanelSection>

      {st.queue.length > 0 ? (
        <PanelSection title={"Up next (" + st.queue.length + ")"}>
          {queueShown.map((q, i) => (
            <PanelSectionRow key={i + ":" + (q.video || q.list)}>
              <div className="ytp-qitem">
                <div className="ytp-sub">{i + 1 + ". " + (q.title || q.video || "Playlist")}</div>
                <Seg
                  cols={4}
                  value=""
                  onChange={(id: string) => void act(id, i)}
                  items={[
                    { id: "playnow", label: "Play" },
                    { id: "up", label: "Up" },
                    { id: "down", label: "Down" },
                    { id: "remove", label: "Remove" },
                  ]}
                />
              </div>
            </PanelSectionRow>
          ))}
          <PanelSectionRow>
            <Seg
              cols={st.queue.length > 3 ? 2 : 1}
              value=""
              onChange={(id: string) => (id === "all" ? setShowAll(!showAll) : void act("clear"))}
              items={(st.queue.length > 3 ? [{ id: "all", label: showAll ? "Show fewer" : "Show all " + st.queue.length }] : []).concat([
                { id: "clear", label: "Clear queue" },
              ])}
            />
          </PanelSectionRow>
        </PanelSection>
      ) : null}

      <PanelSection title="More">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => setMore(!ui.more)}>
            {ui.more ? "Hide settings" : "Window, phone link, options, help"}
          </ButtonItem>
        </PanelSectionRow>
        {ui.more ? (
          <PanelSectionRow>
            <Seg
              cols={4}
              value={ui.tab}
              onChange={(t: string) => setTab(t)}
              items={[
                { id: "window", label: "Window" },
                { id: "phone", label: "Phone" },
                { id: "options", label: "Options" },
                { id: "help", label: "Help" },
              ]}
            />
          </PanelSectionRow>
        ) : null}

        {ui.more && ui.tab === "window" ? (
          <>
            <PanelSectionRow>
              <Seg
                cols={2}
                value={s.corner}
                onChange={(i: number) => settings.set({ corner: i, mode: s.mode === Mode.Off ? Mode.Picture : s.mode })}
                items={["Top left", "Top right", "Bottom left", "Bottom right"].map((label, id) => ({ id, label }))}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField label="Window size" value={Math.round(s.size * 100)} min={20} max={50} step={5} showValue onChange={(v: number) => settings.set({ size: v / 100 })} />
            </PanelSectionRow>
            <PanelSectionRow>
              <SliderField label="Margin" value={s.margin} min={0} max={80} step={4} showValue onChange={(v: number) => settings.set({ margin: v })} />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField
                label="Hide while menus are open"
                description="The window disappears while the Steam menu or Quick Access menu (this panel too) is open. The sound keeps playing."
                checked={s.hideForMenus}
                onChange={(v: boolean) => settings.set({ hideForMenus: v })}
              />
            </PanelSectionRow>
          </>
        ) : null}

        {ui.more && ui.tab === "phone" ? (
          <>
            <PanelSectionRow>
              {st.remote_url ? (
                <Qr url={st.remote_url} />
              ) : (
                <div className="ytp-warn">
                  {st.bind_all === false
                    ? "The phone link is unavailable: the plugin could only open a port for this device."
                    : "Connect the Deck to Wi-Fi to get a phone link."}
                </div>
              )}
            </PanelSectionRow>
            <PanelSectionRow>
              <div className="ytp-sub">Scan with any phone (same Wi-Fi) to paste links and control playback in its browser.</div>
            </PanelSectionRow>
            <PanelSectionRow>
              <TextField label="Or type a YouTube link here" value={link} onChange={(e: any) => setLink(e.target.value)} />
            </PanelSectionRow>
            <PanelSectionRow>
              <Seg
                cols={3}
                value=""
                onChange={(id: string) => {
                  if (id === "reset") void onReset();
                  else if (link.trim() === "") setMsg("Type or paste a YouTube link first.");
                  else void act(id, null, link.trim());
                }}
                items={[
                  { id: "play", label: "Play now" },
                  { id: "queue", label: "Add to queue" },
                  { id: "reset", label: armed ? "Press again" : "New link" },
                ]}
              />
            </PanelSectionRow>
          </>
        ) : null}

        {ui.more && ui.tab === "options" ? (
          <>
            <PanelSectionRow>
              <Seg
                cols={3}
                value={st.repeat}
                onChange={(id: string) => void act("repeat", null, id)}
                items={[
                  { id: "off", label: "Repeat off" },
                  { id: "all", label: "Repeat all" },
                  { id: "one", label: "Repeat one" },
                ]}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField label="Keep playing when hidden" description="Turn the window off and still hear the video." checked={s.keepPlaying} onChange={(v: boolean) => settings.set({ keepPlaying: v })} />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField label="Open the window for new videos" description="When a phone sends a video." checked={s.autoOpen} onChange={(v: boolean) => settings.set({ autoOpen: v })} />
            </PanelSectionRow>
            <PanelSectionRow>
              <ToggleField
                label="Start videos muted"
                description="Helps if autoplay is blocked."
                checked={st.start_muted}
                onChange={(v: boolean) => {
                  void setStartMuted(v).then(() => refresh()).catch((e) => setMsg(errText(e)));
                }}
              />
            </PanelSectionRow>
          </>
        ) : null}

        {ui.more && ui.tab === "help" ? (
          <>
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => void runDiag()}>
                Check setup
              </ButtonItem>
            </PanelSectionRow>
            {lines.length > 0 ? (
              <PanelSectionRow>
                <div className="ytp-lines">
                  {lines.map((l, i) => (
                    <div key={i} className={l.ok === null ? "ytp-info" : l.ok ? "ytp-ok" : "ytp-fail"}>
                      {(l.ok === null ? "INFO: " : l.ok ? "OK: " : "FAIL: ") + l.text}
                    </div>
                  ))}
                </div>
              </PanelSectionRow>
            ) : null}
            <PanelSectionRow>
              <div className="ytp-sub">{"Version " + st.version + ". Log: ~/homebrew/logs/\"YouTube PiP\"/"}</div>
            </PanelSectionRow>
          </>
        ) : null}
      </PanelSection>
    </>
  );
};
