package com.andrefiker.clinicalcockpit;
import java.net.URI;
import java.util.*;

/** Strict local CSV import. Validation errors never echo clinical values. */
public final class PatientRoster {
    public static final int MAX_ROWS=500;
    public static final class Row {
        private final String code,next,notebookUrl,formulation,sourceReference;
        Row(String c,String n,String u,String f,String r){code=c;next=n;notebookUrl=u;formulation=f;sourceReference=r;}
        public String code(){return code;}public String next(){return next;}public String notebookUrl(){return notebookUrl;}
        public String formulation(){return formulation;}public String sourceReference(){return sourceReference;}
    }
    private static final Set<String> COLUMNS=Set.of("code","next","notebookUrl","formulation","sourceReference");
    public static String notebookUrl(String value) {
        if(value==null||value.isBlank())return "";
        try {URI u=new URI(value.trim());
            if(!"https".equals(u.getScheme())||!Set.of("notebooklm.google.com","notebook.google.com").contains(u.getHost())||u.getPort()!=-1||u.getUserInfo()!=null
                ||!u.getPath().matches("/notebook/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/?"))throw new IllegalArgumentException();
            return "https://"+u.getHost()+u.getPath().replaceAll("/$","");
        }catch(Exception e){throw new IllegalArgumentException("Link do Notebook inválido.");}
    }
    public static Row row(String code,String next,String link,String formulation,String reference) {
        code=code.trim().toUpperCase(Locale.ROOT);next=next.trim();
        if(!Rules.validCode(code))throw new IllegalArgumentException("Código inválido; use CL-001.");
        if(!next.isEmpty()&&!Rules.validDate(next))throw new IllegalArgumentException("Data inválida; use AAAA-MM-DD.");
        if(formulation.length()>100000||reference.length()>2000)throw new IllegalArgumentException("Campo excede o limite.");
        return new Row(code,next,notebookUrl(link),formulation.trim(),reference.trim());
    }
    public static List<Row> csv(String text) {
        if(text.startsWith("\ufeff"))text=text.substring(1);
        int newline=text.indexOf('\n');String first=newline<0?text:text.substring(0,newline);char separator=first.contains(";")?';':',';
        List<List<String>> records=parse(text,separator);if(records.size()<2)throw new IllegalArgumentException("Lista sem pacientes.");
        List<String> header=records.get(0);Set<String> seen=new HashSet<>();
        for(String h:header)if(!COLUMNS.contains(h)||!seen.add(h))throw new IllegalArgumentException("Cabeçalho inválido; use o modelo do app.");
        if(!seen.contains("code"))throw new IllegalArgumentException("A coluna code é obrigatória.");
        List<Row> rows=new ArrayList<>();Set<String> codes=new HashSet<>();
        for(int i=1;i<records.size();i++){
            List<String> values=records.get(i);if(values.size()==1&&values.get(0).isBlank())continue;
            if(values.size()!=header.size())throw new IllegalArgumentException("Quantidade de campos inválida na linha "+(i+1)+".");
            Map<String,String> m=new HashMap<>();for(int j=0;j<header.size();j++)m.put(header.get(j),values.get(j));
            Row row=row(m.get("code"),m.getOrDefault("next",""),m.getOrDefault("notebookUrl",""),m.getOrDefault("formulation",""),m.getOrDefault("sourceReference",""));
            if(!codes.add(row.code()))throw new IllegalArgumentException("Código repetido dentro da lista.");rows.add(row);
            if(rows.size()>MAX_ROWS)throw new IllegalArgumentException("Importe até 500 pacientes por vez.");
        }
        if(rows.isEmpty())throw new IllegalArgumentException("Lista sem pacientes.");return rows;
    }
    static List<List<String>> parse(String text,char separator) {
        List<List<String>> all=new ArrayList<>();List<String> fields=new ArrayList<>();StringBuilder field=new StringBuilder();boolean quoted=false,closed=false;
        for(int i=0;i<text.length();i++){
            char c=text.charAt(i);
            if(quoted){if(c=='"'){if(i+1<text.length()&&text.charAt(i+1)=='"'){field.append('"');i++;}else{quoted=false;closed=true;}}else field.append(c);continue;}
            if(c==separator){fields.add(field.toString());field.setLength(0);closed=false;}
            else if(c=='\n'||c=='\r'){if(c=='\r'&&i+1<text.length()&&text.charAt(i+1)=='\n')i++;fields.add(field.toString());field.setLength(0);all.add(fields);fields=new ArrayList<>();closed=false;}
            else if(c=='"'&&field.length()==0&&!closed)quoted=true;
            else{if(closed||c=='"')throw new IllegalArgumentException("Aspas inválidas no CSV.");field.append(c);}
            if(all.size()>MAX_ROWS+2)throw new IllegalArgumentException("Lista muito extensa.");
        }
        if(quoted)throw new IllegalArgumentException("Aspas não fechadas no CSV.");
        if(field.length()>0||!fields.isEmpty()||closed){fields.add(field.toString());all.add(fields);}return all;
    }
}
