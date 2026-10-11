package com.andrefiker.atendimentos;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.net.Uri;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public final class MainActivity extends Activity {
    private static final int OPEN_JSON = 41, SAVE_JSON = 42;
    private static final String HOME = "file:///android_asset/index.html";
    private static final Set<String> HOSTS = new HashSet<>(Arrays.asList(
        "drive.google.com", "docs.google.com", "meet.google.com", "notebooklm.google.com"));
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingJson;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        web = new WebView(this);
        web.setBackgroundColor(0xff0a0c10);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.toString().equals(HOME)) return false;
                openAllowedLink(uri);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try { startActivityForResult(intent, OPEN_JSON); }
                catch (Exception ex) { fileCallback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        if (state != null) web.restoreState(state);
        else web.loadUrl(HOME);
    }

    private void openAllowedLink(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !HOSTS.contains(uri.getHost())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (Exception ignored) { }
    }
    private final class Bridge {
        @JavascriptInterface public void openLink(String url) { runOnUiThread(() -> openAllowedLink(Uri.parse(url))); }
        @JavascriptInterface public void copyText(String text) {
            runOnUiThread(() -> ((ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE))
                .setPrimaryClip(ClipData.newPlainText("Atendimentos", text)));
        }
        @JavascriptInterface public void saveJson(String filename, String json) {
            if (json.length() > 2 * 1024 * 1024) return;
            runOnUiThread(() -> {
                pendingJson = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[^a-zA-Z0-9_.-]", "_"));
                try { startActivityForResult(intent, SAVE_JSON); }
                catch (Exception ex) { pendingJson = null; }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == OPEN_JSON) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(result == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null);
                fileCallback = null;
            }
        } else if (request == SAVE_JSON) {
            if (result == RESULT_OK && data != null && data.getData() != null && pendingJson != null) {
                try (OutputStream stream = getContentResolver().openOutputStream(data.getData())) {
                    if (stream != null) stream.write(pendingJson.getBytes(StandardCharsets.UTF_8));
                } catch (Exception ignored) { }
            }
            pendingJson = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle out) { web.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){const f=document.getElementById('modalFocus'),s=document.getElementById('modalSettings');if(f.classList.contains('open')){f.classList.remove('open');return true}if(s.classList.contains('open')){s.classList.remove('open');return true}return false})()", value -> {
            if (!"true".equals(value)) super.onBackPressed();
        });
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        web.destroy(); super.onDestroy();
    }
}
