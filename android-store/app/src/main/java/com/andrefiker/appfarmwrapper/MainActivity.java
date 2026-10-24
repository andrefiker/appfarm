package com.andrefiker.appfarmwrapper;

import android.app.Activity;
import android.content.Intent;
import org.json.JSONObject;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.WindowInsetsController;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.os.Build;
import android.view.WindowInsets;
import android.graphics.Insets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private boolean quietKnight() { return "quietKnight".equals(BuildConfig.FLAVOR); }
    private String launchUrl(Intent intent) {
        if (!quietKnight() || intent == null || intent.getData() == null) return BuildConfig.HOME_URL;
        Uri uri = intent.getData();
        if (!"quietknight".equals(uri.getScheme()) || !"join".equals(uri.getHost())) return BuildConfig.HOME_URL;
        String code = uri.getLastPathSegment();
        return code != null && code.matches("[A-Za-z0-9]{6}") ? BuildConfig.HOME_URL + "?room=" + code.toUpperCase(java.util.Locale.ROOT) : BuildConfig.HOME_URL;
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); if (quietKnight()) webView.loadUrl(launchUrl(intent)); }
    @Override protected void onResume() { super.onResume(); if (webView != null && quietKnight()) { webView.onResume(); webView.evaluateJavascript("window.dispatchEvent(new Event('qk-resume'))", null); } }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        webView = new WebView(this);
        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain("quiet-knight-server-production.up.railway.app")
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        if (quietKnight()) {
            int tableColor = Color.rgb(14, 25, 27);
            getWindow().setBackgroundDrawable(new ColorDrawable(tableColor));
            getWindow().getDecorView().setBackgroundColor(tableColor);
            getWindow().setStatusBarColor(tableColor);
            getWindow().setNavigationBarColor(tableColor);
            webView.setBackgroundColor(tableColor);
            FrameLayout safeRoot = new FrameLayout(this);
            safeRoot.setBackgroundColor(tableColor);
            safeRoot.addView(webView);
            if (Build.VERSION.SDK_INT >= 30) {
                // Own insets on Android 11+, including enforced edge-to-edge
                // on Android 15+. Keep the WebView inside the system bars.
                getWindow().setDecorFitsSystemWindows(false);
                safeRoot.setOnApplyWindowInsetsListener((view, insets) -> {
                    Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                    view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                    return WindowInsets.CONSUMED;
                });
            }
            setContentView(safeRoot);
            if (Build.VERSION.SDK_INT >= 30) {
                getWindow().getInsetsController().setSystemBarsAppearance(0,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                safeRoot.post(safeRoot::requestApplyInsets);
            }
        } else setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        if (quietKnight()) {
            settings.setTextZoom(Math.max(100, Math.min(200, Math.round(100 * getResources().getConfiguration().fontScale))));
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
            WebView.setWebContentsDebuggingEnabled(false);
        }
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " AppFarmAndroid/1.0");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                if (!quietKnight() || !url.startsWith(BuildConfig.HOME_URL)) return;
                try { JSONObject metadata = new JSONObject(); metadata.put("package", BuildConfig.APPLICATION_ID); metadata.put("version", BuildConfig.VERSION_NAME); metadata.put("code", BuildConfig.VERSION_CODE); metadata.put("commit", BuildConfig.SOURCE_COMMIT); view.evaluateJavascript("window.__QK_ANDROID=" + metadata.toString(), null); } catch (Exception ignored) { }
            }
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // Keep the current page when Android has no handler for a custom scheme.
                }
                return true;
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(launchUrl(getIntent()));
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onPause() {
        if (quietKnight()) { webView.evaluateJavascript("window.dispatchEvent(new Event('qk-background'))", null); webView.onPause(); }
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
