// Builds docs/src/playtest-report.html from docs/playtest-results.json + docs/src/bugs.json,
// then renders it to docs/Prismfall-Playtest-Report.pdf.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'playtest-results.json'), 'utf8'));
const B = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'src', 'bugs.json'), 'utf8'));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmtT = (t) => { if (t == null) return '—'; const m = Math.floor(t / 60); const s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const passed = R.checks.filter((c) => c.pass).length;
const fpsAll = R.fps.map((f) => f.avgFps);
const fpsMin = Math.min(...fpsAll), fpsAvg = fpsAll.reduce((a, b) => a + b, 0) / fpsAll.length;
const worst = Math.max(...R.fps.map((f) => f.worstFrameMs));
const run1 = R.runs[0];
const rows = R.runs.map((r, i) => {
  const res = r.result || {};
  const fs_ = r.finalState || {};
  return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.label.replace(/^Run \d+ — /, '')) + '</td><td>' + esc(res.label || r.endedOn) + '</td><td>' + (res.score != null ? res.score.toLocaleString('en-US') : '—') + '</td><td>' + (res.lines != null ? res.lines : fs_.lines != null ? fs_.lines : '—') + '</td><td>' + (res.level || fs_.level || '—') + '</td><td>' + fmtT(res.time != null ? res.time : fs_.time) + '</td><td>' + (fs_.pieces != null ? fs_.pieces : '—') + '</td><td>' + (r.bursts != null ? r.bursts : '—') + '</td><td>' + (res.gems != null ? res.gems : fs_.gems != null ? fs_.gems : '—') + '</td></tr>';
}).join('');
const checks = R.checks.map((c) => '<tr class="' + (c.pass ? 'ok' : 'bad') + '"><td>' + (c.pass ? 'PASS' : 'FAIL') + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.detail) + '</td></tr>').join('');
const bugs = B.bugs.map((b) => '<tr><td>' + esc(b.id) + '</td><td>' + esc(b.sev) + '</td><td>' + esc(b.found) + '</td><td>' + esc(b.what) + '</td><td>' + esc(b.fix) + '</td><td class="' + (b.status === 'Fixed, re-tested' ? 'okc' : '') + '">' + esc(b.status) + '</td></tr>').join('');
const known = B.known.map((k) => '<li><b>' + esc(k.tag) + ':</b> ' + esc(k.text) + '</li>').join('');
const shots = R.screenshots.map((s) => '<figure><img src="../../' + s.file + '"><figcaption>' + esc(s.caption) + '</figcaption></figure>').join('');
const tl = run1.timeline || {};
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Prismfall: Playtest Report</title><style>
@page { size: A4; margin: 11mm 11mm; }
body { font-family: "Segoe UI","DejaVu Sans",Arial,sans-serif; color:#2b3350; font-size:8.6pt; line-height:1.36; margin:0; }
h1 { font-size:20pt; margin:0; color:#6a8cf3; letter-spacing:.03em; }
h2 { font-size:11pt; color:#5b7cf0; margin:14px 0 5px; text-transform:uppercase; letter-spacing:.07em; }
.sub { color:#6b7390; margin:2px 0 8px; }
table { width:100%; border-collapse:collapse; margin:4px 0; }
th, td { border-bottom:1px solid #e8e6ef; padding:3px 5px; text-align:left; vertical-align:top; }
th { background:#f6f6fb; font-size:7.6pt; text-transform:uppercase; letter-spacing:.05em; color:#6b7390; }
tr.ok td:first-child, .okc { color:#2e9e6a; font-weight:700; } tr.bad td:first-child { color:#d9534f; font-weight:700; }
.kpis { display:grid; grid-template-columns: repeat(5,1fr); gap:6px; margin:6px 0; }
.kpi { border:1px solid #e4e2ec; border-radius:8px; padding:6px 8px; } .kpi small { color:#6b7390; display:block; font-size:7.2pt; text-transform:uppercase; letter-spacing:.06em; } .kpi b { font-size:13pt; }
.box { border:1px solid #e4e2ec; border-radius:8px; padding:6px 10px; margin:6px 0; background:#fff; }
.assume { background:#fffaf0; border-color:#f3dfb5; }
.shots { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
figure { margin:0; break-inside:avoid; } figure img { width:100%; border:1px solid #e4e2ec; border-radius:6px; } figcaption { font-size:7.6pt; color:#6b7390; margin-top:2px; }
ul { margin:2px 0; padding-left:16px; } li { margin:2px 0; }
.pb { break-before: page; }
</style></head><body>
<h1>Prismfall: Playtest Report</h1>
<p class="sub">Test run ${esc(R.startedAt.slice(0, 16).replace('T', ' '))} UTC · ${esc(R.browser)} · viewport ${esc(R.viewport)} plus 3 extra resolutions · harness <code>tools/playtest.mjs</code></p>
<div class="box assume"><b>How this was tested (read first).</b> The Browser Use tool was <b>not connected</b> in this session, so I playtested with Playwright driving headless Chromium on the Linux build machine. The input was real: keyboard events, mouse moves and clicks, and a <b>mocked</b> standard gamepad. A heuristic AI bot played the runs; it reads the board through a read-only debug hook and plays through those same inputs. Everything below marked PASS was actually executed. Anything not executed is listed as an <b>assumption</b> under Known remaining issues. Nothing was tested on a Windows machine.</div>
<div class="kpis">
<div class="kpi"><small>Automated checks</small><b>${passed} / ${R.checks.length}</b></div>
<div class="kpi"><small>Full runs</small><b>${R.runs.length}</b></div>
<div class="kpi"><small>Input → frame (median)</small><b>${R.lag ? R.lag.median.toFixed(1) + ' ms' : 'n/a'}</b></div>
<div class="kpi"><small>Avg FPS (lowest sample)</small><b>${fpsMin.toFixed(1)}</b></div>
<div class="kpi"><small>Runtime errors</small><b>${R.errors.length}</b></div>
</div>
<h2>Full runs</h2>
<table><tr><th>#</th><th>Run (input method)</th><th>Ended</th><th>Score</th><th>Lines</th><th>Lvl</th><th>Time</th><th>Pieces</th><th>Bursts</th><th>Gems</th></tr>${rows}</table>
<p class="sub">Runs 1–5 played to a real end: a win, a time-up, a top-out or a lock-out. Run 6 (Zen, which never ends by design, so I quit from the pause menu) and Run 7 (gamepad) were capped at 120 and 40 pieces to verify those input paths. The bot plays at machine speed, so its Sprint time is far beyond human play, but its lines, levels and end states are real.</p>
<h2>Focus checks</h2>
<table><tr><th style="width:18%">Area</th><th>Result</th></tr>
<tr><td>Input lag</td><td>${R.lag ? 'Measured from the input event timestamp to the end of the frame that drew the result, over ' + R.lag.n + ' inputs: median <b>' + R.lag.median.toFixed(1) + ' ms</b>, p95 ' + R.lag.p95.toFixed(1) + ' ms, max ' + R.lag.max.toFixed(1) + ' ms.' : 'n/a'} Moves and rotations apply inside the keydown handler, so they show on the very next frame. DAS/ARR are frame-independent. <i>The display and compositor latency of a real monitor isn't included.</i></td></tr>
<tr><td>Collisions</td><td>An invariant runs every frame: the active piece may never overlap the stack or walls. It was never violated across all runs and ${R.checks.find((c) => c.name.startsWith('Fuzz:')) ? esc(R.checks.find((c) => c.name.startsWith('Fuzz:')).name.replace('Fuzz: ', '').replace(', active piece never overlapped the stack or walls', '')) : 'fuzzing'}, including 20% long key holds that exercise DAS. Separate rule tests covered SRS kicks, the T-spin 3-corner rule, perfect clears, Burst row removal, the lock-delay reset cap and hold-once.</td></tr>
<tr><td>Softlocks</td><td>Checked: the stall detector (piece counter must advance), the auto-pause on window blur releasing held keys, Esc/Start pause and resume, the Enter retry loop, Space-mash at game over, Zen top-out rescue, the Second Wind rescue, and the escape path back to the title after fuzzing. No softlock found.</td></tr>
<tr><td>Frame rate</td><td>Average ${fpsAvg.toFixed(1)} fps across ${R.fps.length} samples (lowest sample ${fpsMin.toFixed(1)}). The worst single frame was ${worst.toFixed(0)} ms. These numbers come from headless Chromium using software rendering (SwiftShader) while a bot polled it, so a real GPU should match or beat them. <i>Assumption: not measured on your hardware.</i></td></tr>
<tr><td>First 60 seconds</td><td>Title → Enter → playable in about 1.5 s (READY/SET countdown). In Run 1 (fresh save): first line clear at ${tl.firstClear != null ? tl.firstClear.toFixed(1) + ' s' : 'n/a'}, first gem collected at ${tl.firstGem != null ? tl.firstGem.toFixed(1) + ' s' : 'n/a'}, first Prism Burst at ${tl.firstBurst != null ? tl.firstBurst.toFixed(1) + ' s' : 'n/a'}. Bot timings are faster than a human's. Hints teach one control at a time. <i>Whether it's fun is my subjective judgement from watching the runs and screenshots. No human tested it.</i></td></tr>
</table>
<h2 class="pb">Bugs found and fixed</h2>
<table><tr><th>ID</th><th>Sev.</th><th>Found by</th><th>Problem</th><th>Fix</th><th>Status</th></tr>${bugs}</table>
<h2>Known remaining issues &amp; assumptions</h2><ul>${known}</ul>
<h2>All automated checks (final run)</h2>
<table><tr><th>Result</th><th>Check</th><th>Detail</th></tr>${checks}</table>
${R.errors.length ? '<h2>Errors logged</h2><ul>' + R.errors.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '<p class="sub">No page errors or console errors were logged during the final run.</p>'}
<h2 class="pb">Screenshots (final run)</h2><div class="shots">${shots}</div>
</body></html>`;
fs.writeFileSync(path.join(root, 'docs', 'src', 'playtest-report.html'), html);
execFileSync('node', [path.join(root, 'tools', 'make-pdfs.mjs'), 'playtest-report'], { stdio: 'inherit' });
