"""YouTube cast receiver (YouTube's "Lounge" protocol), so the YouTube app on a phone can cast to the Deck.

The phone's YouTube app and this plugin both join the same "lounge" on YouTube's servers: the phone as a remote,
the Deck as a screen. The phone then tells the screen what to play (video ids, play, pause, seek...), and the
plugin plays those videos in its own player window. YouTube's TV web app is not used at all.

Network goes through the system curl (Decky's bundled Python may lack ssl). Standard library only.
"""
import asyncio
import json
import os
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import urlencode

API = "https://www.youtube.com/api/lounge"
BIND = API + "/bc/bind"
APP = "lb-v4"
POLL_SECS = 290          # one long-poll request lasts at most this long, then a new one starts
STALL_SECS = 90          # YouTube sends a keep-alive about every 30 s: this long with nothing means a dead link
WAKE_GAP = 15            # the wall clock ran this much further than the system clock: the Deck was asleep
WATCH_SECS = 5
CURL = "curl"


def _zx() -> str:
    return os.urandom(6).hex()


def slept(wall_delta: float, mono_delta: float) -> bool:
    """True when the machine was suspended in between: time.time() keeps counting during sleep,
    time.monotonic() does not (Linux)."""
    return wall_delta - mono_delta > WAKE_GAP


def parse_chunks(buf: str) -> Tuple[List[Any], str]:
    """Split YouTube's "<length>\\n<json array>" stream into arrays. Returns (complete arrays, leftover text).

    The length prefix is not trusted (it counts UTF-16 units); each JSON array is decoded directly."""
    out: List[Any] = []
    dec = json.JSONDecoder()
    i = 0
    while True:
        nl = buf.find("\n", i)
        if nl < 0:
            break
        head = buf[i:nl].strip()
        if not head.isdigit():
            if head:  # not a chunk header (e.g. an error page): drop the line
                i = nl + 1
                continue
            i = nl + 1
            continue
        try:
            arr, end = dec.raw_decode(buf, nl + 1)
        except ValueError:
            break  # incomplete: wait for more data
        out.append(arr)
        i = end
        while i < len(buf) and buf[i] in "\r\n":
            i += 1
    return out, buf[i:]


class Lounge:
    """One screen in YouTube's lounge. Call start(); commands arrive through on_command(name, params)."""

    def __init__(self, name: str, device_id: str, screen_id: Optional[str],
                 on_command: Callable[[str, Dict[str, Any]], None],
                 env: Optional[Dict[str, str]] = None, log: Any = None) -> None:
        self.name = name
        self.device_id = device_id
        self.screen_id = screen_id
        self.on_command = on_command
        self.env = env
        self.log = log
        self.token: Optional[str] = None
        self.sid: Optional[str] = None
        self.gsession: Optional[str] = None
        self.aid = -1
        self.rid = 1
        self.ofs = 0
        self.remotes: Dict[str, str] = {}   # device id -> name of connected phones
        self.connected = False
        self.error: Optional[str] = None
        self._task: Optional[asyncio.Future] = None
        self._proc = None
        self._send_lock = asyncio.Lock()
        self._wake: Optional[asyncio.Event] = None
        self._watch_task: Optional[asyncio.Future] = None
        self.wakeups = 0

    # ---- plumbing --------------------------------------------------------
    async def _curl(self, url: str, form: Optional[Dict[str, Any]] = None, timeout: float = 15) -> Tuple[int, str]:
        args = [CURL, "-sS", "-m", str(int(timeout)), "-w", "\n%{http_code}"]
        if form is not None:
            args += ["-X", "POST", "-H", "Content-Type: application/x-www-form-urlencoded", "--data-binary", "@-"]
        args.append(url)
        proc = await asyncio.create_subprocess_exec(
            *args, env=self.env, stdin=asyncio.subprocess.PIPE if form is not None else asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        data = urlencode(form).encode() if form is not None else None
        out, err = await asyncio.wait_for(proc.communicate(data), timeout + 5)
        text = out.decode("utf-8", "replace")
        body, _, code = text.rpartition("\n")
        if not code.strip().isdigit():
            raise RuntimeError("network error: " + (err.decode("utf-8", "replace").strip()[:120] or "no answer"))
        return int(code), body

    def _bind_params(self, **extra: Any) -> Dict[str, Any]:
        q = {"device": "LOUNGE_SCREEN", "id": self.device_id, "name": self.name, "app": APP, "theme": "cl",
             "capabilities": "dsp,mic,dpa", "mdx-version": "2", "loungeIdToken": self.token, "VER": "8", "v": "2",
             "zx": _zx()}
        q.update(extra)
        return q

    # ---- setup -----------------------------------------------------------
    async def ensure_screen(self) -> None:
        if not self.screen_id:
            code, body = await self._curl(API + "/pairing/generate_screen_id")
            if code != 200 or not body.strip():
                raise RuntimeError("YouTube did not give a screen id (HTTP %d)" % code)
            self.screen_id = body.strip()
        code, body = await self._curl(API + "/pairing/get_lounge_token_batch", {"screen_ids": self.screen_id})
        if code != 200:
            raise RuntimeError("YouTube did not give a lounge token (HTTP %d)" % code)
        self.token = json.loads(body)["screens"][0]["loungeToken"]

    async def _bind(self) -> None:
        self.rid = 1
        self.ofs = 0
        self.aid = -1
        self.sid = self.gsession = None
        code, body = await self._curl(BIND + "?" + urlencode(self._bind_params(RID=self.rid, CVER="1", t="1")),
                                      {"count": "0"})
        if code != 200:
            raise RuntimeError("YouTube refused the connection (HTTP %d)" % code)
        arrays, _ = parse_chunks(body)
        for arr in arrays:
            self._handle(arr)
        if not self.sid or not self.gsession:
            raise RuntimeError("YouTube's answer had no session")

    # ---- incoming --------------------------------------------------------
    def _handle(self, arr: Any) -> None:
        if not isinstance(arr, list):
            return
        for item in arr:
            if not (isinstance(item, list) and len(item) == 2 and isinstance(item[1], list) and item[1]):
                continue
            idx, msg = item
            if isinstance(idx, int) and idx > self.aid:
                self.aid = idx
            name = msg[0]
            params = msg[1] if len(msg) > 1 and isinstance(msg[1], dict) else {}
            if name == "c":
                self.sid = msg[1]
            elif name == "S":
                self.gsession = msg[1]
            elif name in ("noop", "playlistModified"):
                pass
            elif name == "loungeStatus":
                try:
                    devs = json.loads(params.get("devices", "[]"))
                    self.remotes = {d.get("id", ""): d.get("name", "Phone") for d in devs
                                    if d.get("type") == "REMOTE_CONTROL"}
                except Exception:
                    pass
            elif name == "remoteConnected":
                self.remotes[params.get("id", "")] = params.get("name", "Phone")
            elif name == "remoteDisconnected":
                self.remotes.pop(params.get("id", ""), None)
            if name not in ("c", "S", "noop"):
                try:
                    self.on_command(name, params)
                except Exception as exc:  # one bad command must not stop the receiver
                    if self.log:
                        self.log.error("cast command %s failed: %s", name, exc)

    async def _poll_once(self) -> None:
        """One long-poll request; returns when YouTube ends it. Raises when the session is no longer valid."""
        q = self._bind_params(RID="rpc", SID=self.sid, CI="0", AID=self.aid, gsessionid=self.gsession,
                              TYPE="xmlhttp")
        args = [CURL, "-sS", "-N", "-m", str(POLL_SECS), "--speed-limit", "1", "--speed-time", str(STALL_SECS),
                "-w", "\n#HTTP%{http_code}", BIND + "?" + urlencode(q)]
        proc = await asyncio.create_subprocess_exec(*args, env=self.env, stdin=asyncio.subprocess.DEVNULL,
                                                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        self._proc = proc
        buf = ""
        try:
            while True:
                data = await proc.stdout.read(4096)
                if not data:
                    break
                buf += data.decode("utf-8", "replace")
                arrays, buf = parse_chunks(buf)
                for arr in arrays:
                    self._handle(arr)
            await proc.wait()
        finally:
            self._proc = None
            if proc.returncode is None:
                try:
                    proc.kill()
                except Exception:
                    pass
        tail = buf.rsplit("#HTTP", 1)
        code = int(tail[1].strip()) if len(tail) == 2 and tail[1].strip().isdigit() else 0
        if code in (400, 404, 410):
            raise RuntimeError("session ended (HTTP %d)" % code)
        if code == 0:
            raise RuntimeError("no connection to YouTube")  # e.g. Wi-Fi still coming back after sleep

    async def _run(self) -> None:
        delay = 2.0
        if self._wake is None:
            self._wake = asyncio.Event()
        while True:
            try:
                if self.token is None:
                    await self.ensure_screen()
                await self._bind()
                self.connected = True
                self.error = None
                delay = 2.0
                while True:
                    await self._poll_once()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.connected = False
                self.error = "Cast receiver: %s" % (str(exc) or type(exc).__name__)
                if self.log:
                    self.log.error(self.error)
                if "token" in str(exc) or "refused" in str(exc):
                    self.token = None  # fetch a fresh lounge token next time
                try:  # wait before retrying, unless a wake-up says "now"
                    await asyncio.wait_for(self._wake.wait(), delay)
                    delay = 2.0
                except asyncio.TimeoutError:
                    delay = min(delay * 2, 60.0)
                self._wake.clear()

    def kick(self) -> None:
        """Reconnect now (after the Deck wakes up): drop the current request and skip any waiting."""
        if self._proc is not None:
            try:
                self._proc.kill()
            except Exception:
                pass
        if self._wake is not None:
            self._wake.set()

    async def _watch(self) -> None:
        wall, mono = time.time(), time.monotonic()
        while True:
            await asyncio.sleep(WATCH_SECS)
            w, m = time.time(), time.monotonic()
            if slept(w - wall, m - mono):
                self.wakeups += 1
                if self.log:
                    self.log.info("woke from sleep after %.0f s: reconnecting to YouTube", (w - wall) - (m - mono))
                self.kick()
            wall, mono = w, m

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.ensure_future(self._run())
        if self._watch_task is None or self._watch_task.done():
            self._watch_task = asyncio.ensure_future(self._watch())

    def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
        self._task = None
        if self._watch_task is not None:
            self._watch_task.cancel()
        self._watch_task = None
        if self._proc is not None:
            try:
                self._proc.kill()
            except Exception:
                pass
        self.connected = False
        self.remotes = {}

    async def close(self) -> None:
        """Leave the lounge cleanly (phones see the Deck go away), then stop."""
        sid, gs = self.sid, self.gsession
        self.stop()
        if sid and gs and self.token:
            q = self._bind_params(RID=self.rid + 1, SID=sid, gsessionid=gs, TYPE="terminate")
            try:
                await self._curl(BIND + "?" + urlencode(q), None, timeout=8)  # GET, as BrowserChannel clients do
            except Exception:
                pass  # best effort: YouTube times the session out anyway
        self.sid = self.gsession = None

    def forget(self) -> None:
        """Drop this screen's identity: every phone paired with it loses access. A new one is made on next start."""
        self.stop()
        self.screen_id = None
        self.token = None

    # ---- outgoing --------------------------------------------------------
    async def send(self, sc: str, params: Optional[Dict[str, Any]] = None) -> bool:
        """Tell the phones something (nowPlaying, onStateChange, onVolumeChanged...). Best effort."""
        if not self.connected or not self.sid:
            return False
        async with self._send_lock:
            self.rid += 1
            form: Dict[str, Any] = {"count": "1", "ofs": str(self.ofs), "req0__sc": sc}
            for k, v in (params or {}).items():
                form["req0_" + k] = v
            q = self._bind_params(RID=self.rid, SID=self.sid, AID=self.aid, gsessionid=self.gsession)
            try:
                code, _ = await self._curl(BIND + "?" + urlencode(q), form)
            except Exception:
                return False
            if code == 200:
                self.ofs += 1
                return True
            return False

    async def register_pairing_code(self, code: str) -> bool:
        """The phone's cast button (through DIAL) hands over a one-time pairing code: tie it to this screen."""
        if not self.screen_id:
            await self.ensure_screen()
        status, _ = await self._curl(API + "/pairing/register_pairing_code", {
            "access_type": "permanent", "app": APP, "pairing_code": code, "screen_id": self.screen_id,
            "screen_name": self.name, "device_id": self.device_id})
        return status == 200

    async def tv_code(self) -> Optional[str]:
        """A 12-digit code for the YouTube app's "Link with TV code" (valid for a few minutes)."""
        if self.token is None:
            await self.ensure_screen()
        status, body = await self._curl(API + "/pairing/get_pairing_code?ctx=pair", {
            "access_type": "permanent", "app": APP, "lounge_token": self.token, "screen_id": self.screen_id,
            "screen_name": self.name, "device_id": self.device_id})
        code = body.strip()
        return code if status == 200 and code.isdigit() else None
