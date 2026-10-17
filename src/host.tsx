import { useEffect, useState } from "react";
import { Composition, UIComposition } from "./composition";
import { DeckParts, computeBounds, getScreenSize, readDeckParts } from "./layout";
import { Mode, runtime, settings, useStore } from "./store";
import { pip } from "./view";

const NO_PARTS: DeckParts = { navWidth: 0, qamWidth: 0, keyboard: false, menuOpen: false };

/** Re-reads Steam's menus a few times a second, only while the window is showing. */
function useDeckParts(active: boolean, screenW: number): DeckParts {
  const [parts, setParts] = useState<DeckParts>(NO_PARTS);
  useEffect(() => {
    if (!active) {
      setParts(NO_PARTS);
      return;
    }
    const tick = () => {
      const next = readDeckParts(screenW);
      setParts((cur) =>
        cur.navWidth === next.navWidth && cur.qamWidth === next.qamWidth && cur.keyboard === next.keyboard &&
        cur.menuOpen === next.menuOpen
          ? cur
          : next,
      );
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active, screenW]);
  return parts;
}

/** Mounted once as a global component: owns the floating video view. */
export const PipHost = () => {
  const s = useStore(settings);
  const rt = useStore(runtime);
  const screen = getScreenSize();
  const parts = useDeckParts(s.mode !== Mode.Off, screen.w);
  const [shown, setShown] = useState(false);

  const url = rt.state?.player_url ?? null; // while casting, the backend points this same window at YouTube TV
  const b = computeBounds(s.corner, s.size, s.margin, screen, parts);
  const key = [b.x, b.y, b.width, b.height].join(",");
  const tucked = s.hideForMenus && parts.menuOpen; // hidden while a Steam menu is open; the sound keeps playing

  useEffect(() => {
    if (s.mode !== Mode.Off && tucked && url && pip.exists) {
      pip.setVisible(false);
      setShown(false); // also gives the screen back to Steam's menu (no composition request)
      return;
    }
    if (s.mode === Mode.Off) {
      if (s.keepPlaying) {
        if (url) pip.load(url); // a source switch applies even while hidden
        pip.setVisible(false); // audio keeps going
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.mode, s.keepPlaying, url, key, tucked]);

  return shown ? <Composition level={UIComposition.Notification} /> : null;
};
