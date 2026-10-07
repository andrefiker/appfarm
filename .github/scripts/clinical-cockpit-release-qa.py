"""Exact signed production update + Keystore/import UI QA. Disposable synthetic data only."""
import subprocess,time,xml.etree.ElementTree as ET,re,pathlib
PKG='com.andrefiker.clinicalcockpit'
checks=0

def passed(name):
    global checks
    checks+=1
    print('PASS '+name,flush=True)
def adb(*args):return subprocess.check_output(['adb',*args],text=True)
def nodes():
    adb('shell','uiautomator','dump','/sdcard/release-ui.xml')
    return list(ET.fromstring(adb('shell','cat','/sdcard/release-ui.xml')).iter('node'))
def find(label,attribute='text'):
    deadline=time.monotonic()+60
    while time.monotonic()<deadline:
        for n in nodes():
            if (n.get(attribute) or '').casefold()==label.casefold():return n
        time.sleep(.5)
    pathlib.Path('dist').mkdir(exist_ok=True)
    pathlib.Path('dist/production-failure.xml').write_text(adb('shell','cat','/sdcard/release-ui.xml'))
    raise AssertionError('UI item absent after 60s: '+label)
def tap(label,attribute='text'):
    n=find(label,attribute);x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
def fill(label,text):
    tap(label,'content-desc');adb('shell','input','text',text.replace(' ','%s'));adb('shell','input','keyevent','BACK')
    time.sleep(.4)
def choose_download(name):
    tap('Show roots','content-desc');tap('Downloads');tap(name)
def launch():adb('shell','am','start','-n',PKG+'/.MainActivity')

pathlib.Path('dist').mkdir(exist_ok=True)
adb('install','-r','../dl/Clinical-Cockpit-v0.2.0.apk')
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');launch()
find('Um espaço para cuidar');passed('0.2 baseline installs and launches offline')
fill('Senha do cofre • mínimo de 12 caracteres','release synthetic password')
fill('Repita a senha','release synthetic password');tap('Criar cofre');find('Antes da próxima sessão');passed('0.2 baseline encrypted vault creation')
tap('Cadastrar primeiro paciente');fill('Código • CL-001','CL-002');tap('Salvar paciente');find('CL-002');passed('0.2 baseline patient creation')
tap('Registrar sessão');fill('Transcrição / notas • texto confidencial','Synthetic release session only');tap('Salvar sessão');find('Dossiê • quatro camadas');passed('0.2 baseline session save')
adb('shell','am','force-stop',PKG);adb('install','-r','../dl/Clinical-Cockpit-v0.3.0.apk');launch()
find('Seu espaço clínico');fill('Senha antiga • somente para migrar','incorrect migration password');tap('Remover senha de abertura')
find('Senha antiga incorreta ou cofre danificado. Nenhum registro foi alterado.');tap('OK');passed('incorrect migration password rejected')
fill('Senha antiga • somente para migrar','release synthetic password');tap('Remover senha de abertura');find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões')
passed('exact signed 0.2 to 0.3 migration preserves records with one old-password entry')
tap('Pausar');find('Continuar');assert not any(n.get('class')=='android.widget.EditText' for n in nodes());tap('Continuar');find('Antes da próxima sessão');passed('pause and continue have no password field')
adb('shell','am','force-stop',PKG);launch();find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões');passed('Keystore reopens old records on process restart without password')
# Portable backups must work independently of the device Keystore.
tap('Cofre');tap('Salvar backup criptografado');fill('Senha para o backup • mínimo de 12 caracteres','portable release password');tap('Preparar backup')
tap('Show roots','content-desc');tap('Downloads');tap('Save');find('Seu cofre')
adb('pull','/sdcard/Download/clinica-backup.ccvault','dist/exported-portable-backup.ccvault')
subprocess.check_call(['java','-cp','dist/fixture','BackupFixture','verify','dist/exported-portable-backup.ccvault'])
passed('production portable backup physically exported and independently decrypted')
# Actual document picker, bulk preview/confirmation, stable duplicate handling.
roster='code,next,notebookUrl,formulation,sourceReference\nCL-002,,,,\nCL-007,2026-10-09,https://notebook.google.com/notebook/12345678-1234-1234-1234-123456789abc,,Synthetic source\nCL-008,,,,\n'
pathlib.Path('dist/production-roster.csv').write_text(roster)
adb('push','dist/production-roster.csv','/sdcard/Download/patients.csv')
tap('Pacientes');tap('Importar pacientes • CSV / JSON');tap('Escolher arquivo CSV ou JSON');choose_download('patients.csv')
find('Conferir cadastros');tap('Importar 2 pacientes');tap('Continuar');find('CL-002\n1 sessões');find('CL-007\n0 sessões');find('CL-008\n0 sessões');passed('real CSV picker adds two reviewed patients and preserves old sessions')
tap('Importar pacientes • CSV / JSON');tap('Escolher arquivo CSV ou JSON');choose_download('patients.csv');find('Conferir cadastros');find('0 novos • 3 já cadastrados serão mantidos. Abra cada item para conferir os campos.');tap('Voltar aos pacientes');passed('reimport skips all existing codes')
tap('CL-007\n0 sessões');find('Abrir caderno Notebook');passed('imported patient exposes an explicit Notebook link')
adb('push','dist/recovery-fixture.ccvault','/sdcard/Download/recovery-fixture.ccvault')
tap('Pausar');tap('Restaurar backup criptografado');tap('Continuar');choose_download('recovery-fixture.ccvault')
fill('Senha do backup','different backup password');tap('Restaurar');find('Antes da próxima sessão');tap('Pacientes');find('CL-099\n1 sessões');passed('old independently passworded backup restores via actual picker')
tap('Pausar');tap('Desfazer última restauração');tap('Continuar');find('Antes da próxima sessão');tap('Pacientes');find('CL-002\n1 sessões');find('CL-007\n0 sessões');passed('undo restores migrated vault and imported roster without password')
tap('Cofre');tap('Descartar cópia anterior');tap('Continuar');find('Seu cofre');assert not any(n.get('text')=='Desfazer última restauração' for n in nodes());passed('previous encrypted snapshot can be discarded')
adb('shell','wm','size','640x1136');adb('shell','wm','density','320');adb('shell','am','force-stop',PKG);launch();find('Antes da próxima sessão');tap('Pausar')
n=find('Continuar');x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')));assert 0<=x1<x2<=640 and 0<=y1<y2<=1136
passed('320dp password-free continue control fits phone screen')
print(str(checks)+' production Android checks passed',flush=True)
