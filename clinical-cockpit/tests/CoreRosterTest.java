import com.andrefiker.clinicalcockpit.PatientRoster;
import java.util.*;
public class CoreRosterTest {
    static int checks;
    static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);checks++;System.out.println("PASS "+name);}
    static void reject(Runnable r,String name){boolean bad=false;try{r.run();}catch(IllegalArgumentException e){bad=true;}check(bad,name);}
    public static void main(String[] args){
        String url="https://notebook.google.com/notebook/12345678-1234-1234-1234-123456789abc";
        check(PatientRoster.notebookUrl(url+"?authuser=1#section").equals(url),"Notebook link strips query and fragment");
        check(PatientRoster.notebookUrl(url.replace("notebook.google.com","notebooklm.google.com")).contains("notebooklm.google.com"),"legacy NotebookLM link accepted");
        reject(()->PatientRoster.notebookUrl("javascript:alert(1)"),"script link rejected");
        reject(()->PatientRoster.notebookUrl(url.replace("google.com","google.com.evil.test")),"spoofed host rejected");
        reject(()->PatientRoster.notebookUrl(url.replace("https://","https://user@")),"credential URL rejected");
        reject(()->PatientRoster.notebookUrl(url.replace("https:","http:")),"insecure URL rejected");
        reject(()->PatientRoster.notebookUrl(url.replace("12345678-1234-1234-1234-123456789abc","invalid")),"invalid notebook ID rejected");
        List<PatientRoster.Row> rows=PatientRoster.csv("\ufeffcode,next,notebookUrl,formulation,sourceReference\r\ncl-001,2026-10-08,"+url+",\"Texto, sintético\ncom \"\"aspas\"\"\",fonte fictícia\r\nCL-002,,,,\r\n");
        check(rows.size()==2&&rows.get(0).code().equals("CL-001"),"CSV BOM CRLF and code normalization");
        check(rows.get(0).formulation().equals("Texto, sintético\ncom \"aspas\""),"quoted multiline Unicode and escaped quotes");
        check(rows.get(1).next().isEmpty()&&rows.get(1).notebookUrl().isEmpty(),"unknown fields stay empty");
        check(PatientRoster.csv("code;next\nCL-001;2028-02-29\n").get(0).next().equals("2028-02-29"),"semicolon separator and valid leap date");
        reject(()->PatientRoster.csv("code,next\nCL-001,2026-02-29"),"invalid date rejects roster");
        reject(()->PatientRoster.csv("name\nSynthetic Name"),"identity columns rejected");
        reject(()->PatientRoster.csv("code,code\nCL-001,CL-002"),"duplicate header rejected");
        reject(()->PatientRoster.csv("code\nCL-001\ncl-001"),"duplicate normalized codes rejected");
        reject(()->PatientRoster.csv("code,next\nCL-001"),"wrong field count rejected");
        reject(()->PatientRoster.csv("code\n\"CL-001"),"unclosed quotes rejected");
        reject(()->PatientRoster.csv("code\n\"CL-001\"junk"),"trailing quote junk rejected");
        reject(()->PatientRoster.csv("code\n"),"empty roster rejected");
        StringBuilder many=new StringBuilder("code\n");for(int i=0;i<501;i++)many.append(String.format("CL-%03d\n",i));
        reject(()->PatientRoster.csv(many.toString()),"batch size bounded at 500");
        System.out.println(checks+" roster checks passed");
    }
}
