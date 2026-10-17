"""YouTube PiP backend.

Runs a tiny HTTP server (asyncio only, no http.server: Decky's bundled Python can
lack stdlib modules) that does three jobs:

  1. /player   - a small page the floating browser view loads. It embeds the
                 YouTube IFrame player and obeys commands (play, pause, seek...).
  2. /r/<tok>  - a phone page (opened from the QR code) to send links/controls.
  3. /api/*    - JSON endpoints used by those two pages.

The Decky panel talks to this class through the normal callable() bridge.
Only the minimum of stdlib is imported at module top; optional things are
imported lazily inside the function that needs them.
"""
import asyncio
import json
import os
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, parse_qs, quote

import decky

log = decky.logger

VERSION = "0.6.0"
PORT_START = 8765
PORT_TRIES = 12
MAX_QUEUE = 50
REPEAT_MODES = ("off", "all", "one")
SSDP_ADDR = "239.255.255.250"
SSDP_PORT = 1900
DIAL_ST = "urn:dial-multiscreen-org:service:dial:1"
DEVICE_NAME = "Steam Deck"
MAX_BODY = 4096
VIDEO_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
LIST_RE = re.compile(r"^[A-Za-z0-9_-]{10,64}$")
LOOPBACK = ("127.0.0.1", "::1", "::ffff:127.0.0.1")
LOCAL_HOSTS = ("127.0.0.1", "localhost", "[::1]")
LANG_RE = re.compile(r"^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})?$")


# --------------------------------------------------------------------------
# Pure helpers (unit-tested without Decky)
# --------------------------------------------------------------------------
def parse_start(value: str) -> int:
    """'90', '90s', '1m30s', '1h2m3s' -> seconds (0 when unparseable)."""
    value = (value or "").strip().lower()
    if not value:
        return 0
    if value.isdigit():
        return min(int(value), 86400 * 2)
    m = re.match(r"^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$", value)
    if not m:
        return 0
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return min(h * 3600 + mi * 60 + s, 86400 * 2)


def parse_youtube(text: Any) -> Optional[Dict[str, Any]]:
    """Return {'video': id|None, 'list': id|None, 'start': int} or None."""
    if not isinstance(text, str):
        return None
    t = text.strip()
    if not t or len(t) > 500:
        return None
    if VIDEO_RE.match(t):
        return {"video": t, "list": None, "start": 0}
    if "://" not in t:
        t = "https://" + t
    try:
        u = urlparse(t)
    except ValueError:
        return None
    host = (u.hostname or "").lower()
    for prefix in ("www.", "m.", "music."):
        if host.startswith(prefix):
            host = host[len(prefix):]
    if host not in ("youtube.com", "youtu.be", "youtube-nocookie.com"):
        return None
    q = parse_qs(u.query)
    parts = [p for p in u.path.split("/") if p]
    video = None
    if host == "youtu.be":
        video = parts[0] if parts else None
    elif parts and parts[0] in ("shorts", "live", "embed", "v") and len(parts) > 1:
        video = parts[1]
    elif parts and parts[0] == "watch":
        video = (q.get("v") or [None])[0]
    if video is not None and not VIDEO_RE.match(video):
        video = None
    plist = (q.get("list") or [None])[0]
    # Auto-generated mixes (RD...) cannot be loaded by the embedded player.
    if plist is not None and (not LIST_RE.match(plist) or plist.startswith("RD")):
        plist = None
    if video is None and plist is None:
        return None
    start = parse_start((q.get("t") or q.get("start") or [""])[0])
    return {"video": video, "list": plist if video is None else None, "start": start}


def _rand_hex(nbytes: int) -> str:
    return os.urandom(nbytes).hex()


def _same(a: str, b: str) -> bool:
    if not isinstance(a, str) or not isinstance(b, str) or len(a) != len(b):
        return False
    r = 0
    for x, y in zip(a, b):
        r |= ord(x) ^ ord(y)
    return r == 0


def _num(v: Any, lo: float, hi: float, default: float = 0.0) -> float:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return default
    if f != f:
        return default
    return max(lo, min(hi, f))


def _load_json(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return default


def _save_json(path: str, data: Any, secret: bool = False) -> None:
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(data, fh)
        if secret:
            os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except Exception as exc:  # settings are best effort
        log.error("could not save %s: %s", path, exc)


def _clean_env() -> Dict[str, str]:
    env = dict(os.environ)
    orig = env.pop("LD_LIBRARY_PATH_ORIG", None)
    if orig is not None:
        env["LD_LIBRARY_PATH"] = orig
    else:
        env.pop("LD_LIBRARY_PATH", None)
    env.pop("LD_PRELOAD", None)
    return env


def _lan_ip() -> Optional[str]:
    try:
        import socket

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("10.255.255.255", 1))  # no packet is sent
            ip = s.getsockname()[0]
        finally:
            s.close()
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass
    return None


def _lan_ip_towards(peer: str) -> Optional[str]:
    """Our address on the network the peer is on (so the phone gets a link it can reach)."""
    try:
        import socket

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((peer, 9))
            return s.getsockname()[0]
        finally:
            s.close()
    except Exception:
        return None


def _read_asset(name: str) -> bytes:
    path = os.path.join(decky.DECKY_PLUGIN_DIR, "assets", name)
    with open(path, "rb") as fh:
        return fh.read()


# --------------------------------------------------------------------------
# Plugin
# --------------------------------------------------------------------------
class Plugin:
    # ---- lifecycle -------------------------------------------------------
    async def _main(self):
        self.settings_path = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
        self.settings = _load_json(self.settings_path, {})
        if not isinstance(self.settings, dict):
            self.settings = {}
        if not isinstance(self.settings.get("token"), str) or len(self.settings["token"]) != 12:
            self.settings["token"] = _rand_hex(6)
        self.settings.setdefault("start_muted", False)
        self.settings.setdefault("cast", True)
        self.settings["volume"] = int(_num(self.settings.get("volume"), 0, 100, 100))
        self.settings["subtitles"] = bool(self.settings.get("subtitles", False))
        if not (isinstance(self.settings.get("cc_lang"), str) and LANG_RE.match(self.settings["cc_lang"])):
            self.settings["cc_lang"] = ""
        if not isinstance(self.settings.get("uuid"), str) or len(self.settings["uuid"]) != 36:
            h = _rand_hex(16)
            self.settings["uuid"] = "%s-%s-%s-%s-%s" % (h[:8], h[8:12], h[12:16], h[16:20], h[20:])
        if self.settings.get("repeat") not in REPEAT_MODES:
            self.settings["repeat"] = "off"
        _save_json(self.settings_path, self.settings, secret=True)

        self.secret = _rand_hex(8)  # protects the loopback-only endpoints
        self.cmds: List[Dict[str, Any]] = []
        self.cmd_id = 0
        self.current: Optional[Dict[str, Any]] = None
        self.seq = 0
        self.queue: List[Dict[str, Any]] = []
        self.report: Dict[str, Any] = {}
        self.report_ts = 0.0
        self.resume_t = 0.0
        self.user_muted = False
        self.vol_set_at = 0.0
        self.vol_saved_at = 0.0
        self.retried_seq = -1
        self.titles: Dict[str, str] = {}
        self.bad_tokens: List[float] = []
        self.server = None
        self.server6 = None
        self.port: Optional[int] = None
        self.bind_all = False
        self.start_error: Optional[str] = None
        self.cast_seq = 0
        self.cast_error: Optional[str] = None
        self.cast_ids: List[str] = []         # the phone's play queue, in order
        self.cast_sent: Dict[str, Any] = {}   # last state told to the phones (to send only changes)
        self.lounge = None
        self.ssdp = None
        self.ssdp_error: Optional[str] = None
        self.assets_ok = True
        try:
            self.player_html = _read_asset("player.html")
            self.remote_html = _read_asset("remote.html")
        except Exception as exc:
            self.assets_ok = False
            self.player_html = self.remote_html = b""
            self.start_error = "missing assets: %s" % exc
            log.error(self.start_error)
        await self._start_server()
        if self.settings.get("cast"):
            await self._start_cast()

    async def _unload(self):
        self._stop_cast()
        srv6 = getattr(self, "server6", None)
        if srv6 is not None:
            srv6.close()
        srv = getattr(self, "server", None)
        if srv is not None:
            srv.close()
            try:
                await srv.wait_closed()
            except Exception:
                pass

    async def _start_server(self):
        for host in ("0.0.0.0", "127.0.0.1"):
            for port in range(PORT_START, PORT_START + PORT_TRIES):
                try:
                    self.server = await asyncio.start_server(
                        self._handle, host, port, limit=16384)
                except OSError:
                    continue
                self.port = port
                self.bind_all = host == "0.0.0.0"
                log.info("server on %s:%s", host, port)
                try:  # browsers often try IPv6 first for "localhost"
                    self.server6 = await asyncio.start_server(self._handle, "::1", port, limit=16384)
                except OSError:
                    self.server6 = None  # no IPv6: they fall back to 127.0.0.1
                return
        self.start_error = "could not open a local port"
        log.error(self.start_error)

    # ---- cast receiver --------------------------------------------------
    # The phone finds the Deck through SSDP/DIAL (below) and then talks to it through YouTube's servers
    # (ytpip_lounge.py). Videos it sends play in the plugin's own player.
    async def _start_cast(self) -> None:
        if self.lounge is None:
            try:
                import importlib.util

                spec = importlib.util.spec_from_file_location(
                    "ytpip_lounge", os.path.join(decky.DECKY_PLUGIN_DIR, "ytpip_lounge.py"))
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                self.lounge = mod.Lounge(DEVICE_NAME, self.settings["uuid"].replace("-", ""),
                                         self.settings.get("screen_id"), self._on_cast_cmd,
                                         env=_clean_env(), log=log)
            except Exception as exc:
                self.cast_error = "Could not load the cast receiver: %s" % exc
                log.error(self.cast_error)
                return
        self.lounge.start()
        await self._start_ssdp()

    def _stop_cast(self) -> None:
        if self.lounge is not None:
            self.lounge.stop()
        self._stop_ssdp()

    async def _close_cast(self) -> None:
        """Casting off: leave YouTube's cast service cleanly so phones see the Deck go, and stop advertising."""
        self._stop_ssdp()
        if self.lounge is not None:
            await self.lounge.close()

    def _cast_send(self, sc: str, params: Dict[str, Any]) -> None:
        lg = self.lounge
        if lg is not None and lg.connected and lg.remotes:
            asyncio.ensure_future(lg.send(sc, {k: str(v) for k, v in params.items()}))

    def _now_playing_params(self) -> Dict[str, Any]:
        vid = (self.current or {}).get("video") or ""
        rep = self.report if self.report.get("seq") == self.seq else {}
        out: Dict[str, Any] = {"videoId": vid, "currentTime": round(float(rep.get("t", 0)), 3),
                               "state": rep.get("state", 3) if vid else -1}
        if vid in self.cast_ids:
            out["currentIndex"] = self.cast_ids.index(vid)
        return out

    def _send_state(self, force: bool = False) -> None:
        """Keep the phone's YouTube app in step with the player: state changes, and the time while playing."""
        if not self.current or not self.current.get("video"):
            return
        rep = self.report
        st = {"state": rep.get("state", 3), "vid": self.current.get("video")}
        now = time.time()
        if force or st != {k: self.cast_sent.get(k) for k in st} or now - self.cast_sent.get("at", 0) > 5:
            d = rep.get("d", 0)
            self._cast_send("onStateChange", {"currentTime": round(float(rep.get("t", 0)), 3), "state": st["state"],
                                              "duration": round(float(d), 3), "cpn": "ytpip", "loadedTime": 0,
                                              "seekableStartTime": 0, "seekableEndTime": round(float(d), 3)})
            self.cast_sent.update(st, at=now)
        vol = {"volume": rep.get("vol", 100), "muted": "true" if rep.get("muted") else "false"}
        if vol != self.cast_sent.get("vol"):
            self.cast_sent["vol"] = vol
            self._cast_send("onVolumeChanged", vol)

    def _queue_after(self, vid: Optional[str]) -> None:
        ids = self.cast_ids
        rest = ids[ids.index(vid) + 1:] if vid in ids else []
        self.queue = [{"video": v, "list": None, "start": 0, "title": self.titles.get(v, "")} for v in rest][:MAX_QUEUE]
        for it in self.queue:
            self._fetch_title(it)

    def _on_cast_cmd(self, name: str, p: Dict[str, Any]) -> None:
        """A command from the phone's YouTube app (through YouTube's servers)."""
        if name == "setPlaylist":
            ids = [v for v in str(p.get("videoIds", "")).split(",") if VIDEO_RE.match(v)]
            vid = str(p.get("videoId", ""))
            if not VIDEO_RE.match(vid):
                return
            self.cast_ids = ids or [vid]
            item = {"video": vid, "list": None, "start": int(_num(p.get("currentTime"), 0, 86400 * 2)), "title": ""}
            self._start_item(item)
            self._fetch_title(item)
            self._queue_after(vid)
            self.cast_seq += 1
        elif name == "updatePlaylist":
            ids = [v for v in str(p.get("videoIds", "")).split(",") if VIDEO_RE.match(v)]
            self.cast_ids = ids
            self._queue_after((self.current or {}).get("video"))
        elif name == "play":
            self._push_cmd({"cmd": "play"})
        elif name == "pause":
            self._push_cmd({"cmd": "pause"})
        elif name == "seekTo":
            self._push_cmd({"cmd": "seekto", "t": _num(p.get("newTime"), 0, 86400 * 2)})
        elif name == "setVolume":
            self._set_volume(_num(p.get("volume"), 0, 100, 100))
        elif name == "next":
            self._advance(rotate=True)
        elif name == "previous":
            cur = (self.current or {}).get("video")
            ids = self.cast_ids
            if cur in ids and ids.index(cur) > 0:
                prev = ids[ids.index(cur) - 1]
                self._start_item({"video": prev, "list": None, "start": 0, "title": self.titles.get(prev, "")})
                self._queue_after(prev)
            else:
                self._push_cmd({"cmd": "seekto", "t": 0})
        elif name == "stopVideo":
            self._do("stop")
            self._cast_send("nowPlaying", {})
        elif name == "getNowPlaying":
            self._cast_send("nowPlaying", self._now_playing_params() if self.current else {})
            self._send_state(force=True)
        elif name == "getVolume":
            self.cast_sent.pop("vol", None)
            self._send_state(force=True)
        elif name == "setSubtitlesTrack":
            lang = str(p.get("languageCode") or "")
            self._set_subtitles(bool(lang), lang if LANG_RE.match(lang) else None)
        elif name == "getSubtitlesTrack":
            vid = (self.current or {}).get("video")
            if vid:
                self._cast_send("onSubtitlesTrackChanged", {"videoId": vid, "languageCode": self.settings.get(
                    "cc_lang", "") if self.settings.get("subtitles") else ""})

    async def _pair(self, code: str) -> None:
        try:
            ok = await self.lounge.register_pairing_code(code)
            if not ok:
                self.cast_error = "YouTube did not accept the phone's pairing request. Try casting again."
            self._remember_screen()
        except Exception as exc:
            self.cast_error = "Pairing with the phone failed: %s" % (str(exc) or type(exc).__name__)
        if self.cast_error:
            log.error(self.cast_error)

    def _remember_screen(self) -> None:
        sid = getattr(self.lounge, "screen_id", None)
        if sid and self.settings.get("screen_id") != sid:
            self.settings["screen_id"] = sid
            _save_json(self.settings_path, self.settings, secret=True)

    # ---- discovery (SSDP + DIAL) ----------------------------------------
    async def _start_ssdp(self) -> None:
        """Answer the phone's 'who can I cast to?' broadcast. Failure only disables casting."""
        if self.ssdp is not None or self.port is None:
            return
        try:
            import socket
            import struct

            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if hasattr(socket, "SO_REUSEPORT"):
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            sock.bind(("", SSDP_PORT))
            try:
                mreq = struct.pack("4s4s", socket.inet_aton(SSDP_ADDR), socket.inet_aton("0.0.0.0"))
                sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            except OSError:
                pass  # unicast searches still work
            sock.setblocking(False)
            plugin = self

            class Proto(asyncio.DatagramProtocol):
                def connection_made(self, transport):
                    self.transport = transport

                def datagram_received(self, data, addr):
                    try:
                        reply = plugin.ssdp_reply(data, addr[0])
                        if reply:
                            self.transport.sendto(reply, addr)
                    except Exception as exc:
                        log.error("ssdp error: %s", exc)

            loop = asyncio.get_event_loop()
            self.ssdp, _ = await loop.create_datagram_endpoint(Proto, sock=sock)
            self.ssdp_error = None
            log.info("cast receiver advertised as %s", DEVICE_NAME)
        except Exception as exc:
            self.ssdp = None
            self.ssdp_error = "Could not start casting (%s)." % (str(exc) or type(exc).__name__)
            log.error(self.ssdp_error)

    def _stop_ssdp(self) -> None:
        if self.ssdp is not None:
            try:
                self.ssdp.close()
            except Exception:
                pass
        self.ssdp = None

    def ssdp_reply(self, data: bytes, peer_ip: str) -> Optional[bytes]:
        text = data.decode("latin-1", "replace")
        if not text.upper().startswith("M-SEARCH"):
            return None
        st = ""
        for ln in text.split("\r\n")[1:]:
            if ln.lower().startswith("st:"):
                st = ln[3:].strip()
        if st not in (DIAL_ST, "ssdp:all"):
            return None
        ip = _lan_ip_towards(peer_ip) or _lan_ip()
        if not ip or self.port is None:
            return None
        usn = "uuid:%s::%s" % (self.settings["uuid"], DIAL_ST)
        return ("HTTP/1.1 200 OK\r\nLOCATION: http://%s:%d/dial/device.xml\r\nCACHE-CONTROL: max-age=1800\r\n"
                "EXT:\r\nBOOTID.UPNP.ORG: 1\r\nSERVER: Linux/5.0 UPnP/1.1 DeckYouTubePiP/%s\r\n"
                "ST: %s\r\nUSN: %s\r\n\r\n" % (ip, self.port, VERSION, DIAL_ST, usn)).encode("latin-1")

    def _dial(self, method: str, path: str, headers: Dict[str, str], body: bytes):
        """Routes under /dial. Open to the home network on purpose: that is how casting works."""
        if not self.settings.get("cast"):
            return 404, "text/plain", b"casting is off"
        host = headers.get("host", "")
        if not re.match(r"^[A-Za-z0-9.\-]{1,64}(:\d{1,5})?$", host):
            host = "%s:%s" % (_lan_ip() or "127.0.0.1", self.port)
        base = "http://%s/dial" % host
        xml = "text/xml; charset=utf-8"
        if path == "/dial/device.xml" and method == "GET":
            doc = ('<?xml version="1.0"?><root xmlns="urn:schemas-upnp-org:device-1-0"><specVersion><major>1</major>'
                   '<minor>0</minor></specVersion><device><deviceType>urn:schemas-upnp-org:device:tvdevice:1</deviceType>'
                   '<friendlyName>%s</friendlyName><manufacturer>Valve</manufacturer><modelName>Steam Deck</modelName>'
                   '<UDN>uuid:%s</UDN></device></root>' % (DEVICE_NAME, self.settings["uuid"]))
            return 200, xml, doc.encode("utf-8"), {"Application-URL": base + "/apps/"}
        if path == "/dial/apps/YouTube" and method == "GET":
            running = bool(self.lounge is not None and self.lounge.remotes)
            screen = getattr(self.lounge, "screen_id", None) or ""
            doc = ('<?xml version="1.0" encoding="UTF-8"?><service xmlns="urn:dial-multiscreen-org:schemas:dial" '
                   'dialVer="1.7"><name>YouTube</name><options allowStop="true"/><state>%s</state>%s'
                   '<additionalData><screenId>%s</screenId></additionalData></service>'
                   % ("running" if running else "stopped", '<link rel="run" href="run"/>' if running else "",
                      re.sub(r"[^A-Za-z0-9_-]", "", screen)))
            return 200, xml, doc.encode("utf-8")
        if path in ("/dial/apps/YouTube", "/dial/apps/YouTube/run") and method in ("POST", "DELETE"):
            origin = headers.get("origin", "")
            if origin and not origin.startswith(("package:", "chrome-extension://")):
                return 403, "text/plain", b"forbidden"  # a web page, not a casting app
            if method == "POST" and path == "/dial/apps/YouTube":
                form = parse_qs(body.decode("utf-8", "replace")[:MAX_BODY])
                code = (form.get("pairingCode") or [""])[0]
                if self.lounge is not None and re.match(r"^[A-Za-z0-9-]{4,64}$", code):
                    asyncio.ensure_future(self._pair(code))
                self.cast_error = None
                return 201, "text/plain", b"", {"Location": base + "/apps/YouTube/run"}
            if method == "DELETE" and path == "/dial/apps/YouTube/run":
                return 200, "text/plain", b""
        return 404, "text/plain", b"not found"

    # ---- HTTP ------------------------------------------------------------
    async def _handle(self, reader, writer):
        try:
            peer = writer.get_extra_info("peername")
            peer_ip = peer[0] if peer else ""
            try:
                head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
            except Exception:
                return
            lines = head.decode("latin-1").split("\r\n")
            try:
                method, target, _ = lines[0].split(" ", 2)
            except ValueError:
                return
            headers: Dict[str, str] = {}
            for ln in lines[1:]:
                if ":" in ln:
                    k, v = ln.split(":", 1)
                    headers[k.strip().lower()] = v.strip()
            body = b""
            try:
                n = int(headers.get("content-length", "0") or 0)
            except ValueError:
                n = -1
            if n < 0 or n > MAX_BODY:
                await self._send(writer, 413, "text/plain", b"too large")
                return
            if n:
                try:
                    body = await asyncio.wait_for(reader.readexactly(n), 5)
                except Exception:
                    return
            res = self.route(method, target, headers, body, peer_ip)
            await self._send(writer, res[0], res[1], res[2], res[3] if len(res) > 3 else None)
        except Exception as exc:
            log.error("http error: %s", exc)
        finally:
            try:
                writer.close()
            except Exception:
                pass

    async def _send(self, writer, status: int, ctype: str, data: bytes, extra: Optional[Dict[str, str]] = None):
        reason = {200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 403: "Forbidden",
                  404: "Not Found", 405: "Method Not Allowed", 413: "Payload Too Large",
                  429: "Too Many Requests"}.get(status, "OK")
        head = ("HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %d\r\n"
                "Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n"
                "%sConnection: close\r\n\r\n"
                % (status, reason, ctype, len(data),
                   "".join("%s: %s\r\n" % (k, v) for k, v in (extra or {}).items()))).encode("latin-1")
        writer.write(head + data)
        await writer.drain()

    @staticmethod
    def _json(obj: Any, status: int = 200):
        return status, "application/json; charset=utf-8", json.dumps(obj).encode("utf-8")

    def _local_ok(self, headers: Dict[str, str], peer_ip: str, q: Dict[str, List[str]]) -> bool:
        if peer_ip not in LOOPBACK:
            return False
        h = headers.get("host", "")
        if h.startswith("["):
            host = h.split("]")[0] + "]"
        elif ":" in h:
            host = h.rsplit(":", 1)[0]
        else:
            host = h
        if host not in LOCAL_HOSTS:
            return False
        return _same((q.get("s") or [""])[0], self.secret)

    def _token_status(self, given: str) -> int:
        """200 ok, 403 wrong, 429 too many wrong guesses lately (a correct token always passes)."""
        if _same(given, self.settings.get("token", "")):
            return 200
        now = time.time()
        self.bad_tokens = [t for t in self.bad_tokens if now - t < 60]
        self.bad_tokens.append(now)
        return 429 if len(self.bad_tokens) > 30 else 403

    def route(self, method: str, target: str, headers: Dict[str, str], body: bytes, peer_ip: str):
        u = urlparse(target)
        path = u.path
        q = parse_qs(u.query)
        if path == "/favicon.ico":
            return 204, "text/plain", b""
        if path.startswith("/dial/"):
            return self._dial(method, path, headers, body)

        # ---- loopback only: the player page and its API -------------------
        if path == "/player" and method == "GET":
            if not self._local_ok(headers, peer_ip, q):
                return 403, "text/plain", b"forbidden"
            return 200, "text/html; charset=utf-8", self.player_html
        if path == "/api/poll" and method == "GET":
            if not self._local_ok(headers, peer_ip, q):
                return 403, "text/plain", b"forbidden"
            try:
                after = int((q.get("after") or ["-1"])[0])
            except ValueError:
                after = -1
            if after > self.cmd_id:
                after = -1
            out: Dict[str, Any] = {"last": self.cmd_id, "cmds": [], "init": None}
            if after < 0:
                out["init"] = self._init_load()
            else:
                out["cmds"] = [c for c in self.cmds if c["id"] > after]
            return self._json(out)
        if path == "/api/report" and method == "POST":
            if not self._local_ok(headers, peer_ip, q):
                return 403, "text/plain", b"forbidden"
            try:
                data = json.loads(body.decode("utf-8") or "{}")
            except Exception:
                return self._json({"ok": False}, 400)
            self._on_report(data if isinstance(data, dict) else {})
            return self._json({"ok": True})

        # ---- phone: token protected ---------------------------------------
        if path.startswith("/r/") and method == "GET":
            code = self._token_status(path[3:])
            if code != 200:
                return code, "text/plain", b"forbidden"
            return 200, "text/html; charset=utf-8", self.remote_html
        if path in ("/api/rstate", "/api/remote"):
            code = self._token_status((q.get("k") or [""])[0])
            if code != 200:
                return code, "text/plain", b"forbidden"
            if path == "/api/rstate" and method == "GET":
                return self._json(self._phone_state())
            if path == "/api/remote" and method == "POST":
                try:
                    data = json.loads(body.decode("utf-8") or "{}")
                except Exception:
                    return self._json({"ok": False, "message": "bad request"}, 400)
                if not isinstance(data, dict):
                    return self._json({"ok": False, "message": "bad request"}, 400)
                res = self._do(str(data.get("action", "")), data.get("value"), data.get("url"))
                res["state"] = self._phone_state()
                return self._json(res)
            return 405, "text/plain", b"method not allowed"
        return 404, "text/plain", b"not found"

    # ---- core logic ------------------------------------------------------
    def _push_cmd(self, cmd: Dict[str, Any]) -> None:
        self.cmd_id += 1
        cmd["id"] = self.cmd_id
        self.cmds.append(cmd)
        if len(self.cmds) > 64:
            self.cmds = self.cmds[-64:]

    def _want_muted(self) -> bool:
        return bool(self.settings.get("start_muted")) or self.user_muted

    def _set_volume(self, vol: float) -> None:
        """The video's own volume (YouTube's player), not the Deck's. Remembered for the next videos."""
        v = int(round(vol))
        self._push_cmd({"cmd": "setvol", "vol": v})
        self.vol_set_at = time.time()
        if self.settings.get("volume") != v:
            self.settings["volume"] = v
            _save_json(self.settings_path, self.settings, secret=True)

    def _cc_args(self) -> Dict[str, Any]:
        return {"cc": bool(self.settings.get("subtitles")), "ccLang": self.settings.get("cc_lang", "")}

    def _set_subtitles(self, on: bool, lang: Optional[str] = None) -> None:
        """Subtitles on/off for this and the next videos. lang: preferred language ('' = the player's choice)."""
        self.settings["subtitles"] = bool(on)
        if lang is not None and (lang == "" or LANG_RE.match(lang)):
            self.settings["cc_lang"] = lang
        _save_json(self.settings_path, self.settings, secret=True)
        self._push_cmd(dict({"cmd": "cc"}, **self._cc_args()))
        vid = (self.current or {}).get("video")
        if vid:
            self._cast_send("onSubtitlesTrackChanged", {"videoId": vid,
                                                         "languageCode": self.settings["cc_lang"] if on else ""})

    def _init_load(self) -> Optional[Dict[str, Any]]:
        cur = self.current
        if not cur:
            return None
        start = int(self.resume_t) if self.resume_t > 5 else int(cur.get("start", 0))
        return {"cmd": "load", "video": cur.get("video"), "list": cur.get("list"),
                "start": start, "muted": self._want_muted(), "vol": int(self.settings.get("volume", 100)), **self._cc_args(), "seq": self.seq}

    def _start_item(self, item: Dict[str, Any]) -> None:
        self.current = item
        self.seq += 1
        self.resume_t = 0.0
        self.report = {}
        self._push_cmd({"cmd": "load", "video": item.get("video"), "list": item.get("list"),
                        "start": int(item.get("start", 0)),
                        "muted": self._want_muted(), "vol": int(self.settings.get("volume", 100)), **self._cc_args(), "seq": self.seq})
        self.cast_sent = {}
        if item.get("video"):
            self._cast_send("nowPlaying", self._now_playing_params())  # keeps the phone's app in step

    def _advance(self, rotate: bool = False) -> bool:
        """Start the next queued item. With rotate (repeat all) the finished one goes to the back."""
        if not self.queue:
            return False
        prev = self.current
        self._start_item(self.queue.pop(0))
        if rotate and prev is not None and self.settings.get("repeat") == "all":
            prev = dict(prev)
            prev["start"] = 0
            self.queue.append(prev)
        return True

    def _replay(self) -> None:
        if self.current is not None:
            item = dict(self.current)
            item["start"] = 0
            self._start_item(item)

    def _on_report(self, d: Dict[str, Any]) -> None:
        rep = {
            "seq": int(_num(d.get("seq"), 0, 10 ** 9)),
            "state": int(_num(d.get("state"), -2, 10, -2)),
            "t": _num(d.get("t"), 0, 86400 * 2),
            "d": _num(d.get("d"), 0, 86400 * 2),
            "vol": int(_num(d.get("vol"), 0, 100)),
            "muted": bool(d.get("muted")),
            "title": str(d.get("title") or "")[:200],
            "err": int(_num(d.get("err"), 0, 1000)),
            "cc": str(d.get("cc") or "")[:16] if LANG_RE.match(str(d.get("cc") or "")) else "",
            "blocked": bool(d.get("blocked")),
            "last": bool(d.get("last", True)),
        }
        self.report_ts = time.time()  # the player page is alive either way
        if rep["seq"] != self.seq:
            return  # late report from a previous load: do not let it overwrite the new state
        self.report = rep
        self._send_state()
        now = time.time()
        if (self.current is not None and rep["state"] in (1, 2) and rep["vol"] != self.settings.get("volume")
                and now - self.vol_set_at > 3 and now - self.vol_saved_at > 3):
            self.settings["volume"] = rep["vol"]  # changed from the phone page's Vol +/- (or the player itself)
            self.vol_saved_at = now
            _save_json(self.settings_path, self.settings, secret=True)
        if self.current is not None and rep["title"]:
            self.current["title"] = rep["title"]
        if rep["state"] in (1, 2) and rep["t"] > 0:
            self.resume_t = rep["t"]
        ended = rep["state"] == 0 and rep["last"]
        failed = rep["err"] in (2, 5, 100, 101, 150, 153)
        if ended and self.settings.get("repeat") == "one":
            self._replay()
        elif ended and self.queue:
            self._advance(rotate=True)
        elif ended and self.settings.get("repeat") == "all":
            self._replay()  # a single item on repeat all just plays again
        elif failed and rep["err"] == 5 and self.retried_seq != self.seq and self.current is not None:
            # error 5 is usually a one-off player hiccup: reload once from where it was
            item = dict(self.current)
            item["start"] = int(self.resume_t)
            self._start_item(item)
            self.retried_seq = self.seq  # the retry itself is not retried again
        elif failed and self.queue:
            self._advance()

    def _do(self, action: str, value: Any = None, url: Any = None) -> Dict[str, Any]:
        if action in ("play", "queue"):
            item = parse_youtube(url)
            if item is None:
                return {"ok": False, "message": "That is not a YouTube link."}
            item = dict(item)
            item["title"] = ""
            finished = self.report.get("seq") == self.seq and self.report.get("state") == 0
            if action == "play" or self.current is None or (finished and not self.queue):
                self._start_item(item)
                self._fetch_title(item)
                return {"ok": True, "message": "Playing."}
            if len(self.queue) >= MAX_QUEUE:
                return {"ok": False, "message": "Queue is full."}
            self.queue.append(item)
            self._fetch_title(item)
            return {"ok": True, "message": "Added to queue (%d)." % len(self.queue)}
        if action == "playpause":
            self._push_cmd({"cmd": "toggle"})
        elif action == "seek":
            self._push_cmd({"cmd": "seek", "rel": _num(value, -600, 600)})
        elif action == "vol":
            self._push_cmd({"cmd": "vol", "delta": _num(value, -100, 100)})
        elif action == "seekto":
            self._push_cmd({"cmd": "seekto", "t": _num(value, 0, 86400 * 2)})
        elif action == "setvol":
            self._set_volume(_num(value, 0, 100, 100))
        elif action == "subs":
            want = value if value in ("on", "off") else url
            if want in ("on", "off"):
                self._set_subtitles(want == "on")
            else:
                self._set_subtitles(not self.settings.get("subtitles"))
        elif action == "mute":
            self.user_muted = not bool(self.report.get("muted", self.user_muted))
            self._push_cmd({"cmd": "mute"})
        elif action == "next":
            if self.queue:
                self._advance(rotate=True)
            elif self.current and self.current.get("list") and not self.current.get("video"):
                self._push_cmd({"cmd": "nextvideo"})  # inside a playlist: its own next video
            elif self.current and self.settings.get("repeat") == "all":
                self._replay()
            else:
                return {"ok": False, "message": "Nothing queued."}
        elif action == "retry":
            if self.current is None:
                return {"ok": False, "message": "Nothing to retry."}
            item = dict(self.current)
            item["start"] = int(self.resume_t)
            self._start_item(item)
        elif action == "repeat":
            cur = self.settings.get("repeat", "off")
            arg = value if isinstance(value, str) else url
            if isinstance(arg, str) and arg in REPEAT_MODES:
                new = arg
            else:
                new = REPEAT_MODES[(REPEAT_MODES.index(cur) + 1) % len(REPEAT_MODES)]
            self.settings["repeat"] = new
            _save_json(self.settings_path, self.settings, secret=True)
        elif action == "playnow":
            idx = int(_num(value, 0, MAX_QUEUE, -1))
            if not 0 <= idx < len(self.queue):
                return {"ok": False, "message": "That item is no longer queued."}
            self._start_item(self.queue.pop(idx))
        elif action in ("up", "down"):
            idx = int(_num(value, 0, MAX_QUEUE, -1))
            new = idx - 1 if action == "up" else idx + 1
            if 0 <= idx < len(self.queue) and 0 <= new < len(self.queue):
                self.queue[idx], self.queue[new] = self.queue[new], self.queue[idx]
        elif action == "stop":
            self.current = None
            self.resume_t = 0.0
            self.report = {}
            self.seq += 1
            self._push_cmd({"cmd": "stop"})
        elif action == "clear":
            self.queue = []
        elif action == "remove":
            idx = int(_num(value, 0, MAX_QUEUE, -1))
            if 0 <= idx < len(self.queue):
                self.queue.pop(idx)
        else:
            return {"ok": False, "message": "Unknown action."}
        return {"ok": True, "message": "OK"}

    def _fetch_title(self, item: Dict[str, Any]) -> None:
        vid = item.get("video")
        if not vid:
            return
        if vid in self.titles:
            item["title"] = self.titles[vid]
            return
        asyncio.ensure_future(self._title_task(item, vid))

    async def _title_task(self, item: Dict[str, Any], vid: str) -> None:
        try:
            watch = "https://www.youtube.com/watch?v=" + vid
            url = "https://www.youtube.com/oembed?format=json&url=" + quote(watch, safe="")
            proc = await asyncio.create_subprocess_exec(
                "curl", "-sS", "-m", "5", url, env=_clean_env(),
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            out, _ = await asyncio.wait_for(proc.communicate(), 8)
            title = str(json.loads(out.decode("utf-8", "replace")).get("title") or "")[:200]
            if title:
                self.titles[vid] = title
                item["title"] = title
        except Exception:
            pass  # titles are a nicety only

    # ---- state for the panel and the phone -------------------------------
    def _report_view(self) -> Dict[str, Any]:
        age = time.time() - self.report_ts if self.report_ts else None
        rep = dict(self.report)
        rep["age"] = None if age is None else round(age, 1)
        return rep

    def _items(self) -> List[Dict[str, Any]]:
        return [{"video": i.get("video"), "list": i.get("list"), "title": i.get("title", "")}
                for i in self.queue]

    def _now(self) -> Optional[Dict[str, Any]]:
        if not self.current:
            return None
        title = self.current.get("title") or self.report.get("title") or ""
        return {"video": self.current.get("video"), "list": self.current.get("list"), "title": title}

    def _phone_state(self) -> Dict[str, Any]:
        rep = self._report_view()
        online = rep.get("age") is not None and rep["age"] < 5
        return {"now": self._now(), "queue": self._items(),
                "playing": rep.get("state") == 1, "muted": rep.get("muted", False),
                "player_online": online, "repeat": self.settings.get("repeat", "off"), "subtitles": bool(self.settings.get("subtitles")),
                "t": rep.get("t", 0) if online else 0, "d": rep.get("d", 0) if online else 0,
                "vol": rep.get("vol", 100), "err": rep.get("err", 0),
                "blocked": bool(rep.get("blocked"))}

    # ---- methods called from the panel -----------------------------------
    async def get_state(self) -> Dict[str, Any]:
        lg = self.lounge
        if lg is not None:
            self._remember_screen()
        ip = _lan_ip()
        port = self.port
        base = "http://%s:%s" % (ip, port) if (ip and port and self.bind_all) else None
        return {
            "ok": self.server is not None and self.assets_ok,
            "version": VERSION,
            "error": self.start_error,
            "port": port,
            "lan_ip": ip,
            "bind_all": self.bind_all,
            # "localhost", not 127.0.0.1: YouTube refuses to embed most videos on a page whose address is a bare IP
            # (error 150 "owner does not allow embedding"), but accepts the same page at localhost.
            "player_url": ("http://localhost:%s/player?s=%s" % (port, self.secret)) if port else None,
            "remote_url": ("%s/r/%s" % (base, self.settings["token"])) if base else None,
            "seq": self.seq,
            "now": self._now(),
            "queue": self._items(),
            "report": self._report_view(),
            "start_muted": bool(self.settings.get("start_muted")),
            "volume": int(self.settings.get("volume", 100)),
            "subtitles": bool(self.settings.get("subtitles")),
            "repeat": self.settings.get("repeat", "off"),
            "cast": {"on": bool(self.settings.get("cast")), "advertising": self.ssdp is not None,
                     "connected": bool(lg is not None and lg.connected),
                     "phones": sorted(set(lg.remotes.values())) if lg is not None else [],
                     "active": bool(lg is not None and lg.remotes), "seq": self.cast_seq, "name": DEVICE_NAME,
                     "error": self.cast_error or self.ssdp_error or (lg.error if lg is not None else None)},
        }

    async def control(self, action: str, value: Any = None, url: Any = None) -> Dict[str, Any]:
        return self._do(str(action), value, url)

    async def set_start_muted(self, value: bool) -> bool:
        self.settings["start_muted"] = bool(value)
        _save_json(self.settings_path, self.settings, secret=True)
        return bool(value)

    async def set_cast(self, value: bool) -> Dict[str, Any]:
        self.settings["cast"] = bool(value)
        _save_json(self.settings_path, self.settings, secret=True)
        self.cast_error = None
        if value:
            await self._start_cast()
        else:
            await self._close_cast()
        return {"ok": True}

    async def forget_phones(self) -> Dict[str, Any]:
        """Disconnect and unpair every phone: the Deck gets a new cast identity, old pairings stop working."""
        if self.lounge is not None:
            await self.lounge.close()
            self.lounge.forget()
        self.settings.pop("screen_id", None)
        _save_json(self.settings_path, self.settings, secret=True)
        self.cast_ids = []
        if self.settings.get("cast") and self.lounge is not None:
            self.lounge.start()
        return {"ok": True, "message": "Phones disconnected. To cast again, pick Steam Deck in the YouTube app."}

    async def tv_code(self) -> Dict[str, Any]:
        """A code for the YouTube app's "Link with TV code" (for when the Deck does not show up in the cast list)."""
        if self.lounge is None or not self.settings.get("cast"):
            return {"ok": False, "message": "Turn on \"Show as a cast device\" first."}
        try:
            code = await self.lounge.tv_code()
            self._remember_screen()
        except Exception as exc:
            return {"ok": False, "message": "Could not get a code: %s" % (str(exc) or type(exc).__name__)}
        if not code:
            return {"ok": False, "message": "YouTube did not give a code. Try again in a minute."}
        return {"ok": True, "message": " ".join(code[i:i + 3] for i in range(0, len(code), 3))}

    async def reset_link(self) -> Dict[str, Any]:
        self.settings["token"] = _rand_hex(6)
        _save_json(self.settings_path, self.settings, secret=True)
        return {"ok": True}

    async def log_line(self, text: str) -> bool:
        log.info("panel: %s", str(text)[:300])
        return True
