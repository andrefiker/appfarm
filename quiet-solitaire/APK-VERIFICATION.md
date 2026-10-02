# Quiet Solitaire APK verification

## v1.3.0 verified release (2026-10-02)

- Package: `com.andrefiker.quietsolitaire`
- Version: `1.3.0`, versionCode `14`
- Artifact: `Quiet-Solitaire-v1.3.0.apk`
- Rollback source: `57526788ff6abf1a8cd771111a288aaa5d0a7a7f`
- GitHub Actions run `37031039995` passed the Node suite, offline PWA build,
  Android compile, APK integrity, bundled byte comparison, package metadata,
  signature, alignment and permission checks.
- APK SHA-256: `8719669e26258980a6b3407ca53ec40cc5bd4f0f189fa074f5906f72b5f27aa6`.
- Signature: one 3072-bit RSA temporary test signer; v2 and v3 verified.
- APK ZIP integrity and four-byte alignment: pass.
- Packaged offline assets: nine current PWA files compared byte-for-byte.
- Permissions: VIBRATE only; INTERNET absent.
- Android uses the default decor fitting system windows, with a portrait
  WebView and CSS safe-area insets; no edge-to-edge opt-in.
- Temporary generated test signing remains. A previous APK signed with a
  different temporary key cannot be updated in place.
- Android installation, visual/touch QA and lifecycle on an emulator or phone
  were unavailable in this run, so they remain unverified.

## Historical v1.2.0 verification

## Package

- Application: **Quiet Solitaire**
- Version: `1.2.0` (`versionCode=12`)
- Package ID: `com.andrefiker.quietsolitaire`
- APK: `Quiet-Solitaire.apk`
- Minimum Android: API 26
- Target Android: API 34
- Compile SDK: API 35
- Orientation: portrait

## Verified checks

- APK SHA-256: `e69994981f001f9c5f7392459ca2d28e299be80091642abc0537bd29fd8217ee`
- Packaged PWA `index.html` SHA-256: `b0419ed88693786dbd26714a94d844ea07a7eaefa5e9ce6f303d0cda7e992e35`
- APK ZIP integrity: pass.
- APK signature: v2 and v3 pass; one 3072-bit RSA temporary test signer.
- Four-byte ZIP alignment: pass.
- Package ID, label, version, entry activity, and portrait feature: verified from compiled APK badging.
- Packaged PWA assets: all nine current `dist/` files compared byte-for-byte; pass.
- Required entry point, manifest, app code, game engine, stylesheet, offline worker, and launcher icon: present.
- Internet permission: absent. The only requested permission is `android.permission.VIBRATE`.
- Unrelated assets: none detected.
- Game tests after packaging: 28/28 passed in GitHub Actions and locally.

## Minimalist design

The 1.2.0 visual pass removes the felt texture, ornate card-back lines, heavy dock, and stronger bevels/shadows while retaining the green table, readable cards, existing pile positions, and all game controls.

## Runtime status

No Android device or emulator was available, so installation, launch, physical touch, audio, and haptics remain unverified. No post-change screenshot is claimed: localhost-capable browser automation and a Chromium binary were unavailable. Source-level interaction, layout, offline-asset, and package checks passed.

The signing key is generated temporarily for each test build and deleted. This test APK is installable, but its signing identity differs from earlier temporary builds; Android may require uninstalling an earlier build before installation, which clears that installation's local data.

The separate known limitation remains: game numbers are reproducible, but deals are not certified winnable and no solver is included.
