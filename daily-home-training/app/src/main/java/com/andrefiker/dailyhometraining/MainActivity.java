package com.andrefiker.dailyhometraining;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.view.HapticFeedbackConstants;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.SharedPreferences;

public final class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(17, 19, 21));
        getWindow().setNavigationBarColor(Color.rgb(17, 19, 21));
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }

        FrameLayout safeFrame = new FrameLayout(this);
        safeFrame.setBackgroundColor(Color.rgb(17, 19, 21));
        safeFrame.setOnApplyWindowInsetsListener((view, insets) -> {
            int top, bottom;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                top = insets.getInsets(WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout()).top;
                bottom = insets.getInsets(WindowInsets.Type.navigationBars()).bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(0, top, 0, bottom);
            return insets;
        });

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(17, 19, 21));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        webView.addJavascriptInterface(new LocalLedger(), "LocalLedger");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return !(url.startsWith("file:///android_asset/") || url.startsWith("file:///android_res/"));
            }
        });
        safeFrame.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(safeFrame);
        webView.loadUrl("file:///android_asset/training.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private final class LocalLedger {
        private final SharedPreferences preferences = getSharedPreferences("daily-training", MODE_PRIVATE);

        @JavascriptInterface
        public String load() {
            return preferences.getString("ledger", "");
        }

        @JavascriptInterface
        public void save(String json) {
            if (json != null && json.length() <= 2000000) {
                preferences.edit().putString("ledger", json).commit();
            }
        }

        @JavascriptInterface
        public void tick() {
            if (webView != null) webView.post(() -> webView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP));
        }

        @JavascriptInterface
        public void goal() {
            if (webView != null) webView.post(() -> webView.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK));
        }

        @JavascriptInterface
        public void saved() {
            if (webView != null) webView.post(() -> webView.performHapticFeedback(
                    android.os.Build.VERSION.SDK_INT >= 30
                            ? HapticFeedbackConstants.CONFIRM
                            : HapticFeedbackConstants.CONTEXT_CLICK));
        }
    }
}
