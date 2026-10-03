package com.andrefiker.prismfall;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Offline WebView shell for Prismfall. The game is bundled in the APK's assets and served
 * from a fixed https origin (so localStorage saves persist); every other URL is refused.
 * The app requests no INTERNET permission.
 */
public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ENTRY_URL = "https://appassets.androidplatform.net/assets/index.html";
    private WebView web;

    /** Small bridge used by the game for haptic feedback. */
    public final class Bridge {
        @JavascriptInterface public void vibrate(int ms) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            int d = Math.max(5, Math.min(200, ms));
            v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(255, 248, 238));
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setTextZoom(100);
        settings.setDefaultTextEncodingName("UTF-8");
        web.addJavascriptInterface(new Bridge(), "PrismfallAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return servePackagedAsset(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost());
            }
        });
        setContentView(web);
        immersive();
        if (state != null) web.restoreState(state);
        if (web.getUrl() == null) web.loadUrl(ENTRY_URL);
    }

    @SuppressWarnings("deprecation")
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private WebResourceResponse servePackagedAsset(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) return textResponse("Forbidden");
        String path = uri.getPath();
        if (path == null || path.equals("/") || path.equals("/assets/")) path = "/assets/index.html";
        if (!path.startsWith("/assets/") || path.contains("..") || path.contains("\\")) return textResponse("Not found");
        String assetPath = path.substring("/assets/".length());
        try {
            return new WebResourceResponse(mimeType(assetPath), "UTF-8", getAssets().open(assetPath));
        } catch (FileNotFoundException e) {
            return textResponse("Not found");
        } catch (Exception e) {
            return textResponse("Asset error");
        }
    }

    private WebResourceResponse textResponse(String message) {
        return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8)));
    }

    private String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js")) return "text/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override public void onBackPressed() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(window.PF && PF.androidBack) ? PF.androidBack() : 'exit'", new ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                if ("\"exit\"".equals(value) && !isFinishing()) finish();
            }
        });
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.PF && PF.androidPause && PF.androidPause();", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        immersive();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
