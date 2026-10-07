"""External UI smoke for the signed production APK. Synthetic records only."""
import subprocess,time,xml.etree.ElementTree as ET,re,pathlib
PKG='com.andrefiker.clinicalcockpit'
def adb(*args): return subprocess.check_output(['adb',*args],text=True)
def nodes():
    adb('shell','uiautomator','dump','/sdcard/release-ui.xml')
    return list(ET.fromstring(adb('shell','cat','/sdcard/release-ui.xml')).iter('node'))
def find(label,attribute='text'):
    deadline=time.monotonic()+60
    while time.monotonic()<deadline:
        current=nodes()
        for n in current:
            if (n.get(attribute) or '').casefold()==label.casefold():return n
        time.sleep(.5)
    pathlib.Path('dist').mkdir(exist_ok=True)
    pathlib.Path('dist/production-failure.xml').write_text(adb('shell','cat','/sdcard/release-ui.xml'))
    raise AssertionError('UI item absent after 60s: '+label)
def tap(label,attribute='text'):
    n=find(label,attribute); x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
def fill(label,text):
    tap(label,'content-desc');adb('shell','input','text',text.replace(' ','%s'));adb('shell','input','keyevent','BACK')
adb('install','-r','../dl/Clinical-Cockpit-v0.1.0.apk')
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
adb('shell','am','start','-n',PKG+'/.MainActivity')
find('Um espaço para cuidar');print('PASS production APK installs and launches offline')
fill('Senha do cofre • mínimo de 12 caracteres','release synthetic password')
fill('Repita a senha','release synthetic password');tap('Criar cofre')
find('Antes da próxima sessão');print('PASS production vault creation')
tap('Cadastrar primeiro paciente');fill('Código • CL-001','CL-002');tap('Salvar paciente');find('CL-002')
print('PASS production patient creation')
tap('Registrar sessão');fill('Transcrição / notas • texto confidencial','Synthetic release session only');tap('Salvar sessão')
find('Dossiê • quatro camadas');print('PASS v0.1 baseline session save')
# The exact production update must keep the old encrypted records and password.
adb('shell','am','force-stop',PKG);adb('install','-r','../dl/Clinical-Cockpit-v0.2.0.apk')
adb('shell','am','start','-n',PKG+'/.MainActivity');find('Seu espaço clínico')
fill('Senha do cofre • mínimo de 12 caracteres','release synthetic password');tap('Abrir cofre')
find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões')
print('PASS exact owner-signed 0.1 to 0.2 upgrade preserves old vault')
tap('Travar');find('Seu espaço clínico');fill('Senha do cofre • mínimo de 12 caracteres','release synthetic password');tap('Abrir cofre')
find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões');print('PASS production encrypted persistence after lock')
adb('shell','am','force-stop',PKG);adb('shell','am','start','-n',PKG+'/.MainActivity');find('Seu espaço clínico')
pathlib.Path('dist').mkdir(exist_ok=True);pathlib.Path('dist/production-relaunch.xml').write_text(adb('shell','cat','/sdcard/release-ui.xml'))
print('PASS production restart is locked')
# Exercise the real system file picker from the locked screen.
adb('push','dist/recovery-fixture.ccvault','/sdcard/Download/recovery-fixture.ccvault')
tap('Restaurar backup criptografado');tap('Continuar')
# DocumentsUI is an English-language system app on the disposable API35 runner.
tap('Show roots','content-desc');tap('Downloads');tap('recovery-fixture.ccvault')
find('Senha do backup');fill('Senha do backup','different backup password');tap('Restaurar')
find('Antes da próxima sessão');tap('Pacientes');find('CL-099\n1 sessões')
print('PASS signed production locked restore through actual document picker')
tap('Travar');tap('Desfazer última restauração');tap('Continuar')
fill('Senha do backup','release synthetic password');tap('Restaurar')
find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões')
print('PASS signed production undo restores pre-recovery data and password')
tap('Cofre');tap('Descartar cópia anterior');tap('Continuar')
find('Seu cofre');assert not any(n.get('text')=='Desfazer última restauração' for n in nodes())
print('PASS explicit prior-snapshot disposal leaves current vault usable')
tap('Travar')
# Smaller fallback phone: no content leak and unlock action remains on-screen.
adb('shell','wm','size','640x1136');adb('shell','wm','density','320');adb('shell','am','force-stop',PKG)
adb('shell','am','start','-n',PKG+'/.MainActivity');n=find('Abrir cofre');x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
assert 0<=x1<x2<=640 and 0<=y1<y2<=1136
print('PASS 320dp fallback unlock fits phone screen')
print('11 production Android checks passed')
