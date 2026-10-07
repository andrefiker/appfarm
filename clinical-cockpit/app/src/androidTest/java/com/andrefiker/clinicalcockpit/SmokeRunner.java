package com.andrefiker.clinicalcockpit;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import android.graphics.*;
import android.view.accessibility.AccessibilityNodeInfo;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Synthetic-only integration QA. No fixture data is shipped with the app. */
public class SmokeRunner extends Instrumentation {
    MainActivity a;int checks=0;StringBuilder log=new StringBuilder();
    void check(boolean ok,String name){if(!ok)throw new AssertionError(name);checks++;log.append("PASS ").append(name).append('\n');}
    void ui(Runnable r){runOnMainSync(r);waitForIdleSync();}
    View find(View v,String label){if(v instanceof Button&&((Button)v).getText().toString().equals(label))return v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){View found=find(g.getChildAt(i),label);if(found!=null)return found;}}return null;}
    void tap(String text){ui(()->{View v=find(a.root,text);if(v==null)throw new AssertionError("Missing button: "+text);v.performClick();});}
    void set(String field,String text){ui(()->a.fields.get(field).setText(text));}
    void snapshot(String name)throws Exception{Thread.sleep(250);ui(()->{try{int w=a.root.getWidth(),h=a.root.getHeight();check(w>0&&h>0,"layout ready "+name);Bitmap b=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);a.root.draw(new Canvas(b));try(FileOutputStream out=new FileOutputStream(new File(a.getFilesDir(),name+".png"))){b.compress(Bitmap.CompressFormat.PNG,100,out);}b.recycle();}catch(Exception e){throw new RuntimeException(e);}});}
    void awaitOpen()throws Exception{for(int i=0;i<600;i++){Thread.sleep(100);final boolean[] done={false};ui(()->done[0]=a.data!=null&&!a.busy);if(done[0])return;}throw new AssertionError("Unlock timeout: busy="+a.busy+", epoch="+a.unlockEpoch+", vault="+a.hasVault()+", data="+(a.data!=null));}
    AccessibilityNodeInfo node(AccessibilityNodeInfo root,String label,boolean description) {
        if(root==null)return null;
        CharSequence v=description?root.getContentDescription():root.getText();
        if(v!=null&&v.toString().equalsIgnoreCase(label))return root;
        for(int i=0;i<root.getChildCount();i++){AccessibilityNodeInfo found=node(root.getChild(i),label,description);if(found!=null)return found;}return null;
    }
    AccessibilityNodeInfo dialogNode(String label,boolean description)throws Exception{
        for(int i=0;i<30;i++){AccessibilityNodeInfo n=node(getUiAutomation().getRootInActiveWindow(),label,description);if(n!=null)return n;for(android.view.accessibility.AccessibilityWindowInfo w:getUiAutomation().getWindows()){n=node(w.getRoot(),label,description);if(n!=null)return n;}Thread.sleep(100);}throw new AssertionError("Dialog node absent: "+label);
    }
    void apply(MainActivity.RecoveryCandidate candidate)throws Exception {
        final Exception[] fail={null};ui(()->{try{a.commitRecovery(candidate);}catch(Exception e){fail[0]=e;}});if(fail[0]!=null)throw fail[0];
    }
    void recoveryTests()throws Exception {
        byte[] backup=MainActivity.makeBackup(a.data,"synthetic test password".toCharArray()),oldKey=a.key.clone(),before=a.vault.readFully();
        boolean rejected=false;try{MainActivity.prepareRecovery(backup,"wrong backup password".toCharArray());}catch(Exception e){rejected=true;}
        check(rejected&&Arrays.equals(before,a.vault.readFully()),"wrong backup password leaves current vault intact");
        JSONObject invalid=new JSONObject(a.data.toString());invalid.put("schema",9);
        byte[] backupSalt=VaultCrypto.salt(backup),backupKey=VaultCrypto.derive("synthetic test password".toCharArray(),backupSalt);
        byte[] malformed=VaultCrypto.encrypt(invalid.toString().getBytes(StandardCharsets.UTF_8),backupKey,backupSalt);Arrays.fill(backupKey,(byte)0);
        rejected=false;try{MainActivity.prepareRecovery(malformed,"synthetic test password".toCharArray());}catch(Exception e){rejected=true;}
        check(rejected&&Arrays.equals(before,a.vault.readFully()),"authenticated unsupported schema cannot replace vault");
        byte[] tampered=backup.clone();tampered[tampered.length-1]^=1;
        rejected=false;try{MainActivity.prepareRecovery(tampered,"synthetic test password".toCharArray());}catch(Exception e){rejected=true;}
        check(rejected&&Arrays.equals(before,a.vault.readFully()),"tampered backup cannot replace vault");
        byte[] damaged="DAMAGED".getBytes(StandardCharsets.UTF_8);MainActivity.writeEnvelope(a.vault,damaged);ui(a::lock);
        File fixture=new File(a.getFilesDir(),"recovery.ccvault");try(FileOutputStream out=new FileOutputStream(fixture)){out.write(backup);}
        ui(()->{a.pendingMode="backup";a.onActivityResult(10,Activity.RESULT_OK,new Intent().setData(Uri.fromFile(fixture)));});
        check(a.data==null,"locked recovery asks for password before exposing records");
        Bundle input=new Bundle();input.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,"synthetic test password");
        check(dialogNode("Senha do backup",true).performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,input),"backup password dialog accepts input");
        check(dialogNode("Restaurar",false).performAction(AccessibilityNodeInfo.ACTION_CLICK),"recovery dialog action works");awaitOpen();snapshot("recovery");
        check(a.clients().getJSONObject(0).getString("code").equals("CL-001"),"damaged locked vault restored without reinstall");
        check(Arrays.equals(damaged,a.previousVault.readFully()),"damaged prior file retained before replacement");
        rejected=false;try{MainActivity.prepareRecovery(a.previousVault.readFully(),"synthetic test password".toCharArray());}catch(Exception e){rejected=true;}
        check(rejected&&a.clients().length()==1,"invalid prior snapshot cannot replace restored records");
        byte[] current=a.vault.readFully();JSONObject different=new JSONObject(a.data.toString());different.getJSONArray("clients").getJSONObject(0).put("code","CL-003");
        byte[] newSalt=VaultCrypto.randomSalt(),newKey=VaultCrypto.derive("different backup password".toCharArray(),newSalt);
        byte[] incoming=VaultCrypto.encrypt(different.toString().getBytes(StandardCharsets.UTF_8),newKey,newSalt);
        apply(MainActivity.prepareRecovery(incoming,"different backup password".toCharArray()));
        check(a.clients().getJSONObject(0).getString("code").equals("CL-003"),"restore supports independently passworded backup");
        check(Arrays.equals(current,a.previousVault.readFully()),"valid former vault kept as encrypted undo snapshot");
        check(MainActivity.parseData(VaultCrypto.decrypt(a.vault.readFully(),newKey)).getJSONArray("clients").length()==1,"restored vault uses backup password");
        apply(MainActivity.prepareRecovery(a.previousVault.readFully(),"synthetic test password".toCharArray()));
        check(a.clients().getJSONObject(0).getString("code").equals("CL-001"),"undo restore returns old data and password");
        check(MainActivity.parseData(VaultCrypto.decrypt(a.previousVault.readFully(),newKey)).getJSONArray("clients").getJSONObject(0).getString("code").equals("CL-003"),"undo preserves displaced vault for redo");
        AtomicFile originalSnapshot=a.previousVault;File blocked=new File(a.getFilesDir(),"blocked-parent");try(FileOutputStream out=new FileOutputStream(blocked)){out.write(1);}
        a.previousVault=new AtomicFile(new File(blocked,"snapshot"));current=a.vault.readFully();MainActivity.RecoveryCandidate candidate=MainActivity.prepareRecovery(incoming,"different backup password".toCharArray());
        rejected=false;try{apply(candidate);}catch(Exception e){rejected=true;}a.previousVault=originalSnapshot;
        check(rejected&&Arrays.equals(current,a.vault.readFully()),"snapshot write failure prevents current vault replacement");
        check(Arrays.equals(candidate.key,new byte[candidate.key.length]),"failed recovery candidate key erased");
        final byte[] unchanged=current;ui(()->{a.startRecovery(backup,"synthetic test password".toCharArray());a.lock();});Thread.sleep(1500);waitForIdleSync();
        check(a.data==null&&Arrays.equals(unchanged,a.vault.readFully()),"cancelled recovery cannot commit late");Arrays.fill(oldKey,(byte)0);Arrays.fill(newKey,(byte)0);
        tap("Continuar");awaitOpen();
    }
    void deviceAndRosterTests()throws Exception {
        byte[] current=a.vault.readFully(),storedKey=a.deviceKeys.read(a.salt);
        check(Arrays.equals(storedKey,a.key),"Android Keystore wrapped key roundtrip");Arrays.fill(storedKey,(byte)0);
        check(a.deviceKeys.read(VaultCrypto.randomSalt())==null,"unregistered salt has no device key");
        check(!new String(a.deviceKeys.file.readFully(),StandardCharsets.UTF_8).contains(DeviceKeys.encode(a.key)),"raw vault key absent from key index");
        byte[] index=a.deviceKeys.file.readFully();JSONObject damagedIndex=new JSONObject(new String(index,StandardCharsets.UTF_8));JSONObject keys=damagedIndex.getJSONObject("keys");
        String first=keys.keys().next();byte[] altered=android.util.Base64.decode(keys.getString(first),android.util.Base64.NO_WRAP);altered[altered.length-1]^=1;keys.put(first,DeviceKeys.encode(altered));MainActivity.writeEnvelope(a.deviceKeys.file,damagedIndex.toString().getBytes(StandardCharsets.UTF_8));
        boolean reject=false;try{a.deviceKeys.read(android.util.Base64.decode(first,android.util.Base64.NO_WRAP));}catch(Exception e){reject=true;}MainActivity.writeEnvelope(a.deviceKeys.file,index);
        check(reject&&Arrays.equals(current,a.vault.readFully()),"tampered wrapped key rejected without altering vault");
        ui(a::lock);check(!a.fields.containsKey("password"),"pause has no password field");tap("Continuar");awaitOpen();check(a.clients().length()==1,"device access reopens records without password");
        byte[] backup=MainActivity.makeBackup(a.data,"portable synthetic password".toCharArray());
        MainActivity.RecoveryCandidate candidate=MainActivity.prepareRecovery(backup,"portable synthetic password".toCharArray());
        check(candidate.data.getJSONArray("clients").length()==1&&!Arrays.equals(candidate.key,a.key),"portable backup has independent password key");Arrays.fill(candidate.key,(byte)0);
        String url="https://notebook.google.com/notebook/12345678-1234-1234-1234-123456789abc";
        String csv="code,next,notebookUrl,formulation,sourceReference\nCL-001,,,,\nCL-004,2026-10-09,"+url+",,Synthetic source\nCL-005,,,,\n";
        check(MainActivity.parseRoster("[{\"code\":\"CL-006\"}]").size()==1,"JSON roster accepted locally");
        reject=false;try{MainActivity.parseRoster("[{\"code\":\"CL-006\"},{\"code\":\"CL-006\"}]");}catch(Exception e){reject=true;}check(reject,"JSON duplicate roster rejected");
        reject=false;try{MainActivity.parseRoster("[{\"code\":\"CL-006\",\"unknown\":\"test\"}]");}catch(Exception e){reject=true;}check(reject,"JSON unknown fields rejected");
        reject=false;try{MainActivity.parseRoster("[{\"code\":\"CL-006\",\"next\":42}]");}catch(Exception e){reject=true;}check(reject,"JSON field types validated");
        ui(a::rosterImport);set("roster",csv);tap("Verificar importação");snapshot("roster-preview");
        check(a.clients().length()==1,"roster preview does not mutate existing patients");tap("Cancelar importação");check(a.clients().length()==1,"cancelled roster leaves records intact");
        ui(a::rosterImport);set("roster",csv);tap("Verificar importação");tap("Importar 2 pacientes");check(dialogNode("Continuar",false).performAction(AccessibilityNodeInfo.ACTION_CLICK),"roster confirmation action works");waitForIdleSync();
        check(a.clients().length()==3&&a.clients().getJSONObject(0).getJSONArray("sessions").length()==1,"bulk import preserves old patient and sessions");
        check(a.clients().getJSONObject(1).getString("notebookUrl").equals(url)&&a.clients().getJSONObject(1).getBoolean("imported"),"Notebook URL and review provenance retained");snapshot("roster");
        final int[] count={-1};ui(()->{try{count[0]=a.commitRoster(MainActivity.parseRoster(csv));}catch(Exception e){throw new RuntimeException(e);}});check(count[0]==0&&a.clients().length()==3,"reimport skips existing codes without duplication");
        ui(()->a.openClient(a.clients().optJSONObject(1).optString("id")));check(find(a.root,"Abrir caderno Notebook")!=null,"Notebook link action is visible");
        byte[] updated=a.vault.readFully();ui(a::lock);tap("Continuar");awaitOpen();check(a.clients().length()==3&&Arrays.equals(updated,a.vault.readFully()),"imported roster persists through password-free reopen");
    }
    @Override public void onCreate(Bundle b){super.onCreate(b);start();}
    @Override public void onStart(){Bundle result=new Bundle();try{
        Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        a=(MainActivity)startActivitySync(intent);
        check((a.getWindow().getAttributes().flags&WindowManager.LayoutParams.FLAG_SECURE)!=0,"secure window");
        awaitOpen();check(!a.fields.containsKey("password"),"fresh install opens without app password");
        tap("Cadastrar primeiro paciente");set("code","CL-001");set("next","2026-10-08");set("formulation","Hipótese sintética a investigar");tap("Salvar paciente");
        ui(()->check(a.clients().length()==1,"patient created"));snapshot("patient");
        tap("Registrar sessão");set("date","2026-10-07");set("transcript","Notas inteiramente fictícias — teste sem pessoa real.");set("layer0","Relato fictício");set("layer1","Antecedente A; resposta B; consequência C — hipótese");set("evidence","Trecho fictício: A. Lacuna: contexto.");set("road0","Investigar a hipótese funcional");set("road2","O que aconteceu depois?");tap("Salvar sessão");
        JSONObject c=a.clients().getJSONObject(0),s=c.getJSONArray("sessions").getJSONObject(0);
        check(s.getString("transcript").contains("fictícias"),"session stored");
        tap("Marcar como revisado");check(s.getBoolean("reviewed"),"human review state");
        tap("Roteiro para próxima sessão");snapshot("roadmap");ui(()->check(a.body.getChildCount()>8,"roadmap renders"));tap("Voltar à sessão");
        tap("Dossiê • quatro camadas");snapshot("dossier");tap("Voltar à sessão");tap("Editar sessão");set("road1","Compromisso sintético salvo como rascunho");
        ui(()->a.lock());check(a.key==null&&a.data==null,"lock clears decrypted model and key");
        tap("Continuar");awaitOpen();tap("Retomar rascunho");ui(()->check(a.fields.get("road1").getText().toString().contains("rascunho"),"draft restored after lock"));tap("Salvar sessão");
        c=a.clients().getJSONObject(0);s=c.getJSONArray("sessions").getJSONObject(0);check(!s.optBoolean("reviewed"),"editing resets review");
        byte[] encrypted=a.vault.readFully();check(!new String(encrypted,StandardCharsets.UTF_8).contains("fictícias"),"vault file contains no plaintext fixture");
        byte[] original=a.key.clone();byte[] wrong=VaultCrypto.derive("wrong password".toCharArray(),a.salt);boolean rejected=false;try{VaultCrypto.decrypt(encrypted,wrong);}catch(Exception e){rejected=true;}check(rejected,"wrong password cannot decrypt vault");
        JSONObject restored=MainActivity.parseData(VaultCrypto.decrypt(encrypted,original));check(restored.getJSONArray("clients").length()==1,"encrypted backup roundtrip");
        JSONObject bad=new JSONObject(restored.toString());bad.getJSONArray("clients").getJSONObject(0).put("code","Real Name");rejected=false;try{MainActivity.parseData(bad.toString().getBytes(StandardCharsets.UTF_8));}catch(Exception e){rejected=true;}check(rejected,"invalid backup schema rejected");
        final JSONObject cc=c,ss=s;final String[] text={""};ui(()->text[0]=a.document(cc,ss,false));check(!text[0].contains("Notas inteiramente"),"raw transcript excluded from dossier export");
        String longText=text[0]+("\nLinha sintética para conferir quebra de página e acentuação.").repeat(180);
        byte[] pdf=MainActivity.pdf(longText),docx=Docx.create(text[0]);check(new String(pdf,0,4,StandardCharsets.US_ASCII).equals("%PDF"),"native multipage PDF generated");
        File p=new File(a.getFilesDir(),"synthetic.pdf");File w=new File(a.getFilesDir(),"synthetic.docx");try(FileOutputStream out=new FileOutputStream(p)){out.write(pdf);}try(FileOutputStream out=new FileOutputStream(w)){out.write(docx);}
        ui(()->{a.sessionMenu(cc,ss);a.pendingBytes=docx;a.picker=true;a.onActivityResult(11,Activity.RESULT_OK,new Intent().setData(Uri.fromFile(new File(a.getFilesDir(),"saf-test.docx"))));});check(new File(a.getFilesDir(),"saf-test.docx").length()==docx.length,"export result writes physical document");
        File t=new File(a.getFilesDir(),"synthetic.txt");try(FileOutputStream out=new FileOutputStream(t)){out.write("Texto importado sintético".getBytes(StandardCharsets.UTF_8));}
        ui(()->{a.editSession(cc,ss);a.pendingMode="text";a.onActivityResult(10,Activity.RESULT_OK,new Intent().setData(Uri.fromFile(t)));check(a.fields.get("transcript").getText().toString().contains("importado"),"TXT import result");a.saveDraft();});
        ui(()->{a.route="Estudos";a.render();});tap("Adicionar texto de estudo");set("title","Estudo fictício");set("reference","Referência de teste");set("content","Notas de leitura sintéticas");tap("Salvar estudo");check(a.data.getJSONArray("studies").length()==1,"library saves text");
        recoveryTests();
        deviceAndRosterTests();
        ui(()->{check(a.root.getPaddingTop()>0,"status safe area");check(a.root.getPaddingBottom()>0,"navigation safe area");a.onStop();});check(a.data==null,"background locks vault");snapshot("locked");
        result.putString("stream",log+"\n"+checks+" Android checks passed\n");finish(Activity.RESULT_OK,result);
    }catch(Throwable e){result.putString("stream",log+"\nFAIL: "+e+"\n"+android.util.Log.getStackTraceString(e));finish(Activity.RESULT_CANCELED,result);}}
}
