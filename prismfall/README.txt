PRISMFALL — falling-block puzzle for Windows PC
================================================

HOW TO PLAY
  Option A: double-click "Play Prismfall.bat". The game opens in your default browser
            (Edge, Chrome or Firefox). It works fully offline.
  Option B: double-click "Prismfall.exe". This single portable file has the whole game
            built in. It opens your browser at http://127.0.0.1:47613 and closes itself
            about 3 minutes after you close the game tab.
            Windows SmartScreen may warn that the publisher is unknown, because the file
            isn't code-signed. Choose "More info" > "Run anyway".
  Option C: open index.html directly.

ANDROID
  dist/Prismfall-v1.0.0.apk   copy it to your phone and open it (allow "install unknown apps"
                              for your file manager or browser when Android asks).
  Touch: drag sideways = move, tap = rotate (right half / left half), flick down = drop,
         slow drag down = soft drop, flick up = hold, BURST / HOLD / pause buttons.
  Settings > "Left-handed touch layout" (on by default) puts the buttons on the left.
  Each APK build is signed with a fresh test key: uninstall the old one before updating.

  NOTE: the .bat/index.html and the .exe keep SEPARATE save files, because browsers
  store progress per address. Pick one way to play and stick with it.

CONTROLS
  Move ............ Left / Right      (left-handed: A / D)
  Soft drop ....... Down              (S)
  Hard drop ....... Space             (W)
  Rotate right .... Up or X           (K)
  Rotate left ..... Z                 (J)
  Rotate 180 ...... Q                 (L)
  Hold ............ C or Shift        (I)
  Prism Burst ..... V                 (O)
  Pause ........... Esc or P
  Mouse ........... hover a column to aim, left click = drop, right click / wheel = rotate,
                    middle click = hold, side button = Prism Burst
  Gamepad ......... D-pad / stick move, Up = drop, A/B rotate, X/LB hold, Y/RB burst, Start pause
  Both key sets are always active. Settings has DAS, ARR, soft-drop speed, volume, ghost,
  screen shake and a mouse on/off toggle.

FOLDER
  index.html, assets/        the game (no internet or install needed)
  Play Prismfall.bat         launcher
  Prismfall.exe              portable launcher (Windows x64)
  docs/                      design brief, playtest report, asset manifest, screenshots
  tools/                     art export, playtest harness and PDF scripts (dev only, need Node + Playwright)
  launcher-src/              Go source and build script for Prismfall.exe

Progress (shards, perks, themes, bests, achievements) is saved in the browser's local storage.
