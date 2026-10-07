package com.andrefiker.clinicalcockpit;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.widget.*;
import android.graphics.*;
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
    void awaitOpen()throws Exception{for(int i=0;i<100;i++){Thread.sleep(100);final boolean[] done={false};ui(()->done[0]=a.data!=null&&!a.busy);if(done[0])return;}throw new AssertionError("Unlock timeout");}
    @Override public void onCreate(Bundle b){super.onCreate(b);start();}
    @Override public void onStart(){Bundle result=new Bundle();try{
        Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        a=(MainActivity)startActivitySync(intent);
        check((a.getWindow().getAttributes().flags&WindowManager.LayoutParams.FLAG_SECURE)!=0,"secure window");
        set("password","synthetic test password");set("confirm","synthetic test password");tap("Criar cofre");awaitOpen();
        tap("Cadastrar primeiro paciente");set("code","CL-001");set("next","2026-10-08");set("formulation","Hipótese sintética a investigar");tap("Salvar paciente");
        ui(()->check(a.clients().length()==1,"patient created"));snapshot("patient");
        tap("Registrar sessão");set("date","2026-10-07");set("transcript","Notas inteiramente fictícias — teste sem pessoa real.");set("layer0","Relato fictício");set("layer1","Antecedente A; resposta B; consequência C — hipótese");set("evidence","Trecho fictício: A. Lacuna: contexto.");set("road0","Investigar a hipótese funcional");set("road2","O que aconteceu depois?");tap("Salvar sessão");
        JSONObject c=a.clients().getJSONObject(0),s=c.getJSONArray("sessions").getJSONObject(0);
        check(s.getString("transcript").contains("fictícias"),"session stored");
        tap("Marcar como revisado");check(s.getBoolean("reviewed"),"human review state");
        tap("Roteiro para próxima sessão");snapshot("roadmap");ui(()->check(a.body.getChildCount()>8,"roadmap renders"));tap("Voltar à sessão");
        tap("Dossiê • quatro camadas");snapshot("dossier");tap("Voltar à sessão");tap("Editar sessão");set("road1","Compromisso sintético salvo como rascunho");
        ui(()->a.lock());check(a.key==null&&a.data==null,"lock clears decrypted model and key");
        set("password","synthetic test password");tap("Abrir cofre");awaitOpen();tap("Retomar rascunho");ui(()->check(a.fields.get("road1").getText().toString().contains("rascunho"),"draft restored after lock"));tap("Salvar sessão");
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
        ui(()->{check(a.root.getPaddingTop()>0,"status safe area");check(a.root.getPaddingBottom()>0,"navigation safe area");a.onStop();});check(a.data==null,"background locks vault");snapshot("locked");
        result.putString("stream",log+"\n"+checks+" Android checks passed\n");finish(Activity.RESULT_OK,result);
    }catch(Throwable e){result.putString("stream",log+"\nFAIL: "+e+"\n"+android.util.Log.getStackTraceString(e));finish(Activity.RESULT_CANCELED,result);}}
}
