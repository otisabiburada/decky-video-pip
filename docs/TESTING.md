# Testing status (0.6.0)

## Tested before release
- **Backend**: 31 automated checks (link parsing, queue, repeat, volume, subtitles, security of the local server,
  cast commands, discovery, pairing, casting on/off, unpairing, reconnect after sleep / dead link / Wi-Fi loss).
- **Live against YouTube's real cast servers** with a stand-in phone (19 checks): TV-code linking, a cast video plays
  at the right time with the phone's queue, pause and seek from the phone, the phone hears what plays, casting off
  blocks the phone, casting on restores the pairing, Disconnect phones cuts it. Idle connection kept 150 s.
- **Live with the real YouTube player** in Chromium at PiP size (21 checks): 8 popular videos incl. official music
  videos play, every tap lands on the shield,
  real clicks on title/logo/corners open nothing, cover hides YouTube's overlays, video volume, subtitles on/off
  (checked by screenshots), error screen covered.
- **Quick Access panel** rendered from the real `dist/index.js` with stand-in Steam components and the real backend
  (23 checks): every state renders without errors, button spacing measured, hide-while-menus logic with a fake menu.
- Plugin loads with Python modules that Decky's bundled Python may lack blocked.

## Confirmed on a Steam Deck
- The video window shows over Steam's UI, and a video cast from the YouTube app loads in it.

## Not yet confirmed on a Steam Deck
- Tapping **Steam Deck** in the app's cast list (the pairing-code route). The TV-code route is fully tested.
- "Hide while menus are open" with the real Quick Access menu (Check setup shows "Menu open right now").
- Reconnect after a real sleep/wake.
- Button spacing with Steam's real buttons.
