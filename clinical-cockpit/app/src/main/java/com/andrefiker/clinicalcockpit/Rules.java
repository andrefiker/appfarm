package com.andrefiker.clinicalcockpit;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.util.regex.Pattern;
public final class Rules {
    private static final Pattern CODE = Pattern.compile("[A-Z]{2,4}-[0-9]{3,6}");
    public static boolean validCode(String s) { return CODE.matcher(s).matches(); }
    public static boolean validDate(String s) {
        try { LocalDate.parse(s, DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT)); return s.length() == 10; }
        catch (Exception e) { return false; }
    }
    public static String xml(String s) { return s.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;"); }
    public static String normalizeText(String s) { return s.replace("\r\n", "\n").replace('\r', '\n').replace("\u0000", ""); }
}
