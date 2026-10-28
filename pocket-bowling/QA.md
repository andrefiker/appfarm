# Pocket Bowling 1.0.0 — release verification

Release commit: `a91227e3e91ebc192e03748b45e68a117bf974b1`.
Successful verification and publication: https://github.com/andrefiker/appfarm/actions/runs/40775782848

| Layer | Evidence and result |
| --- | --- |
| Rules | 16 Node test groups pass. All legal tenth-frame triples, invalid rack totals, pending bonuses, strikes/spares, 300/150/0 examples, five-frame bonuses and completion transitions. |
| Physics | Fixed 120 Hz; repeatable outcomes; power/spin, triangular rack, ball/pin and pin/pin impacts, tipping, gutters, weak/max/hook/corner shots and complete simulated games pass. Additional 500-delivery parameter sweep completed without non-finite physics values. |
| Mobile input | Shared projection/inverse round-trip tests pass. UI flick resolves a physical throw; controls remain locked during motion. Precision controls vary line, power and spin. |
| Browser playthrough | Two complete ten-frame UI games: twelve strikes = 300; mixed deliveries/gutters = 80. A 7-pin first roll followed by a physical 3-pin split conversion records a spare. |
| Modes and settings | Practice rack selection, Challenge, Time Attack expiry/menu pause, independent audio setting, theme and handedness persistence pass. |
| Recovery | Browser reload during motion restores the pre-throw rack with no duplicate score or stats. Emulator force-stop restores an identical scorecard with the recorded 9-pin roll and pending totals. |
| Phone layout | Screenshots inspected; primary action visible with no page scroll at 320×568, 360×640, 390×844 and 412×915. Compact heading/pin spacing repaired before release. Android status and navigation bars do not cover controls. |
| Android | API 35 x86_64 Pixel 2 emulator installs the actual signed release candidate, launches with Wi-Fi/mobile data disabled, performs a real ADB swipe, backgrounds/resumes, and restores after force-stop. |
| Packaging | ZIP integrity, classes.dex, resources, launcher, package/version, portrait manifest, zipalign, v2/v3 signature and bundled-file byte equality against `dist/` pass. |
| Privacy/isolation | Only VIBRATE permission; no Internet permission. No accounts, ads, analytics, remote assets or backend. PWA cache activation test preserves unrelated AppFarm caches. |
| Publication | Tag points to the verified commit. Published APK downloaded successfully and is byte-identical to the candidate. Main unchanged. |

APK: `Pocket-Bowling-v1.0.0.apk`, 29,756 bytes.
SHA-256: `6ff9af349cae2f38c18315b5611bfb72a321614e48e741ed564fbe409973d6c8`.
Signing: RSA 2048 Android Debug, v2/v3 verified; private key retained for future compatible updates.

JSON results are retained under `qa/`. The Actions run also contains browser and Android screenshots, XML snapshots, signature and alignment evidence. Screenshots/JSON were inspected; automated scripts alone are not the evidence.

No physical phone was used. Physical-device performance, sound/haptic feel and Android versions other than API 35 have not been device-tested. Physics is a documented planar/tipping approximation rather than full 3D. No optional computer opponents in 1.0.0. Production PWA files are built but were not deployed or separately installation-tested as a PWA.
