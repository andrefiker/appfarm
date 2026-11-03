# Emerald 1.4.0: board-only view and clearer pieces

The phone stays vertical and shows one square board, material points and captured pieces for each side, and one Options button. Players, connection, draw/resign/rematch, history, sound, exports and settings are grouped in Options. Captures are grouped by piece type with counts to keep the strips compact. Selecting history closes the panel to show the read-only position; Return to game remains inside Options. Local studio uses the same layout. Mandatory promotion and move confirmation remain transient board interactions.

Pieces are original vector Staunton drawings with wider silhouettes, ivory/graphite shading and distinct outlines. Black and White use identical geometry, with a shared baseline and uniform square viewBox. No horizontal stretching is used. The Emerald Enamel board artwork is unchanged.

Android stays locked in portrait, as requested, and hides system bars only while a board is mounted. A swipe reveals system bars. Back closes the active dialog or opens Options. The native display bridge accepts only two commands from the trusted top-level bundled app origin. Home restores normal bars; keyboard and cutout insets remain protected.

VersionCode 19, versionName 1.4.0, existing com.andrefiker.quietknight.emerald identity. The CI workflow builds an unsigned artifact without signing secrets; signing remains local with the retained Emerald certificate. No backend changes or production deployment. Rollback source: 39390a065ebf6ec45ceba7d722004a711380cdb3 (1.3.0).

New browser acceptance covers six viewport shapes, square geometry, unobstructed Options, identical army silhouettes, both orientations, captures/history, read-only review, live move updates, castling/promotion, capture replay, native display commands, rotation, confirmation, reduced motion, draw and end-game controls. Actual phone installation, portrait locking, Android Back and immersive bars still require physical device checks.
