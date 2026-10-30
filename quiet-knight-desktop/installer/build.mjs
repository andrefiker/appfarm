import { readdir, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Uses electron-builder's already-downloaded NSIS Linux compiler. Generate
// exact uninstall entries so unrelated files and saved game data are retained.
const sourceDir = path.resolve('dist/win-unpacked');
const appDir = path.resolve('dist/win-retained');
const locales = new Set(['en-US.pak', 'en-GB.pak', 'pt-BR.pak', 'pt-PT.pak']);
await rm(appDir, { recursive: true, force: true });
await cp(sourceDir, appDir, { recursive: true, filter: src => path.dirname(src) !== path.join(sourceDir, 'locales') || locales.has(path.basename(src)) });
const compiler = process.env.QK_MAKENSIS;
if (!compiler) throw Error('Set QK_MAKENSIS to the NSIS Linux makensis executable');
const files = [], dirs = [];
async function visit(dir, rel = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const sub = path.join(rel, entry.name);
    if (entry.isDirectory()) { await visit(path.join(dir, entry.name), sub); dirs.push(sub); }
    else if (entry.isFile()) files.push(sub);
    else throw Error(`Unexpected non-file: ${sub}`);
  }
}
await visit(appDir);
const nsis = p => p.replaceAll('$', '$$').replaceAll('"', '$\\"').split(path.sep).join('\\');
const deletion = files.map(f => `  Delete "$INSTDIR\\${nsis(f)}"`).join('\n');
const removeDirs = dirs.map(d => `  RMDir "$INSTDIR\\${nsis(d)}"`).join('\n');
const script = `Unicode true
SetCompressor /SOLID lzma
!include "x64.nsh"
Name "Quiet Knight"
OutFile "${path.resolve('dist/Quiet Knight Setup 1.1.11.exe')}"
InstallDir "$LOCALAPPDATA\\Programs\\Quiet Knight"
RequestExecutionLevel user
ShowInstDetails show
ShowUninstDetails show
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles
Function .onInit
  \${IfNot} \${RunningX64}
    MessageBox MB_ICONSTOP "Quiet Knight requires 64-bit Windows."
    Abort
  \${EndIf}
  SetRegView 64
  SetShellVarContext current
FunctionEnd
Function un.onInit
  SetRegView 64
  SetShellVarContext current
FunctionEnd
Section "Install"
  SetOutPath "$INSTDIR"
  File /r "${appDir}/*"
  WriteUninstaller "$INSTDIR\\Uninstall Quiet Knight.exe"
  CreateDirectory "$SMPROGRAMS\\Quiet Knight"
  CreateShortcut "$SMPROGRAMS\\Quiet Knight\\Quiet Knight.lnk" "$INSTDIR\\Quiet Knight.exe"
  CreateShortcut "$DESKTOP\\Quiet Knight.lnk" "$INSTDIR\\Quiet Knight.exe"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "DisplayName" "Quiet Knight"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "DisplayVersion" "1.1.11"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "Publisher" "AppFarm"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "UninstallString" '"$INSTDIR\\Uninstall Quiet Knight.exe"'
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "NoModify" 1
  WriteRegDWORD HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop" "NoRepair" 1
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\\Quiet Knight.lnk"
  Delete "$SMPROGRAMS\\Quiet Knight\\Quiet Knight.lnk"
  RMDir "$SMPROGRAMS\\Quiet Knight"
${deletion}
${removeDirs}
  Delete "$INSTDIR\\Uninstall Quiet Knight.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\QuietKnightDesktop"
SectionEnd
`;
await mkdir('dist', {recursive:true});
await writeFile('dist/quiet-knight-installer.nsi', script);
const result = spawnSync(compiler, ['dist/quiet-knight-installer.nsi'], {stdio:'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
