# Changelog

## 0.6.0 (first public release, beta)

- **Subtitles on/off** in the panel, on the phone page and from the YouTube app while casting. Remembered for the next
  videos.
- **Video volume** slider: only the video in the window, not game or system sound. Remembered.
- **Hide while menus are open** option.
- **Casting on/off** switch and **Disconnect phones** (unpairs every phone, including TV-code links).
- Reconnects to YouTube's cast service right after the Deck wakes from sleep; a silent connection is reopened.
- Tidier Quick Access panel (Now playing, Cast, Up next; the rest under More) with proper spacing between buttons.
- Nothing in the video window can open a browser; YouTube's overlays are hidden.
- Fixed: **most videos refused to play** ("the owner does not allow embedding"). YouTube rejects embeds on a page
  served from a bare IP address (127.0.0.1); the player page is now served at `localhost`. In tests, popular videos
  went from 3 of 10 playing to 10 of 10.
- Fixed: bottom corners sat too high (the on-screen keyboard was taken as always open).

## Before 0.6.0 (private test builds)

- 0.4: casting rewritten: the plugin joins YouTube's cast service directly and plays in its own player (loading
  YouTube's TV web app in Steam's browser was refused by YouTube). TV code added.
- 0.3: cast discovery (SSDP/DIAL); window always a small box in one of four corners.
- 0.2: queue controls, repeat, seek bar on the phone page; fixed the window collapsing to a thumbnail on the Deck.
- 0.1: first version: floating player window, phone link with QR code.
