package com.andrefiker.clinicalcockpit;

import android.app.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.*;
import android.text.*;
import android.text.InputType;
import android.util.AtomicFile;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

public class MainActivity extends Activity {
    static final int BG=Color.rgb(244,243,239), INK=Color.rgb(31,45,42), GREEN=Color.rgb(23,106,94), MUTED=Color.rgb(92,109,102);
    LinearLayout root, body, dock;
    JSONObject data;
    byte[] key, salt, pendingBytes;
    AtomicFile vault, previousVault;
    boolean picker=false, busy=false, broken=false;
    int unlockEpoch=0;
    final Handler privacyHandler=new Handler(Looper.getMainLooper());
    String route="Hoje", selectedClient="", selectedSession="", pendingMode="";
    Runnable draftSave;
    Handler handler=new Handler(Looper.getMainLooper());
    LinkedHashMap<String,EditText> fields=new LinkedHashMap<>();
    String draftType="";
    static final String[] LAYERS={"Queixas, demandas e contexto", "Contingências • A → R → C", "RFT / ACT / FAP", "Objetivos operantes"};
    static final String[] ROAD={"Objetivos prioritários", "Tarefas e compromissos", "Investigações e perguntas", "Armadilhas e manejo", "Intervenções propostas"};

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setStatusBarColor(BG); getWindow().setNavigationBarColor(BG);
        vault=new AtomicFile(new File(getFilesDir(),"clinical.vault"));
        previousVault=new AtomicFile(new File(getFilesDir(),"clinical.previous.vault"));
        lock();
    }
    int dp(int n) { return (int)(n*getResources().getDisplayMetrics().density+.5f); }
    GradientDrawable shape(int color) { GradientDrawable d=new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(14)); return d; }
    TextView text(String s, int size, int color) { TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(5),0,dp(5)); return t; }
    void heading(String s) { TextView t=text(s,27,INK);t.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));body.addView(t); }
    void note(String s) { body.addView(text(s,14,MUTED)); }
    void space() { View v=new View(this);body.addView(v,new LinearLayout.LayoutParams(1,dp(12))); }
    Button button(String label, Runnable action, boolean primary) {
        Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextSize(15);b.setTextColor(primary?Color.WHITE:GREEN);
        b.setBackground(shape(primary?GREEN:Color.rgb(227,235,229))); b.setMinHeight(dp(48));b.setPadding(dp(12),dp(8),dp(12),dp(8));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(5),0,dp(5));b.setLayoutParams(p);
        b.setOnClickListener(v->action.run());return b;
    }
    void action(String label, Runnable run) { body.addView(button(label,run,false)); }
    void primary(String label, Runnable run) { dock.addView(button(label,run,true)); }
    void screen(String title, boolean navigation) {
        handler.removeCallbacksAndMessages(null); fields.clear();draftType="";
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(BG);root.setSaveFromParentEnabled(false);
        root.setOnApplyWindowInsetsListener((v,i)-> {
            android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());
            android.graphics.Insets ime=i.getInsets(WindowInsets.Type.ime());
            v.setPadding(dp(18),bars.top,dp(18),Math.max(bars.bottom,ime.bottom));return i;
        });
        // WindowInsets.Type is available since API30; minSdk30 is set for this implementation.
        setContentView(root);root.requestApplyInsets();
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);
        TextView logo=text("CLÍNICA  /  COCKPIT",12,GREEN);logo.setLetterSpacing(.12f); header.addView(logo,new LinearLayout.LayoutParams(0,dp(42),1));
        if(navigation) { Button lock=button("Travar",this::lock,false);lock.setTextSize(12);header.addView(lock,new LinearLayout.LayoutParams(dp(76),dp(42))); }
        root.addView(header);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setSaveEnabled(false);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        body=new LinearLayout(this);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(0,dp(12),0,dp(16));scroll.addView(body);
        dock=new LinearLayout(this);dock.setOrientation(LinearLayout.VERTICAL);root.addView(dock);heading(title);
        if(navigation) {
            LinearLayout nav=new LinearLayout(this);
            for(String name:new String[]{"Hoje","Pacientes","Estudos","Cofre"}) {
                Button b=button(name,()->{saveDraft();route=name;render();},false);b.setTextSize(12);b.setPadding(0,0,0,0);
                LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.setMargins(dp(2),dp(6),dp(2),dp(6));nav.addView(b,p);
            } root.addView(nav);
        }
    }
    void message(String s) { Toast.makeText(this,s,Toast.LENGTH_LONG).show(); }
    void error(String s) { new AlertDialog.Builder(this).setTitle("Não foi possível concluir").setMessage(s).setPositiveButton("OK",null).show(); }
    String value(String k) { return fields.get(k).getText().toString().trim(); }
    EditText input(String k, String label, String val, int lines) {
        body.addView(text(label,13,MUTED));EditText e=new EditText(this);e.setSingleLine(lines==1);e.setMinLines(lines);e.setMaxLines(lines==1?1:12);
        e.setTextSize(16);e.setTextColor(INK);e.setHintTextColor(MUTED);e.setBackground(shape(Color.WHITE));e.setPadding(dp(12),dp(10),dp(12),dp(10));
        e.setSaveEnabled(false);e.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        e.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS|(lines>1?InputType.TYPE_TEXT_FLAG_MULTI_LINE:0));
        e.setText(val);e.setContentDescription(label);body.addView(e,new LinearLayout.LayoutParams(-1,-2));fields.put(k,e);
        e.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){} public void onTextChanged(CharSequence s,int a,int b,int c){ if(!draftType.isEmpty()){handler.removeCallbacks(draftSave);draftSave=MainActivity.this::saveDraft;handler.postDelayed(draftSave,900);} }public void afterTextChanged(Editable e){} });
        space();return e;
    }
    void lock() {
        saveDraft();unlockEpoch++;busy=false;handler.removeCallbacksAndMessages(null);if(key!=null)Arrays.fill(key,(byte)0);key=null;data=null;pendingBytes=null;fields.clear();
        screen(hasVault()?"Seu espaço clínico":"Um espaço para cuidar",false);
        note(hasVault()?"Cofre local bloqueado. Use sua senha para abrir.":"Registros no aparelho, criptografados. Sem contas, servidores ou envio de dados.");
        EditText password=input("password","Senha do cofre • mínimo de 12 caracteres","",1);
        password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText confirm=null;
        if(!hasVault()) { confirm=input("confirm","Repita a senha","",1);confirm.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);note("Guarde a senha. Sem ela, não há recuperação. Faça backups no menu Cofre."); }
        final EditText confirmation=confirm;
        primary(hasVault()?"Abrir cofre":"Criar cofre",()-> {
            if(busy)return;String pass=password.getText().toString();
            if(!hasVault()&&(pass.length()<12||!pass.equals(confirmation.getText().toString()))){error("Use pelo menos 12 caracteres e confirme a mesma senha.");return;}
            final int epoch=unlockEpoch;busy=true;password.setText("");if(confirmation!=null)confirmation.setText("");
            note("Abrindo com segurança…");char[] chars=pass.toCharArray();
            new Thread(()-> {
                byte[] newKey=null,newSalt=null;JSONObject loaded=null;Exception failure=null;
                try {
                    if(hasVault()) {byte[] envelope=readEnvelope(vault);newSalt=VaultCrypto.salt(envelope);newKey=VaultCrypto.derive(chars,newSalt);loaded=parseData(VaultCrypto.decrypt(envelope,newKey));}
                    else {newSalt=VaultCrypto.randomSalt();newKey=VaultCrypto.derive(chars,newSalt);loaded=emptyData();}
                } catch(Exception e){failure=e;} finally {Arrays.fill(chars,'\0');}
                final byte[] nk=newKey,ns=newSalt; final JSONObject nd=loaded;final Exception f=failure;
                runOnUiThread(()-> {if(epoch!=unlockEpoch){if(nk!=null)Arrays.fill(nk,(byte)0);return;}busy=false;if(f!=null){if(nk!=null)Arrays.fill(nk,(byte)0);error("Senha incorreta ou arquivo danificado. Nenhum registro foi sobrescrito.");return;}key=nk;salt=ns;data=nd;broken=false;if(!persist()){lock();return;}route="Hoje";render();});
            }).start();
        });
        action("Restaurar backup criptografado",this::chooseRecovery);
        if(exists(previousVault))action("Desfazer última restauração",this::choosePrevious);
        note("v0.2.0 • preenchimento clínico manual • Android");
    }
    static JSONObject emptyData() throws JSONException {return new JSONObject().put("schema",1).put("clients",new JSONArray()).put("studies",new JSONArray());}
    static JSONObject parseData(byte[] raw) throws Exception {
        JSONObject d=new JSONObject(new String(raw,StandardCharsets.UTF_8));
        if(d.getInt("schema")!=1)throw new IllegalArgumentException("Versão desconhecida");
        JSONArray clients=d.getJSONArray("clients"), studies=d.getJSONArray("studies");Set<String> codes=new HashSet<>(),ids=new HashSet<>();
        for(int i=0;i<clients.length();i++){
            JSONObject c=clients.getJSONObject(i);String id=c.getString("id"), code=c.getString("code");
            if(!Rules.validCode(code)||!codes.add(code)||!ids.add(id))throw new IllegalArgumentException("Paciente inválido");
            String next=c.optString("next");if(!next.isEmpty()&&!Rules.validDate(next))throw new IllegalArgumentException("Data inválida");
            JSONArray sessions=c.getJSONArray("sessions");Set<String> sessionIds=new HashSet<>();
            for(int j=0;j<sessions.length();j++) {JSONObject s=sessions.getJSONObject(j);if(!sessionIds.add(s.getString("id"))||!Rules.validDate(s.getString("date")))throw new IllegalArgumentException("Sessão inválida");s.getString("transcript");}
        }
        for(int i=0;i<studies.length();i++){JSONObject s=studies.getJSONObject(i);s.getString("id");s.getString("title");s.getString("content");}
        return d;
    }
    boolean persist() {
        if(key==null||data==null||broken)return false;FileOutputStream out=null;
        try {byte[] bytes=VaultCrypto.encrypt(data.toString().getBytes(StandardCharsets.UTF_8),key,salt);out=vault.startWrite();out.write(bytes);vault.finishWrite(out);return true;}
        catch(Exception e){if(out!=null)vault.failWrite(out);broken=true;error("Falha ao salvar. O arquivo anterior foi preservado. Reabra o cofre antes de continuar.");return false;}
    }
    void saveDraft() {
        if(data==null||draftType.isEmpty()||broken)return;
        try {JSONObject d=new JSONObject().put("type",draftType).put("clientId",selectedClient).put("sessionId",selectedSession);
            JSONObject values=new JSONObject();for(String k:fields.keySet())values.put(k,fields.get(k).getText().toString());d.put("values",values);data.put("draft",d);persist();}
        catch(Exception e){error("Não foi possível guardar o rascunho.");}
    }
    JSONArray clients() {return data.optJSONArray("clients");}
    JSONObject client(String id) {for(int i=0;i<clients().length();i++){JSONObject c=clients().optJSONObject(i);if(c.optString("id").equals(id))return c;}return null;}
    JSONObject session(JSONObject c,String id) {JSONArray list=c.optJSONArray("sessions");for(int i=0;i<list.length();i++){JSONObject s=list.optJSONObject(i);if(s.optString("id").equals(id))return s;}return null;}
    void render() {if(data==null){lock();return;}switch(route){case "Pacientes":patients();break;case "Estudos":studies();break;case "Cofre":settings();break;default:dashboard();}}
    void dashboard() {
        screen("Antes da próxima sessão",true);note(LocalDate.now()+"  •  registros apenas neste aparelho");
        if(data.has("draft"))action("Retomar rascunho",this::resumeDraft);
        int total=0;for(int i=0;i<clients().length();i++)total+=clients().optJSONObject(i).optJSONArray("sessions").length();
        space();note(clients().length()+" pacientes  ·  "+total+" sessões registradas");
        if(clients().length()==0){space();note("Cadastre um paciente usando um código como CL-001. A chave que relaciona código e identidade fica fora do app.");primary("Cadastrar primeiro paciente",()->editClient(null));return;}
        ArrayList<JSONObject> scheduled=new ArrayList<>();for(int i=0;i<clients().length();i++){JSONObject c=clients().optJSONObject(i);if(!c.optString("next").isEmpty()&&!c.optBoolean("archived"))scheduled.add(c);}
        scheduled.sort(Comparator.comparing(c->c.optString("next")));
        if(scheduled.isEmpty())note("Nenhuma próxima sessão agendada. Abra um paciente para definir a data.");
        for(JSONObject c:scheduled){space();TextView title=text(c.optString("code")+"  ·  "+c.optString("next"),20,INK);body.addView(title);
            JSONArray ss=c.optJSONArray("sessions");JSONObject last=latest(ss);
            note(last==null?"Sem roteiro registrado":last.optBoolean("reviewed")?"Roteiro revisado pelo terapeuta":"Roteiro em rascunho • revisar");
            action("Abrir "+c.optString("code"),()->openClient(c.optString("id")));
            if(last!=null)action("Ler roteiro • "+c.optString("code"),()->readRoadmap(c,last));
        }
        primary("Novo paciente",()->editClient(null));
    }
    JSONObject latest(JSONArray sessions) {JSONObject latest=null;for(int i=0;i<sessions.length();i++){JSONObject s=sessions.optJSONObject(i);if(latest==null||s.optString("date").compareTo(latest.optString("date"))>=0)latest=s;}return latest;}
    void patients() {
        screen("Pacientes",true);note("Códigos aleatórios. Não use nome, inicial, CPF ou telefone.");
        EditText search=input("search","Buscar por código","",1);LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);body.addView(list);
        Runnable populate=()-> {list.removeAllViews();String query=search.getText().toString().toUpperCase(Locale.ROOT);for(int i=0;i<clients().length();i++){JSONObject c=clients().optJSONObject(i);if(c.optString("code").contains(query)){Button b=button(c.optString("code")+(c.optBoolean("archived")?" · arquivado":"")+"\n"+c.optJSONArray("sessions").length()+" sessões",()->openClient(c.optString("id")),false);list.addView(b);}}};
        search.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){}public void onTextChanged(CharSequence s,int a,int b,int c){populate.run();}public void afterTextChanged(Editable e){}});populate.run();primary("Novo paciente",()->editClient(null));
    }
    void editClient(JSONObject existing) {
        selectedClient=existing==null?"":existing.optString("id");selectedSession="";
        screen(existing==null?"Novo paciente":"Editar paciente",true);
        input("code","Código • CL-001",existing==null?"":existing.optString("code"),1);
        input("next","Próxima sessão • AAAA-MM-DD",existing==null?"":existing.optString("next"),1);
        input("formulation","Formulação cumulativa • observação / hipótese / lacuna",existing==null?"":existing.optString("formulation"),5);
        note("O código reduz exposição, mas o texto clínico continua confidencial.");
        primary("Salvar paciente",()-> {
            String code=value("code").toUpperCase(Locale.ROOT),next=value("next");
            if(!Rules.validCode(code)){error("Use 2–4 letras, hífen e 3–6 dígitos, como CL-001.");return;}
            if(!next.isEmpty()&&!Rules.validDate(next)){error("Data inválida. Use AAAA-MM-DD.");return;}
            for(int i=0;i<clients().length();i++){JSONObject c=clients().optJSONObject(i);if(c.optString("code").equals(code)&&c!=existing){error("Esse código já existe.");return;}}
            try {JSONObject c=existing==null?new JSONObject().put("id",UUID.randomUUID().toString()).put("sessions",new JSONArray()):existing;
                c.put("code",code).put("next",next).put("formulation",value("formulation"));if(existing==null)clients().put(c);data.remove("draft");draftType="";if(persist())openClient(c.optString("id"));}
            catch(Exception e){error("Falha ao salvar paciente.");}
        });draftType="client";
    }
    void openClient(String id) {
        selectedClient=id;selectedSession="";JSONObject c=client(id);if(c==null){patients();return;}screen(c.optString("code"),true);
        note(c.optBoolean("archived")?"Arquivado":"Acompanhamento ativo");
        if(!c.optString("next").isEmpty())note("Próxima sessão: "+c.optString("next"));
        action("Editar cadastro e formulação",()->editClient(c));
        if(!c.optString("formulation").isEmpty()) {space();body.addView(text("Formulação cumulativa",19,INK));note(c.optString("formulation"));}
        space();body.addView(text("Linha do tempo",20,INK));ArrayList<JSONObject> sessions=new ArrayList<>();JSONArray ss=c.optJSONArray("sessions");for(int i=0;i<ss.length();i++)sessions.add(ss.optJSONObject(i));sessions.sort((a,b)->b.optString("date").compareTo(a.optString("date")));
        if(sessions.isEmpty())note("A primeira sessão começa com um registro. A interpretação é sua.");
        for(JSONObject s:sessions)action(s.optString("date")+" · "+(s.optBoolean("reviewed")?"revisado":"rascunho"),()->sessionMenu(c,s));
        action(c.optBoolean("archived")?"Reativar paciente":"Arquivar paciente",()-> {try{c.put("archived",!c.optBoolean("archived"));if(persist())openClient(id);}catch(Exception e){error("Falha ao arquivar.");}});
        action("Excluir paciente e sessões",()->confirm("Excluir permanentemente?","O paciente e todas as sessões serão removidos deste cofre. Backups anteriores continuam existindo.",()-> {JSONArray next=new JSONArray();for(int i=0;i<clients().length();i++)if(clients().optJSONObject(i)!=c)next.put(clients().optJSONObject(i));try{data.put("clients",next);data.remove("draft");if(persist())patients();}catch(Exception e){error("Falha ao excluir.");}}));
        primary("Registrar sessão",()->editSession(c,null));
    }
    void sessionMenu(JSONObject c,JSONObject s) {
        selectedClient=c.optString("id");selectedSession=s.optString("id");screen(s.optString("date"),true);note(c.optString("code")+"  ·  "+(s.optBoolean("reviewed")?"revisado pelo terapeuta":"rascunho clínico"));
        action("Dossiê • quatro camadas",()->readDossier(c,s));action("Roteiro para próxima sessão",()->readRoadmap(c,s));
        action("Exportar dossiê PDF",()->export(c,s,false,"pdf"));action("Exportar dossiê Word",()->export(c,s,false,"docx"));
        action("Exportar roteiro PDF",()->export(c,s,true,"pdf"));action("Exportar roteiro Word",()->export(c,s,true,"docx"));
        action(s.optBoolean("reviewed")?"Voltar ao status rascunho":"Marcar como revisado",()-> {try{s.put("reviewed",!s.optBoolean("reviewed"));if(persist())sessionMenu(c,s);}catch(Exception e){error("Falha ao marcar revisão.");}});
        action("Excluir esta sessão",()->confirm("Excluir sessão?","A exclusão não altera documentos ou backups já exportados.",()-> {JSONArray list=c.optJSONArray("sessions"),next=new JSONArray();for(int i=0;i<list.length();i++)if(list.optJSONObject(i)!=s)next.put(list.optJSONObject(i));try{c.put("sessions",next);data.remove("draft");if(persist())openClient(c.optString("id"));}catch(Exception e){error("Falha ao excluir.");}}));
        primary("Editar sessão",()->editSession(c,s));
    }
    void editSession(JSONObject c,JSONObject s) {
        selectedClient=c.optString("id");selectedSession=s==null?"":s.optString("id");screen(s==null?"Registro de sessão":"Editar sessão",true);note(c.optString("code")+"  ·  rascunho salvo no cofre durante a edição");
        input("date","Data da sessão • AAAA-MM-DD",s==null?LocalDate.now().toString():s.optString("date"),1);
        input("transcript","Transcrição / notas • texto confidencial",s==null?"":s.optString("transcript"),5);
        action("Importar TXT ou Markdown",()->pick("text"));
        note("Sem análise automática. Registre hipóteses como hipóteses e anote os trechos que as sustentam.");
        for(int i=0;i<4;i++)input("layer"+i,LAYERS[i],s==null?"":s.optString("layer"+i),3);
        input("evidence","Evidências, alternativas e lacunas",s==null?"":s.optString("evidence"),3);
        body.addView(text("Próxima sessão",22,GREEN));for(int i=0;i<5;i++)input("road"+i,ROAD[i],s==null?"":s.optString("road"+i),3);
        primary("Salvar sessão",()-> {
            if(!Rules.validDate(value("date"))){error("Data inválida. Use AAAA-MM-DD.");return;}
            if(value("transcript").isEmpty()){error("Adicione ao menos uma nota da sessão.");return;}
            try{JSONObject record=s==null?new JSONObject().put("id",UUID.randomUUID().toString()):s;for(String k:fields.keySet())record.put(k,value(k));record.put("reviewed",false);if(s==null)c.optJSONArray("sessions").put(record);data.remove("draft");draftType="";if(persist())sessionMenu(c,record);}catch(Exception e){error("Falha ao salvar sessão.");}
        });draftType="session";
    }
    void resumeDraft() {
        JSONObject d=data.optJSONObject("draft");if(d==null)return;String type=d.optString("type");JSONObject c=client(d.optString("clientId"));
        if(type.equals("client"))editClient(c);else if(type.equals("session")&&c!=null)editSession(c,session(c,d.optString("sessionId")));else if(type.equals("study")){JSONObject study=null;JSONArray studies=data.optJSONArray("studies");for(int i=0;i<studies.length();i++)if(studies.optJSONObject(i).optString("id").equals(d.optString("sessionId")))study=studies.optJSONObject(i);editStudy(study);}else{data.remove("draft");persist();render();return;}
        JSONObject values=d.optJSONObject("values");if(values!=null)for(String k:fields.keySet())if(values.has(k))fields.get(k).setText(values.optString(k));
    }
    void readDossier(JSONObject c,JSONObject s) {
        screen("Dossiê funcional",true);note(c.optString("code")+" · "+s.optString("date")+" · "+(s.optBoolean("reviewed")?"revisado":"rascunho"));
        for(int i=0;i<4;i++){space();body.addView(text((i+1)+". "+LAYERS[i],20,INK));note(s.optString("layer"+i).isEmpty()?"Ainda não preenchido":s.optString("layer"+i));}
        space();body.addView(text("Evidências e lacunas",20,INK));note(s.optString("evidence","Ainda não preenchido"));primary("Voltar à sessão",()->sessionMenu(c,s));
    }
    void readRoadmap(JSONObject c,JSONObject s) {
        screen("Roteiro pré-sessão",true);note(c.optString("code")+" · baseado em "+s.optString("date"));
        for(int i=0;i<5;i++){space();body.addView(text(ROAD[i],20,INK));note(s.optString("road"+i).isEmpty()?"Ainda não preenchido":s.optString("road"+i));}primary("Voltar à sessão",()->sessionMenu(c,s));
    }
    void studies() {
        screen("Estudos",true);note("Biblioteca local de textos. Busca por título ou conteúdo; sem busca semântica.");
        action("Guia de formulação • AF / RFT / ACT",this::guide);
        EditText q=input("query","Buscar na biblioteca","",1);LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);body.addView(list);
        Runnable show=()->{list.removeAllViews();JSONArray ss=data.optJSONArray("studies");String term=q.getText().toString().toLowerCase(Locale.ROOT);for(int i=0;i<ss.length();i++){JSONObject s=ss.optJSONObject(i);if((s.optString("title")+s.optString("content")).toLowerCase(Locale.ROOT).contains(term))list.addView(button(s.optString("title"),()->studyView(s),false));}};
        q.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int c,int f){}public void onTextChanged(CharSequence s,int a,int b,int c){show.run();}public void afterTextChanged(Editable e){}});show.run();primary("Adicionar texto de estudo",()->editStudy(null));
    }
    void guide() {
        screen("Formulação, com contexto",true);
        note("Perguntas de apoio para preenchimento manual; não são diagnóstico nem recomendação automática.");
        String[] h={"1 / O que foi observado?","2 / Qual função é plausível?","3 / O que a linguagem está fazendo?","4 / Qual ação vale a pena?"};
        String[] p={"Separe relato, observação direta e inferência. Cite trecho e contexto; identifique o que ainda falta investigar.","Descreva antecedente, respostas públicas/privadas e consequências imediatas e posteriores. Alívio não prova, por si só, reforçamento negativo. Considere explicações alternativas.","Investigue relações verbais e governança por regras: pliance, tracking e augmenting. Relacione processos ACT à função no contexto. Evite inferir CCR1/CCR2 apenas de narrativa fora da sessão.","Defina comportamento observável, contexto, critério de acompanhamento e valor relevante. Registre acordos, perguntas para testar hipóteses e condições para mudar a formulação."};
        for(int i=0;i<4;i++){space();body.addView(text(h[i],20,INK));note(p[i]);}primary("Voltar aos estudos",this::studies);
    }
    void studyView(JSONObject s) {screen(s.optString("title"),true);note(s.optString("reference"));space();note(s.optString("content"));action("Editar texto",()->editStudy(s));action("Excluir texto",()->confirm("Excluir estudo?","O texto será removido do cofre.",()->{JSONArray ss=data.optJSONArray("studies"),next=new JSONArray();for(int i=0;i<ss.length();i++)if(ss.optJSONObject(i)!=s)next.put(ss.optJSONObject(i));try{data.put("studies",next);if(persist())studies();}catch(Exception e){error("Falha ao excluir.");}}));primary("Voltar à biblioteca",this::studies);}
    void editStudy(JSONObject s) {
        selectedClient="";selectedSession=s==null?"":s.optString("id");screen("Texto de estudo",true);input("title","Título",s==null?"":s.optString("title"),1);input("reference","Referência bibliográfica",s==null?"":s.optString("reference"),2);input("content","Texto / suas notas",s==null?"":s.optString("content"),6);action("Importar TXT ou Markdown",()->pick("study"));
        primary("Salvar estudo",()->{if(value("title").isEmpty()||value("content").isEmpty()){error("Preencha título e texto.");return;}try{JSONObject item=s==null?new JSONObject().put("id",UUID.randomUUID().toString()):s;for(String k:fields.keySet())item.put(k,value(k));if(s==null)data.optJSONArray("studies").put(item);data.remove("draft");draftType="";if(persist())studies();}catch(Exception e){error("Falha ao salvar estudo.");}});draftType="study";
    }
    void settings() {
        screen("Seu cofre",true);note("AES-256-GCM · senha pessoal · sem permissão de Internet");
        space();note("Faça backup antes de trocar de aparelho ou desinstalar. A senha é necessária para restaurar. Guarde o backup em local protegido.");
        action("Salvar backup criptografado",()-> {try{pendingBytes=readEnvelope(vault);createFile("backup","application/octet-stream","clinica-backup.ccvault");}catch(Exception e){error("Não foi possível preparar o backup.");}});
        action("Restaurar backup",this::chooseRecovery);
        if(exists(previousVault)) {
            action("Desfazer última restauração",this::choosePrevious);
            action("Descartar cópia anterior",()->confirm("Apagar cópia anterior?","Remove permanentemente a cópia local usada para desfazer a restauração. O cofre atual e backups exportados não serão alterados.",()->{previousVault.delete();if(exists(previousVault)){error("Não foi possível remover a cópia anterior.");}else{settings();message("Cópia anterior removida.");}}));
        }
        space();body.addView(text("Limites desta versão",20,INK));
        note("Preenchimento e revisão manual. Sem modelo de IA, transcrição de áudio, Gmail, Calendar, Drive ou sincronização NotebookLM. Não há promessa de anonimização automática nem conformidade jurídica certificada.");
        note("PDF e Word saem sem criptografia somente quando você escolhe exportar. A pasta escolhida pode ser sincronizada por outro aplicativo. Evite destinos externos para material identificável.");
        primary("Travar cofre",this::lock);
    }
    void confirm(String title,String text,Runnable run) {new AlertDialog.Builder(this).setTitle(title).setMessage(text).setNegativeButton("Cancelar",null).setPositiveButton("Continuar",(d,w)->run.run()).show();}
    void pick(String mode) {
        pendingMode=mode;picker=true;saveDraft();Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mode.equals("backup")?"*/*":"text/*");i.putExtra(Intent.EXTRA_LOCAL_ONLY,true);startActivityForResult(i,10);
    }
    void createFile(String mode,String mime,String name) {pendingMode=mode;picker=true;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime);i.putExtra(Intent.EXTRA_TITLE,name);i.putExtra(Intent.EXTRA_LOCAL_ONLY,true);startActivityForResult(i,11);}
    static byte[] readLimited(InputStream in,int max) throws Exception {try(InputStream stream=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){if(stream==null)throw new IOException();byte[] buffer=new byte[8192];int n;while((n=stream.read(buffer))!=-1){if(out.size()+n>max)throw new IOException("Arquivo muito grande");out.write(buffer,0,n);}return out.toByteArray();}}
    @Override protected void onActivityResult(int req,int result,Intent i) {
        super.onActivityResult(req,result,i);picker=false;
        if((data==null&&!(req==10&&pendingMode.equals("backup")))||result!=RESULT_OK||i==null){pendingBytes=null;return;}
        try {
            Uri uri=i.getData();if(uri==null)throw new IOException();
            if(req==11){if(pendingBytes==null)throw new IOException();try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){if(out==null)throw new IOException();out.write(pendingBytes);}pendingBytes=null;message("Arquivo salvo no destino escolhido.");}
            else if(req==10){byte[] bytes=readLimited(getContentResolver().openInputStream(uri),pendingMode.equals("backup")?VaultCrypto.MAX_BYTES+56:512*1024);
                if(pendingMode.equals("backup"))restore(bytes);
                else {String txt=Rules.normalizeText(new String(bytes,StandardCharsets.UTF_8));EditText target=fields.get(pendingMode.equals("study")?"content":"transcript");if(target!=null)target.setText(txt);saveDraft();message("Texto importado. Revise o conteúdo antes de salvar.");}
            }
        }catch(Exception e){pendingBytes=null;error("Arquivo inválido, grande demais ou inacessível. Nenhum registro foi restaurado.");}
    }
    static boolean exists(AtomicFile file) {
        return file.getBaseFile().exists() || new File(file.getBaseFile()+".bak").exists();
    }
    boolean hasVault() { return exists(vault); }
    static byte[] readEnvelope(AtomicFile file) throws Exception {
        return readLimited(file.openRead(),VaultCrypto.MAX_BYTES+56);
    }
    static void writeEnvelope(AtomicFile file,byte[] bytes) throws Exception {
        FileOutputStream out=null;
        try {out=file.startWrite();out.write(bytes);out.getFD().sync();file.finishWrite(out);out=null;if(!Arrays.equals(bytes,readEnvelope(file)))throw new IOException("Persisted envelope mismatch");}
        catch(Exception e){if(out!=null)file.failWrite(out);throw e;}
    }
    void chooseRecovery() {
        confirm("Substituir cofre por um backup?", "Os registros serão substituídos só após validar o arquivo e sua senha. O cofre atual ficará como uma cópia criptografada no aparelho para desfazer a última restauração. A senha do backup passará a abrir o cofre.",()->pick("backup"));
    }
    void choosePrevious() {
        confirm("Desfazer última restauração?", "Abre a cópia anterior com a senha que ela usava. O cofre atual ficará guardado como a nova cópia anterior. Se a cópia estiver danificada, nada será substituído.",()-> {
            try {restore(readEnvelope(previousVault));}
            catch(Exception e){error("Não foi possível ler a cópia anterior. O cofre atual foi preservado.");}
        });
    }
    static final class RecoveryCandidate {
        final JSONObject data;
        final byte[] key,salt,envelope;
        RecoveryCandidate(JSONObject d,byte[] k,byte[] s,byte[] e){data=d;key=k;salt=s;envelope=e;}
    }
    static RecoveryCandidate prepareRecovery(byte[] bytes,char[] password) throws Exception {
        byte[] recoveryKey=null,plain=null;
        try {
            byte[] recoverySalt=VaultCrypto.salt(bytes);
            recoveryKey=VaultCrypto.derive(password,recoverySalt);
            plain=VaultCrypto.decrypt(bytes,recoveryKey);
            JSONObject restored=parseData(plain);
            return new RecoveryCandidate(restored,recoveryKey,recoverySalt,VaultCrypto.encrypt(plain,recoveryKey,recoverySalt));
        }catch(Exception e){if(recoveryKey!=null)Arrays.fill(recoveryKey,(byte)0);throw e;}
        finally{Arrays.fill(password,'\0');if(plain!=null)Arrays.fill(plain,(byte)0);}
    }
    void commitRecovery(RecoveryCandidate candidate) throws Exception {
        byte[] current=null;boolean replacing=false;
        try {
            // Snapshot before replacing; validate persistence before changing in-memory keys.
            if(hasVault()){current=readEnvelope(vault);writeEnvelope(previousVault,current);}
            replacing=true;writeEnvelope(vault,candidate.envelope);
            if(key!=null)Arrays.fill(key,(byte)0);
            key=candidate.key;salt=candidate.salt;data=candidate.data;broken=false;
            draftType="";fields.clear();
        }catch(Exception e){
            if(replacing&&current!=null){try{writeEnvelope(vault,current);}catch(Exception rollbackFailure){e.addSuppressed(rollbackFailure);}}
            Arrays.fill(candidate.key,(byte)0);throw e;
        }
    }
    void startRecovery(byte[] bytes,char[] password) {
        if(busy){Arrays.fill(password,'\0');message("Aguarde a operação atual.");return;}
        saveDraft();
        screen("Restaurando cofre",false);
        note("Validando o backup. Os registros atuais só serão substituídos quando a validação terminar.");
        primary("Cancelar restauração",this::lock);
        busy=true;final int epoch=unlockEpoch;
        new Thread(()-> {
            RecoveryCandidate candidate=null;Exception failure=null;
            try{candidate=prepareRecovery(bytes,password);}catch(Exception e){failure=e;}
            final RecoveryCandidate ready=candidate;final Exception failed=failure;
            runOnUiThread(()-> {
                if(epoch!=unlockEpoch){if(ready!=null)Arrays.fill(ready.key,(byte)0);return;}
                busy=false;
                if(failed!=null){lock();error("Senha incorreta ou backup inválido. Nenhum registro foi substituído.");return;}
                try{commitRecovery(ready);route="Hoje";render();message("Backup restaurado. Use a senha deste backup para abrir o cofre.");}catch(Exception e){lock();error("Não foi possível concluir a restauração. Reabra o cofre; a cópia anterior também pode ser usada para recuperar os registros.");}
            });
        }).start();
    }
    void restore(byte[] bytes) {
        try{VaultCrypto.salt(bytes);}catch(Exception e){error("Backup inválido. O cofre atual foi preservado.");return;}
        EditText p=new EditText(this);p.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
        p.setSaveEnabled(false);p.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        p.setContentDescription("Senha do backup");
        new AlertDialog.Builder(this).setTitle("Senha do backup").setMessage("Digite a senha usada para criar este backup. Ela passará a abrir o cofre restaurado.").setView(p)
            .setNegativeButton("Cancelar",null).setPositiveButton("Restaurar",(dialog,which)->{char[] pass=p.getText().toString().toCharArray();p.setText("");startRecovery(bytes,pass);}).show();
    }
    String document(JSONObject c,JSONObject s,boolean roadmap) {
        StringBuilder t=new StringBuilder(roadmap?"ROTEIRO PARA PRÓXIMA SESSÃO":"DOSSIÊ FUNCIONAL • QUATRO CAMADAS");
        t.append("\nPaciente: ").append(c.optString("code")).append("\nSessão base: ").append(s.optString("date")).append("\nStatus: ").append(s.optBoolean("reviewed")?"revisado pelo terapeuta":"rascunho não revisado").append("\nPreenchimento manual • uso clínico confidencial\n");
        String[] headings=roadmap?ROAD:LAYERS;for(int n=0;n<headings.length;n++)t.append("\n").append(n+1).append(". ").append(headings[n]).append("\n").append(s.optString((roadmap?"road":"layer")+n,"Não preenchido")).append("\n");
        if(!roadmap)t.append("\nEvidências, alternativas e lacunas\n").append(s.optString("evidence"));return t.toString();
    }
    void export(JSONObject c,JSONObject s,boolean roadmap,String type) {
        confirm("Exportar documento confidencial?","O arquivo "+type.toUpperCase(Locale.ROOT)+" será legível sem a senha. Escolha um destino local protegido. Transcrição bruta não é incluída.",()-> {
            try{String text=document(c,s,roadmap);pendingBytes=type.equals("docx")?Docx.create(text):pdf(text);createFile("document",type.equals("pdf")?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",(roadmap?"roteiro":"dossie")+"-"+s.optString("date")+"."+type);}catch(Exception e){error("Não foi possível gerar o documento.");}
        });
    }
    static byte[] pdf(String text) throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();PdfDocument doc=new PdfDocument();try {
            Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setColor(INK);paint.setTextSize(11);paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));
            int number=1;PdfDocument.Page page=doc.startPage(new PdfDocument.PageInfo.Builder(595,842,number).create());float y=50;
            for(String paragraph:text.split("\n",-1)) {
                ArrayList<String> wrapped=new ArrayList<>();String remaining=paragraph;
                if(remaining.isEmpty())wrapped.add("");
                while(!remaining.isEmpty()) {int count=paint.breakText(remaining,true,495,null);if(count<=0)count=1;if(count<remaining.length()){int space=remaining.lastIndexOf(' ',count-1);if(space>0)count=space;}wrapped.add(remaining.substring(0,count));remaining=remaining.substring(count).replaceFirst("^ +", "");}
                for(String line:wrapped){if(y>782){page.getCanvas().drawText("Clínica • "+number,50,810,paint);doc.finishPage(page);number++;page=doc.startPage(new PdfDocument.PageInfo.Builder(595,842,number).create());y=50;}page.getCanvas().drawText(line,50,y,paint);y+=16;}
            }
            page.getCanvas().drawText("Clínica • "+number,50,810,paint);doc.finishPage(page);doc.writeTo(out);
        }finally{doc.close();}return out.toByteArray();
    }
    @Override protected void onPause(){saveDraft();privacyHandler.postDelayed(()->{picker=false;lock();},120000);super.onPause();}
    @Override protected void onResume(){super.onResume();privacyHandler.removeCallbacksAndMessages(null);}
    @Override protected void onStop(){super.onStop();if(!picker)lock();}
    @Override public void onBackPressed(){saveDraft();if(data==null){super.onBackPressed();return;}route="Hoje";render();}
}
