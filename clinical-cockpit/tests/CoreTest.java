import com.andrefiker.clinicalcockpit.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import java.io.*;
public class CoreTest {
    static int tests;
    static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);tests++;System.out.println("PASS "+name);}
    public static void main(String[] args)throws Exception{
        check(Rules.validCode("CL-001"),"opaque code");check(!Rules.validCode("Andre F."),"real names rejected");check(!Rules.validCode("CL-001\n"),"code exact match");
        check(Rules.validDate("2024-02-29"),"leap year");check(!Rules.validDate("2026-02-29"),"non leap date rejected");check(!Rules.validDate("2026-04-31"),"invalid day rejected");check(!Rules.validDate("7/10/2026"),"date format");
        check(Rules.xml("<&\"'").equals("&lt;&amp;&quot;&apos;"),"XML escaping");check(Rules.normalizeText("a\r\nb\r\0").equals("a\nb\n"),"text normalization");
        byte[] salt=VaultCrypto.randomSalt(), key=VaultCrypto.derive("test password 123".toCharArray(),salt),raw="Dossiê sintético • observação".getBytes(StandardCharsets.UTF_8);
        byte[] encrypted=VaultCrypto.encrypt(raw,key,salt);
        check(Arrays.equals(raw,VaultCrypto.decrypt(encrypted,key)),"authenticated roundtrip");
        check(!Arrays.equals(encrypted,VaultCrypto.encrypt(raw,key,salt)),"fresh random IV");
        check(!new String(encrypted,StandardCharsets.UTF_8).contains("sintético"),"plaintext absent in envelope");
        boolean failed=false;try{VaultCrypto.decrypt(encrypted,VaultCrypto.derive("wrong password".toCharArray(),salt));}catch(Exception e){failed=true;}check(failed,"wrong password rejected");
        byte[] tampered=encrypted.clone();tampered[tampered.length-1]^=1;failed=false;try{VaultCrypto.decrypt(tampered,key);}catch(Exception e){failed=true;}check(failed,"tamper rejected");
        tampered=encrypted.clone();tampered[8]^=1;failed=false;try{VaultCrypto.decrypt(tampered,key);}catch(Exception e){failed=true;}check(failed,"header authenticated");
        failed=false;try{VaultCrypto.salt(new byte[100]);}catch(Exception e){failed=true;}check(failed,"unknown format rejected");
        check(VaultCrypto.decrypt(VaultCrypto.encrypt(new byte[0],key,salt),key).length==0,"empty envelope valid");
        byte[] doc=Docx.create("Dossiê < & >\nAção • hipótese\nlinha");Map<String,String> parts=new HashMap<>();try(ZipInputStream z=new ZipInputStream(new ByteArrayInputStream(doc))){ZipEntry e;while((e=z.getNextEntry())!=null)parts.put(e.getName(),new String(z.readAllBytes(),StandardCharsets.UTF_8));}
        check(parts.size()==3&&parts.containsKey("word/document.xml"),"DOCX required parts");
        check(parts.get("word/document.xml").contains("&lt; &amp; &gt;")&&parts.get("word/document.xml").contains("Ação • hipótese"),"DOCX unicode and escaping");
        javax.xml.parsers.DocumentBuilder builder=javax.xml.parsers.DocumentBuilderFactory.newInstance().newDocumentBuilder();for(String xml:parts.values())builder.parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));check(true,"DOCX XML parses");
        new File("dist").mkdirs();try(FileOutputStream out=new FileOutputStream("dist/synthetic-test.docx")){out.write(doc);}System.out.println(tests+" checks passed");
    }
}
