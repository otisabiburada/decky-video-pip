// shims/api.js
var manifest = { name: "YouTube PiP" };
var API_VERSION = 2;
var conn = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!conn) throw new Error("[@decky/api]: Failed to connect to the loader as the loader API was not initialized.");
var api;
try {
  api = conn.connect(API_VERSION, manifest.name);
} catch {
  api = conn.connect(1, manifest.name);
}
var callable = api.callable;
var routerHook = api.routerHook;
var toaster = api.toaster;
var addEventListener = api.addEventListener;
var removeEventListener = api.removeEventListener;
var definePlugin = (fn) => (...args) => fn(...args);

// shims/ui.js
var D = window.DFL;
var ButtonItem = D.ButtonItem;
var DialogButton = D.DialogButton;
var PanelSection = D.PanelSection;
var PanelSectionRow = D.PanelSectionRow;
var SliderField = D.SliderField;
var TextField = D.TextField;
var ToggleField = D.ToggleField;
var staticClasses = D.staticClasses;
var Router = D.Router;
var findModuleChild = D.findModuleChild;
var getGamepadNavigationTrees = D.getGamepadNavigationTrees;

// shims/react.js
var R = window.SP_REACT;
var useState = R.useState;
var useEffect = R.useEffect;
var useRef = R.useRef;
var useMemo = R.useMemo;
var Fragment = R.Fragment;
var react_default = R;

// node_modules/react-icons/lib/iconContext.mjs
var DefaultContext = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
};
var IconContext = react_default.createContext && /* @__PURE__ */ react_default.createContext(DefaultContext);

// node_modules/react-icons/lib/iconBase.mjs
var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) {
  if (null == e) return {};
  var o, r, i = _objectWithoutPropertiesLoose(e, t);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]);
  }
  return i;
}
function _objectWithoutPropertiesLoose(r, e) {
  if (null == r) return {};
  var t = {};
  for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
    if (-1 !== e.indexOf(n)) continue;
    t[n] = r[n];
  }
  return t;
}
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n) {
    for (var e = 1; e < arguments.length; e++) {
      var t = arguments[e];
      for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
    }
    return n;
  }, _extends.apply(null, arguments);
}
function ownKeys(e, r) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    r && (o = o.filter(function(r2) {
      return Object.getOwnPropertyDescriptor(e, r2).enumerable;
    })), t.push.apply(t, o);
  }
  return t;
}
function _objectSpread(e) {
  for (var r = 1; r < arguments.length; r++) {
    var t = null != arguments[r] ? arguments[r] : {};
    r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
      _defineProperty(e, r2, t[r2]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
      Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
    });
  }
  return e;
}
function _defineProperty(e, r, t) {
  return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, "string");
  return "symbol" == typeof i ? i : i + "";
}
function _toPrimitive(t, r) {
  if ("object" != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != typeof i) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /* @__PURE__ */ react_default.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return (props) => /* @__PURE__ */ react_default.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = (conf) => {
    var attr = props.attr, size = props.size, title = props.title, svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /* @__PURE__ */ react_default.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /* @__PURE__ */ react_default.createElement("title", null, title), props.children);
  };
  return IconContext !== void 0 ? /* @__PURE__ */ react_default.createElement(IconContext.Consumer, null, (conf) => elem(conf)) : elem(DefaultContext);
}

// node_modules/react-icons/fa/index.mjs
function FaYoutube(props) {
  return GenIcon({ "tag": "svg", "attr": { "viewBox": "0 0 576 512" }, "child": [{ "tag": "path", "attr": { "d": "M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z" }, "child": [] }] })(props);
}

// ../work/youtube-pip/src/store.ts
var Store = class {
  constructor(init, key, persist = [], sanitize) {
    this.key = key;
    this.persist = persist;
    this.sanitize = sanitize;
    this.subs = /* @__PURE__ */ new Set();
    this.v = init;
    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const saved = JSON.parse(raw);
          const merged = { ...init };
          for (const k of persist) {
            if (saved[k] !== void 0 && typeof saved[k] === typeof init[k]) merged[k] = saved[k];
          }
          this.v = sanitize ? sanitize(merged) : merged;
        }
      } catch {
      }
    }
  }
  get() {
    return this.v;
  }
  set(patch) {
    const next = { ...this.v, ...patch };
    this.v = this.sanitize ? this.sanitize(next) : next;
    if (this.key && this.persist.some((k) => k in patch)) {
      try {
        const out = {};
        for (const k of this.persist) out[k] = this.v[k];
        localStorage.setItem(this.key, JSON.stringify(out));
      } catch {
      }
    }
    this.subs.forEach((fn) => fn());
  }
  subscribe(fn) {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }
};
function useStore(store) {
  const [value, setValue] = useState(store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(() => setValue(store.get()));
  }, [store]);
  return value;
}
var DEFAULT_SETTINGS = {
  mode: 0 /* Off */,
  corner: 1,
  size: 0.4,
  margin: 24,
  keepPlaying: true,
  autoOpen: true,
  hideForMenus: false
};
var clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
var settings = new Store(
  DEFAULT_SETTINGS,
  "ytpip.settings.v2",
  ["corner", "size", "margin", "keepPlaying", "autoOpen", "hideForMenus"],
  (s) => ({
    ...s,
    corner: clamp(Math.round(s.corner), 0, 3),
    size: clamp(s.size, 0.2, 0.5),
    margin: clamp(Math.round(s.margin), 0, 80)
  })
);
var runtime = new Store({ state: null, error: null, lastOk: 0 });

// ../work/youtube-pip/src/backend.ts
function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("The plugin's background part isn't answering.")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
var _getState = callable("get_state");
var _control = callable("control");
var _setStartMuted = callable("set_start_muted");
var _resetLink = callable("reset_link");
var _setCast = callable("set_cast");
var _tvCode = callable("tv_code");
var _forgetPhones = callable("forget_phones");
var _logLine = callable("log_line");
var getState = () => withTimeout(_getState(), 3500);
var control = (action, value = null, url = null) => withTimeout(_control(action, value, url), 4e3);
var setStartMuted = (v) => withTimeout(_setStartMuted(v), 4e3);
var resetLink = () => withTimeout(_resetLink(), 4e3);
var setCast = (v) => withTimeout(_setCast(v), 12e3);
var tvCode = () => withTimeout(_tvCode(), 2e4);
var forgetPhones = () => withTimeout(_forgetPhones(), 15e3);
var logLine = (t) => withTimeout(_logLine(t), 3e3).catch(() => false);
var timer = null;
var lastSeq = null;
var lastCastSeq = null;
var busy = false;
async function refresh() {
  if (busy) return;
  busy = true;
  try {
    const st = await getState();
    runtime.set({ state: st, error: null, lastOk: Date.now() });
    const s = settings.get();
    if (lastSeq !== null && st.seq !== lastSeq && st.now && s.autoOpen && s.mode === 0 /* Off */) {
      settings.set({ mode: 1 /* Picture */ });
    }
    lastSeq = st.seq;
    if (lastCastSeq !== null && st.cast.seq !== lastCastSeq && st.cast.active && s.mode === 0 /* Off */) {
      settings.set({ mode: 1 /* Picture */ });
    }
    lastCastSeq = st.cast.seq;
  } catch (e) {
    runtime.set({ error: e instanceof Error ? e.message : String(e) });
  } finally {
    busy = false;
  }
}
function startPolling() {
  if (timer) return;
  void refresh();
  timer = setInterval(() => void refresh(), 1500);
}
function stopPolling() {
  if (timer) clearInterval(timer);
  timer = null;
}

// ../work/youtube-pip/src/composition.tsx
var hook = null;
var compositionError = null;
try {
  const found = findModuleChild((m) => {
    if (typeof m !== "object") return void 0;
    for (const prop in m) {
      if (typeof m[prop] !== "function") continue;
      const src = m[prop].toString();
      if (src.includes("AddMinimumCompositionStateRequest") && src.includes("ChangeMinimumCompositionStateRequest") && src.includes("RemoveMinimumCompositionStateRequest") && !src.includes("m_mapCompositionStateRequests")) {
        return m[prop];
      }
    }
    return void 0;
  });
  hook = found ?? null;
  if (!hook) compositionError = "Steam's composition hook was not found.";
} catch (e) {
  compositionError = "Searching for the composition hook failed: " + (e instanceof Error ? e.message : String(e));
}
var compositionAvailable = () => hook !== null;
var Composition = ({ level }) => {
  if (hook) hook(level);
  return null;
};

// ../work/youtube-pip/src/layout.ts
var DEFAULT_SCREEN = { w: 854, h: 534 };
var KEYBOARD_FRACTION = 240 / 534;
var sane = (w, h) => typeof w === "number" && typeof h === "number" && w >= 320 && w <= 4e3 && h >= 200 && h <= 3e3;
function getScreenSize() {
  try {
    const bw = Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow;
    if (bw && sane(bw.innerWidth, bw.innerHeight)) {
      return { w: bw.innerWidth, h: bw.innerHeight, source: "Steam main window" };
    }
  } catch {
  }
  return { ...DEFAULT_SCREEN, source: "default (Steam Deck)" };
}
function treeWindow(trees, id) {
  return trees.find((t) => t?.id === id)?.m_Root?.m_element?.ownerDocument?.defaultView ?? null;
}
var width = (win) => {
  if (!win || win.document?.hidden) return 0;
  const n = win.outerWidth;
  return typeof n === "number" && n > 0 && n < 4e3 ? n : 0;
};
var MAX_MENU_SHARE = 0.45;
function describeParts() {
  const out = [];
  try {
    const trees = getGamepadNavigationTrees() ?? [];
    out.push("Trees: " + trees.map((t) => t?.id).join(", "));
    for (const id of ["MainNavMenuContainer", "QuickAccess-NA", "virtual keyboard"]) {
      const win = treeWindow(trees, id);
      out.push(id + ": " + (win ? "window " + win.outerWidth + "x" + win.outerHeight + ", hidden=" + !!win.document?.hidden + (win === mainWindow() ? ", main window" : "") : "none"));
    }
  } catch (e) {
    out.push("Could not read the menus: " + (e instanceof Error ? e.message : String(e)));
  }
  return out;
}
function mainWindow() {
  try {
    return Router.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow ?? null;
  } catch {
    return null;
  }
}
function menuShowing(win, main) {
  return !!win && win !== main && !win.document?.hidden;
}
function readDeckParts(screenW = DEFAULT_SCREEN.w) {
  try {
    const trees = getGamepadNavigationTrees() ?? [];
    const cap = screenW * MAX_MENU_SHARE;
    const ok = (n) => n > 0 && n <= cap ? n : 0;
    const main = mainWindow();
    const nav = treeWindow(trees, "MainNavMenuContainer");
    const qam = treeWindow(trees, "QuickAccess-NA");
    return {
      navWidth: ok(width(nav)),
      qamWidth: ok(width(qam)),
      // The keyboard's navigation tree sits in the main window on a real Deck, so "found" does not mean "open"
      // (it always looked open and pushed the bottom corners up). Ignored until there is a reliable signal.
      keyboard: false,
      menuOpen: menuShowing(nav, main) || menuShowing(qam, main)
    };
  } catch {
    return { navWidth: 0, qamWidth: 0, keyboard: false, menuOpen: false };
  }
}
var clamp2 = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function computeBounds(corner, size, margin, screen, parts) {
  const keyboardH = parts.keyboard ? Math.round(screen.h * KEYBOARD_FRACTION) : 0;
  const area = {
    x: parts.navWidth + margin,
    y: margin,
    w: Math.max(screen.w * 0.5, screen.w - parts.navWidth - parts.qamWidth - margin * 2),
    h: Math.max(screen.h * 0.4, screen.h - keyboardH - margin * 2)
  };
  let w = clamp2(screen.w * size, 160, area.w);
  let h = w * 9 / 16;
  if (h > area.h) {
    h = area.h;
    w = h * 16 / 9;
  }
  const c = clamp2(Math.round(corner), 0, 3);
  return {
    x: Math.round(area.x + c % 2 * (area.w - w)),
    y: Math.round(area.y + Math.floor(c / 2) * (area.h - h)),
    width: Math.round(w),
    height: Math.round(h)
  };
}

// ../work/youtube-pip/src/view.ts
var PROBE_METHODS = [
  "SetBounds",
  "SetVisible",
  "LoadURL",
  "Destroy",
  "GetBrowser",
  "SetFocus",
  "SetAudioMuted",
  "SetName"
];
var PipView = class {
  constructor() {
    this.view = null;
    this.browser = null;
    this.url = "";
    this.visible = null;
    this.boundsKey = "";
    this.error = null;
    this.lastBounds = null;
  }
  get exists() {
    return this.view !== null;
  }
  create() {
    if (this.view) return true;
    try {
      const w = window;
      if (w.__ytPipView) {
        try {
          w.__ytPipView.Destroy();
        } catch {
        }
        w.__ytPipView = null;
      }
      const root = Router.WindowStore?.GamepadUIMainWindowInstance;
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
  guard(what, fn) {
    try {
      fn();
    } catch (e) {
      this.error = what + " failed: " + (e instanceof Error ? e.message : String(e));
    }
  }
  setBounds(b) {
    if (!this.browser) return;
    const key = [b.x, b.y, b.width, b.height].join(",");
    this.lastBounds = b;
    if (key === this.boundsKey) return;
    this.boundsKey = key;
    this.guard("SetBounds", () => this.browser.SetBounds(b.x, b.y, b.width, b.height));
  }
  load(url) {
    if (!this.view || url === this.url) return;
    this.url = url;
    this.guard("LoadURL", () => this.view.LoadURL(url));
  }
  setVisible(v) {
    if (!this.browser || v === this.visible) return;
    this.visible = v;
    this.guard("SetVisible", () => this.browser.SetVisible(v));
  }
  destroy() {
    if (!this.view) return;
    const v = this.view;
    this.view = this.browser = null;
    this.url = "";
    this.visible = null;
    this.boundsKey = "";
    try {
      v.Destroy();
    } catch {
    }
    const w = window;
    if (w.__ytPipView === v) w.__ytPipView = null;
  }
  /** Which of the methods this plugin could use exist on the Steam objects (for diagnostics). */
  probe() {
    const have = (o) => o ? PROBE_METHODS.filter((m) => typeof o[m] === "function") : [];
    return { view: have(this.view), browser: have(this.browser) };
  }
};
var pip = new PipView();

// ../work/youtube-pip/src/host.tsx
var NO_PARTS = { navWidth: 0, qamWidth: 0, keyboard: false, menuOpen: false };
function useDeckParts(active, screenW) {
  const [parts, setParts] = useState(NO_PARTS);
  useEffect(() => {
    if (!active) {
      setParts(NO_PARTS);
      return;
    }
    const tick = () => {
      const next = readDeckParts(screenW);
      setParts(
        (cur) => cur.navWidth === next.navWidth && cur.qamWidth === next.qamWidth && cur.keyboard === next.keyboard && cur.menuOpen === next.menuOpen ? cur : next
      );
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active, screenW]);
  return parts;
}
var PipHost = () => {
  const s = useStore(settings);
  const rt = useStore(runtime);
  const screen = getScreenSize();
  const parts = useDeckParts(s.mode !== 0 /* Off */, screen.w);
  const [shown, setShown] = useState(false);
  const url = rt.state?.player_url ?? null;
  const b = computeBounds(s.corner, s.size, s.margin, screen, parts);
  const key = [b.x, b.y, b.width, b.height].join(",");
  const tucked = s.hideForMenus && parts.menuOpen;
  useEffect(() => {
    if (s.mode !== 0 /* Off */ && tucked && url && pip.exists) {
      pip.setVisible(false);
      setShown(false);
      return;
    }
    if (s.mode === 0 /* Off */) {
      if (s.keepPlaying) {
        if (url) pip.load(url);
        pip.setVisible(false);
      } else pip.destroy();
      setShown(false);
      return;
    }
    if (!url || !pip.create()) {
      setShown(false);
      return;
    }
    pip.setBounds(b);
    pip.load(url);
    pip.setVisible(true);
    setShown(true);
  }, [s.mode, s.keepPlaying, url, key, tucked]);
  return shown ? /* @__PURE__ */ window.SP_REACT.createElement(Composition, { level: 1 /* Notification */ }) : null;
};

// ../work/youtube-pip/src/qr.ts
var ECC_PER_BLOCK = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
};
var NUM_BLOCKS = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]
};
var FORMAT_BITS = { L: 1, M: 0 };
var MAX_VERSION = 6;
function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
function dataCodewords(ver, ecc) {
  return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecc][ver] * NUM_BLOCKS[ecc][ver];
}
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = z << 1 ^ (z >>> 7) * 285;
    z ^= (y >>> i & 1) * x;
  }
  return z;
}
function rsDivisor(degree) {
  const result = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}
function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMul(coef, factor);
    });
  }
  return result;
}
function utf8(text) {
  const out = [];
  for (const ch of unescape(encodeURIComponent(text))) out.push(ch.charCodeAt(0));
  return out;
}
function getBit(x, i) {
  return (x >>> i & 1) !== 0;
}
function encodeQr(text, ecc = "M", forceMask) {
  const bytes = utf8(text);
  let ver = 1;
  for (; ver <= MAX_VERSION; ver++) {
    const capBits2 = dataCodewords(ver, ecc) * 8;
    const used = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8;
    if (used <= capBits2) break;
  }
  if (ver > MAX_VERSION) throw new Error("Text too long for QR code");
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push(val >>> i & 1);
  };
  push(4, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const capBits = dataCodewords(ver, ecc) * 8;
  push(0, Math.min(4, capBits - bits.length));
  push(0, (8 - bits.length % 8) % 8);
  for (let pad = 236; bits.length < capBits; pad ^= 236 ^ 17) push(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = v << 1 | bits[i + j];
    data.push(v);
  }
  const nBlocks = NUM_BLOCKS[ecc][ver];
  const blockEcc = ECC_PER_BLOCK[ecc][ver];
  const rawCw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlocks - rawCw % nBlocks;
  const shortLen = Math.floor(rawCw / nBlocks);
  const blocks = [];
  const div = rsDivisor(blockEcc);
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - blockEcc + (i < nShort ? 0 : 1));
    k += dat.length;
    const e = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(e));
  }
  const all = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((blk, j) => {
      if (i !== shortLen - blockEcc || j >= nShort) all.push(blk[i]);
    });
  }
  const size = ver * 4 + 17;
  const modules = [];
  const isFn = [];
  for (let i = 0; i < size; i++) {
    modules.push(new Array(size).fill(false));
    isFn.push(new Array(size).fill(false));
  }
  const setFn = (x, y, dark) => {
    modules[y][x] = dark;
    isFn[y][x] = true;
  };
  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const alignPos = [];
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    alignPos.push(6);
    for (let pos = size - 7; alignPos.length < n; pos -= step) alignPos.splice(1, 0, pos);
  }
  const nA = alignPos.length;
  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nA; j++) {
      if (i === 0 && j === 0 || i === 0 && j === nA - 1 || i === nA - 1 && j === 0) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(alignPos[i] + dx, alignPos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  const drawFormat = (mask) => {
    const d = FORMAT_BITS[ecc] << 3 | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = rem << 1 ^ (rem >>> 9) * 1335;
    const fb = (d << 10 | rem) ^ 21522;
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(fb, i));
    setFn(8, 7, getBit(fb, 6));
    setFn(8, 8, getBit(fb, 7));
    setFn(7, 8, getBit(fb, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(fb, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(fb, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(fb, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = rem << 1 ^ (rem >>> 11) * 7973;
    const vb = ver << 12 | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + i % 3;
      const b = Math.floor(i / 3);
      setFn(a, b, getBit(vb, i));
      setFn(b, a, getBit(vb, i));
    }
  }
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = (right + 1 & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && bi < all.length * 8) {
          modules[y][x] = getBit(all[bi >>> 3], 7 - (bi & 7));
          bi++;
        }
      }
    }
  }
  const applyMask = (mask) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let inv = false;
        switch (mask) {
          case 0:
            inv = (x + y) % 2 === 0;
            break;
          case 1:
            inv = y % 2 === 0;
            break;
          case 2:
            inv = x % 3 === 0;
            break;
          case 3:
            inv = (x + y) % 3 === 0;
            break;
          case 4:
            inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            inv = x * y % 2 + x * y % 3 === 0;
            break;
          case 6:
            inv = (x * y % 2 + x * y % 3) % 2 === 0;
            break;
          default:
            inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
            break;
        }
        if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
      }
    }
  };
  const penalty = () => {
    let score = 0;
    const line = (get) => {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (get(i) === get(i - 1)) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
      const pat = [true, false, true, true, true, false, true];
      for (let i = 0; i + 7 <= size; i++) {
        let m = true;
        for (let k = 0; k < 7 && m; k++) if (get(i + k) !== pat[k]) m = false;
        if (!m) continue;
        const lightBefore = i >= 4 && [1, 2, 3, 4].every((k) => !get(i - k));
        const lightAfter = i + 11 <= size && [7, 8, 9, 10].every((k) => !get(i + k));
        if (lightBefore || lightAfter) score += 40;
      }
    };
    for (let y = 0; y < size; y++) line((i) => modules[y][i]);
    for (let x = 0; x < size; x++) line((i) => modules[i][x]);
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
    let dark = 0;
    for (const row of modules) for (const c of row) if (c) dark++;
    const total = size * size;
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  };
  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    if (forceMask !== void 0 && m !== forceMask) continue;
    applyMask(m);
    drawFormat(m);
    const p = penalty();
    if (p < bestScore) {
      bestScore = p;
      best = m;
    }
    applyMask(m);
  }
  applyMask(best);
  drawFormat(best);
  return { size, version: ver, mask: best, modules };
}
function qrPath(qr) {
  const parts = [];
  for (let y = 0; y < qr.size; y++) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.modules[y][x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < qr.size && qr.modules[y][x + run]) run++;
      parts.push("M" + (x + 4) + " " + (y + 4) + "h" + run + "v1h-" + run + "z");
      x += run;
    }
  }
  const total = qr.size + 8;
  return { path: parts.join(""), viewBox: "0 0 " + total + " " + total };
}

// ../work/youtube-pip/src/panel.tsx
var CSS = `
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
var fmt = (sec) => {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const r = s % 60;
  const two = (n) => n < 10 ? "0" + n : String(n);
  return h > 0 ? h + ":" + two(m) + ":" + two(r) : m + ":" + two(r);
};
var LOADED_AT = Date.now();
var ui = { more: false, tab: "window" };
var errText = (e) => e instanceof Error ? e.message : String(e);
var PLAYER_ERRORS = {
  2: "Invalid video link.",
  5: "Player error.",
  100: "Video not found or private.",
  101: "This video can't be embedded.",
  150: "This video can't be embedded.",
  153: "YouTube refused to embed this video."
};
var Seg = ({ items, value, onChange, cols }) => /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-seg" }, items.map((it) => /* @__PURE__ */ window.SP_REACT.createElement("div", { key: String(it.id), className: "ytp-cell", style: { width: 100 / cols + "%" } }, /* @__PURE__ */ window.SP_REACT.createElement(DialogButton, { className: it.id === value ? "on" : "", onClick: () => onChange(it.id) }, it.label))));
var Qr = ({ url }) => {
  const q = useMemo(() => {
    try {
      return qrPath(encodeQr(url, "M"));
    } catch {
      return null;
    }
  }, [url]);
  if (!q) return /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, "The phone link is too long for a QR code.");
  return /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-qr" }, /* @__PURE__ */ window.SP_REACT.createElement("svg", { viewBox: q.viewBox, shapeRendering: "crispEdges" }, /* @__PURE__ */ window.SP_REACT.createElement("path", { d: q.path, fill: "#000" })), /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-url" }, url));
};
var ErrorCard = ({ message }) => /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "YouTube PiP" }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-now" }, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-title" }, "YouTube PiP couldn't start"), /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, message), /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, 'Log: ~/homebrew/logs/"YouTube PiP"/'))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, { layout: "below", onClick: () => void refresh() }, "Retry")));
var Panel = () => {
  const s = useStore(settings);
  const rt = useStore(runtime);
  const [, setTick] = useState(0);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [armed, setArmed] = useState(false);
  const [seekVal, setSeekVal] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [code, setCode] = useState("");
  const [forgetArmed, setForgetArmed] = useState(false);
  const [castBusy, setCastBusy] = useState(false);
  const seekTimer = useRef(null);
  const [volVal, setVolVal] = useState(null);
  const volTimer = useRef(null);
  const [lines, setLines] = useState([]);
  const armTimer = useRef(null);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1e3);
    return () => {
      clearInterval(id);
      if (armTimer.current) clearTimeout(armTimer.current);
      if (seekTimer.current) clearTimeout(seekTimer.current);
      if (volTimer.current) clearTimeout(volTimer.current);
    };
  }, []);
  const st = rt.state;
  const style = /* @__PURE__ */ window.SP_REACT.createElement("style", null, CSS);
  if (!st) {
    return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, style, rt.error && Date.now() - LOADED_AT > 6e3 ? /* @__PURE__ */ window.SP_REACT.createElement(ErrorCard, { message: rt.error }) : /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "YouTube PiP" }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, "Loading..."))));
  }
  if (!st.ok) return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, style, /* @__PURE__ */ window.SP_REACT.createElement(ErrorCard, { message: st.error || "The local server did not start." }));
  const act = async (action, value = null, url = null) => {
    try {
      const r = await control(action, value, url);
      setMsg(r.ok ? "" : r.message);
      if (r.ok && (action === "play" || action === "queue")) {
        const patch = {};
        if (s.mode === 0 /* Off */) patch.mode = 1 /* Picture */;
        settings.set(patch);
        setLink("");
      }
      void refresh();
    } catch (e) {
      setMsg(errText(e));
    }
  };
  const switchCast = async (on) => {
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
      setTimeout(() => setForgetArmed(false), 4e3);
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
  const onVolume = (v) => {
    setVolVal(v);
    if (volTimer.current) clearTimeout(volTimer.current);
    volTimer.current = setTimeout(() => {
      void act("setvol", v);
      setTimeout(() => setVolVal(null), 2500);
    }, 250);
  };
  const onSeek = (v) => {
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
      armTimer.current = setTimeout(() => setArmed(false), 4e3);
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
    const out = [];
    const add = (ok, text) => out.push({ ok, text });
    let fresh = null;
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
      add(live, live ? "Player page reporting (" + r.age + "s ago" + (r.state !== void 0 ? ", state " + r.state : "") + ")" : "Player page not reporting yet (turn the window On)");
    }
    add(pip.exists ? !pip.error : pip.error ? false : null, pip.error ? pip.error : pip.exists ? "Video view created" : "Video view not created yet (turn the window On)");
    const pr = pip.probe();
    add(null, "View methods: " + (pr.view.join(", ") || "none") + " | browser: " + (pr.browser.join(", ") || "none"));
    add(compositionAvailable(), compositionAvailable() ? "Steam composition hook found" : compositionError || "Composition hook missing");
    for (const l of describeParts()) add(null, l);
    add(null, "Menu open right now: " + (readDeckParts(getScreenSize().w).menuOpen ? "yes" : "no") + " (should say yes while this panel is open)");
    const c = fresh?.cast;
    if (c) {
      add(c.on ? c.advertising : null, c.on ? c.advertising ? "Casting is on: the phone should list " + c.name : "Casting is on but not advertising: " + (c.error || "unknown") : "Casting is turned off");
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
  const setMore = (v) => {
    ui.more = v;
    setTick((n) => n + 1);
  };
  const setTab = (t) => {
    ui.tab = t;
    setTick((n) => n + 1);
  };
  return /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, style, /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "Now playing" }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 2,
      value: s.mode,
      onChange: (m) => settings.set({ mode: m }),
      items: [
        { id: 0 /* Off */, label: "Window off" },
        { id: 1 /* Picture */, label: "Window on" }
      ]
    }
  )), s.mode !== 0 /* Off */ && pip.error ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, "Video window problem: " + pip.error)) : null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-now" }, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-title" }, nowTitle), status ? /* @__PURE__ */ window.SP_REACT.createElement("div", { className: warn ? "ytp-warn" : "ytp-sub" }, status + (showTime ? "  " + fmt(rep.t) + " / " + fmt(rep.d) : "") + (st.subtitles && rep.state === 1 ? rep.cc ? "  Subtitles: " + rep.cc : "  (no subtitles found yet)" : "")) : /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, "Cast from the YouTube app on your phone, or use the phone link under More."))), showTime ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, { label: "Position", value: Math.min(seekVal ?? Math.floor(rep.t ?? 0), Math.floor(rep.d ?? 0)), min: 0, max: Math.max(1, Math.floor(rep.d ?? 0)), step: 5, showValue: false, onChange: onSeek })) : null, playing ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 4,
      value: "",
      onChange: (id) => {
        if (id === "back") void act("seek", -10);
        else if (id === "pp") void act("playpause");
        else if (id === "fwd") void act("seek", 10);
        else if (id === "next") void act("next");
      },
      items: [
        { id: "back", label: "-10s" },
        { id: "pp", label: rep.state === 1 ? "Pause" : "Play" },
        { id: "fwd", label: "+10s" },
        { id: "next", label: "Next" }
      ]
    }
  )) : null, playing ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 3,
      value: st.subtitles ? "subs" : "",
      onChange: (id) => {
        if (id === "mute") void act("mute");
        else if (id === "subs") void act("subs", null, st.subtitles ? "off" : "on");
        else if (id === "stop") void act("stop");
      },
      items: [
        { id: "mute", label: rep.muted ? "Unmute" : "Mute" },
        { id: "subs", label: st.subtitles ? "Subtitles on" : "Subtitles off" },
        { id: "stop", label: "Stop" }
      ]
    }
  )) : null, playing ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    SliderField,
    {
      label: "Video volume",
      description: "Only the video in the window. Game and system sound stay as they are.",
      value: volVal ?? (online && typeof rep.vol === "number" ? rep.vol : st.volume),
      min: 0,
      max: 100,
      step: 5,
      showValue: true,
      onChange: onVolume
    }
  )) : null, warn ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, { layout: "below", onClick: () => void act("retry") }, "Retry this video")) : null, msg ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, msg)) : null), /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "Cast from the YouTube app" }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 2,
      value: castBusy ? "" : st.cast.on ? "on" : "off",
      onChange: (id) => void switchCast(id === "on"),
      items: [
        { id: "on", label: castBusy ? "..." : "Casting on" },
        { id: "off", label: castBusy ? "..." : "Casting off" }
      ]
    }
  )), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, !st.cast.on ? "Off: the Deck does not show up on phones and no phone can control it." : st.cast.phones.length > 0 ? "Connected: " + st.cast.phones.join(", ") : "In the YouTube app (same Wi-Fi), tap the cast icon and pick " + st.cast.name + ".")), st.cast.on ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 2,
      value: "",
      onChange: (id) => id === "code" ? void getCode() : void onForget(),
      items: [
        { id: "code", label: "TV code" },
        { id: "forget", label: forgetArmed ? "Press again" : "Disconnect phones" }
      ]
    }
  )) : null, forgetArmed ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, "Press again to disconnect and unpair every phone.")) : null, code ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-now" }, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-title" }, code), /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, "In the YouTube app: Settings, then Watch on TV, then Enter TV code."))) : null, st.cast.error ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, st.cast.error)) : null), st.queue.length > 0 ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "Up next (" + st.queue.length + ")" }, queueShown.map((q, i) => /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, { key: i + ":" + (q.video || q.list) }, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-qitem" }, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, i + 1 + ". " + (q.title || q.video || "Playlist")), /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 4,
      value: "",
      onChange: (id) => void act(id, i),
      items: [
        { id: "playnow", label: "Play" },
        { id: "up", label: "Up" },
        { id: "down", label: "Down" },
        { id: "remove", label: "Remove" }
      ]
    }
  )))), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: st.queue.length > 3 ? 2 : 1,
      value: "",
      onChange: (id) => id === "all" ? setShowAll(!showAll) : void act("clear"),
      items: (st.queue.length > 3 ? [{ id: "all", label: showAll ? "Show fewer" : "Show all " + st.queue.length }] : []).concat([
        { id: "clear", label: "Clear queue" }
      ])
    }
  ))) : null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSection, { title: "More" }, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, { layout: "below", onClick: () => setMore(!ui.more) }, ui.more ? "Hide settings" : "Window, phone link, options, help")), ui.more ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 4,
      value: ui.tab,
      onChange: (t) => setTab(t),
      items: [
        { id: "window", label: "Window" },
        { id: "phone", label: "Phone" },
        { id: "options", label: "Options" },
        { id: "help", label: "Help" }
      ]
    }
  )) : null, ui.more && ui.tab === "window" ? /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 2,
      value: s.corner,
      onChange: (i) => settings.set({ corner: i, mode: s.mode === 0 /* Off */ ? 1 /* Picture */ : s.mode }),
      items: ["Top left", "Top right", "Bottom left", "Bottom right"].map((label, id) => ({ id, label }))
    }
  )), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, { label: "Window size", value: Math.round(s.size * 100), min: 20, max: 50, step: 5, showValue: true, onChange: (v) => settings.set({ size: v / 100 }) })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(SliderField, { label: "Margin", value: s.margin, min: 0, max: 80, step: 4, showValue: true, onChange: (v) => settings.set({ margin: v }) })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    ToggleField,
    {
      label: "Hide while menus are open",
      description: "The window disappears while the Steam menu or Quick Access menu (this panel too) is open. The sound keeps playing.",
      checked: s.hideForMenus,
      onChange: (v) => settings.set({ hideForMenus: v })
    }
  ))) : null, ui.more && ui.tab === "phone" ? /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, st.remote_url ? /* @__PURE__ */ window.SP_REACT.createElement(Qr, { url: st.remote_url }) : /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-warn" }, st.bind_all === false ? "The phone link is unavailable: the plugin could only open a port for this device." : "Connect the Deck to Wi-Fi to get a phone link.")), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, "Scan with any phone (same Wi-Fi) to paste links and control playback in its browser.")), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(TextField, { label: "Or type a YouTube link here", value: link, onChange: (e) => setLink(e.target.value) })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 3,
      value: "",
      onChange: (id) => {
        if (id === "reset") void onReset();
        else if (link.trim() === "") setMsg("Type or paste a YouTube link first.");
        else void act(id, null, link.trim());
      },
      items: [
        { id: "play", label: "Play now" },
        { id: "queue", label: "Add to queue" },
        { id: "reset", label: armed ? "Press again" : "New link" }
      ]
    }
  ))) : null, ui.more && ui.tab === "options" ? /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    Seg,
    {
      cols: 3,
      value: st.repeat,
      onChange: (id) => void act("repeat", null, id),
      items: [
        { id: "off", label: "Repeat off" },
        { id: "all", label: "Repeat all" },
        { id: "one", label: "Repeat one" }
      ]
    }
  )), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, { label: "Keep playing when hidden", description: "Turn the window off and still hear the video.", checked: s.keepPlaying, onChange: (v) => settings.set({ keepPlaying: v }) })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ToggleField, { label: "Open the window for new videos", description: "When a phone sends a video.", checked: s.autoOpen, onChange: (v) => settings.set({ autoOpen: v }) })), /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(
    ToggleField,
    {
      label: "Start videos muted",
      description: "Helps if autoplay is blocked.",
      checked: st.start_muted,
      onChange: (v) => {
        void setStartMuted(v).then(() => refresh()).catch((e) => setMsg(errText(e)));
      }
    }
  ))) : null, ui.more && ui.tab === "help" ? /* @__PURE__ */ window.SP_REACT.createElement(window.SP_REACT.Fragment, null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement(ButtonItem, { layout: "below", onClick: () => void runDiag() }, "Check setup")), lines.length > 0 ? /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-lines" }, lines.map((l, i) => /* @__PURE__ */ window.SP_REACT.createElement("div", { key: i, className: l.ok === null ? "ytp-info" : l.ok ? "ytp-ok" : "ytp-fail" }, (l.ok === null ? "INFO: " : l.ok ? "OK: " : "FAIL: ") + l.text)))) : null, /* @__PURE__ */ window.SP_REACT.createElement(PanelSectionRow, null, /* @__PURE__ */ window.SP_REACT.createElement("div", { className: "ytp-sub" }, "Version " + st.version + '. Log: ~/homebrew/logs/"YouTube PiP"/'))) : null));
};

// ../work/youtube-pip/src/index.tsx
var GLOBAL_NAME = "YouTubePiP";
var index_default = definePlugin(() => {
  startPolling();
  routerHook.addGlobalComponent(GLOBAL_NAME, () => /* @__PURE__ */ window.SP_REACT.createElement(PipHost, null));
  return {
    name: "YouTube PiP",
    titleView: /* @__PURE__ */ window.SP_REACT.createElement("div", { className: staticClasses.Title }, "YouTube PiP"),
    content: /* @__PURE__ */ window.SP_REACT.createElement(Panel, null),
    icon: /* @__PURE__ */ window.SP_REACT.createElement(FaYoutube, null),
    onDismount() {
      routerHook.removeGlobalComponent(GLOBAL_NAME);
      stopPolling();
      pip.destroy();
    }
  };
});
export {
  index_default as default
};
