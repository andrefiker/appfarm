Unicode True
!include "MUI2.nsh"
Name "Primordia"
OutFile "build/Primordia-Setup-v1.0.0.exe"
InstallDir "$LOCALAPPDATA\Primordia"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Primordia · an offline evolution sandbox"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Primordia.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Section "Primordia"
 SetOutPath "$INSTDIR"
 File "build/Primordia/Primordia.exe"
 File "build/Primordia/Primordia.pck"
 File "build/Primordia/README.txt"
 File "build/Primordia/LICENSES.txt"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 CreateDirectory "$SMPROGRAMS\Primordia"
 CreateShortcut "$SMPROGRAMS\Primordia\Primordia.lnk" "$INSTDIR\Primordia.exe"
 CreateShortcut "$DESKTOP\Primordia.lnk" "$INSTDIR\Primordia.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "DisplayName" "Primordia"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "DisplayVersion" "1.0.0"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "UninstallString" '"$INSTDIR\Uninstall.exe"'
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "InstallLocation" "$INSTDIR"
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "NoModify" 1
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia" "NoRepair" 1
SectionEnd
Section "Uninstall"
 Delete "$INSTDIR\Primordia.exe"
 Delete "$INSTDIR\Primordia.pck"
 Delete "$INSTDIR\README.txt"
 Delete "$INSTDIR\LICENSES.txt"
 Delete "$INSTDIR\Uninstall.exe"
 Delete "$DESKTOP\Primordia.lnk"
 Delete "$SMPROGRAMS\Primordia\Primordia.lnk"
 RMDir "$SMPROGRAMS\Primordia"
 RMDir "$INSTDIR"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Primordia"
 ; Saves under AppData/Roaming/Godot/app_userdata/Primordia remain intact.
SectionEnd
