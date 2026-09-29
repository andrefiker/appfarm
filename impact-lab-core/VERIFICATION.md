# Verification — Impact Lab Core 4 / 1.3.0

18 geometry, state and interaction tests pass; TypeScript/Vite build passes. Production screenshots actually inspected: muscle and organ openings, matching cutaway, repeated skin/bone/organ damage, rotated skin. Browser report also checks reset byte identity, undo, thirty-event cap, drag separation, small-phone/landscape and no remote assets or shader errors. See qa/v1.3/browser-report.json.

Measured Chrome 138 / SwiftShader software / Linux / 390×844 DPR1: apply median 48.8 ms, maximum 81.4 ms for thirty shots; idle frames 84→84; reset geometries 180→172. Not physical-phone performance. Additional internal lining has a modest CPU cost compared with 1.2.

The strengthened fictional penetration budget and visible disruption are art-direction choices, not rifle calibration. Only actual crossed anatomy is affected; a path between front ribs does not automatically break those ribs. Internal cavities use shader masks and closed lining, not live mesh surgery. Remaining visual limits: uniform tubular internal sections, simplified fractures, visible head/neck joins and rough cranial cutaways. These are not fully realistic tissue mechanics.

Andre's latest supplied screenshot confirms 1.2 renders on his physical phone. This 1.3 release has not been physically tested. No emulator used. Native update/install, offline relaunch and resume remain physically untested.

Android target: same com.andrefiker.impactlabcore.next as 1.2; 1.3.0/code 4. Same private release certificate enables in-place update. No permissions or new infrastructure. APK BUILT / PACKAGE VERIFIED: source 6596dfc7a2eb578ead61f7de961eec7421ba7d9a, run 36578550305, SHA256 e47f7756e28e83aa86ab96d1f1c46578d6005d51688d5ba04cd1566e4ff02c84. v2/v3 signature verified; certificate and package match 1.2, version code increased 3→4. All fourteen bundled files match the tested production build exactly. Correct launcher and zero requested permissions.

Rollback: 98a9dba25765d998bd2c6a8a9f613d13daa023d6 (1.2 final verification); prior APK source 40c6d052c85abd473b3f14b329ef803dfce8da67.
