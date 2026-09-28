package com.andrefiker.quietsolitaire;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.view.View;

import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ENTRY_URL = "https://appassets.androidplatform.net/assets/index.html";
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(23, 55, 47));
        getWindow().setNavigationBarColor(Color.rgb(16, 42, 36));

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(23, 55, 47));
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDefaultTextEncodingName("UTF-8");
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

        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return servePackagedAsset(request.getUrl());
            }
        });
        setContentView(web);
        web.loadUrl(ENTRY_URL);
    }

    private WebResourceResponse servePackagedAsset(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())) {
            return textResponse("Forbidden");
        }
        String path = uri.getPath();
        if (path == null || path.equals("/") || path.equals("/assets/")) path = "/assets/index.html";
        if (!path.startsWith("/assets/") || path.contains("..") || path.contains("\\")) {
            return textResponse("Not found");
        }
        // AssetManager paths are relative to the APK's assets/ root. The WebView
        // URL includes /assets/, but getAssets().open() must receive index.html.
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
        return new WebResourceResponse(
            "text/plain", "UTF-8",
            new ByteArrayInputStream(message.getBytes(StandardCharsets.UTF_8))
        );
    }

    private String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js")) return "text/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".webmanifest")) return "application/manifest+json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override public void onBackPressed() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript(
            "(function(){var m=document.getElementById('modal-backdrop');" +
            "if(m&&!m.classList.contains('hidden')){" +
            "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));return 'handled';}" +
            "return 'exit';})()",
            new ValueCallback<String>() {
                @Override public void onReceiveValue(String value) {
                    if ("\"exit\"".equals(value) && !isFinishing()) finish();
                }
            }
        );
    }

    @Override protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'));document.dispatchEvent(new Event('visibilitychange'));", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
