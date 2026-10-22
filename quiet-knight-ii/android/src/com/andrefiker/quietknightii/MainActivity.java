// Recovered from the verified APK with JADX 1.5.3; synthetic captures repaired.
package com.andrefiker.quietknightii;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.util.HashMap;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView game;

    public boolean local(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPort() == -1;
    }

    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", new HashMap(), new ByteArrayInputStream(new byte[0]));
    }

    public WebResourceResponse asset(Uri uri) {
        if (!local(uri)) {
            return blocked();
        }
        String path = uri.getPath();
        if (path == null || path.contains("..") || path.contains("\\") || !path.startsWith("/")) {
            return blocked();
        }
        if (path.equals("/")) {
            path = "/index.html";
        }
        String str = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".wasm") ? "application/wasm" : "application/octet-stream";
        try {
            HashMap map = new HashMap();
            map.put("X-Content-Type-Options", "nosniff");
            map.put("Cache-Control", "no-cache");
            return new WebResourceResponse(str, "UTF-8", 200, "OK", map, getAssets().open(path.substring(1)));
        } catch (Exception e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not found", new HashMap(), new ByteArrayInputStream(new byte[0]));
        }
    }

    public final class LocalBridge {
        public LocalBridge() {
        }

        @JavascriptInterface
        public String readStore() {
            return MainActivity.this.getSharedPreferences("quiet-knight-ii", 0).getString("state", "");
        }

        @JavascriptInterface
        public String readBackup() {
            return MainActivity.this.getSharedPreferences("quiet-knight-ii", 0).getString("backup", "");
        }

        @JavascriptInterface
        public boolean writeStore(String str) {
            if (str == null || str.length() > 4000000) {
                return false;
            }
            SharedPreferences sharedPreferences = MainActivity.this.getSharedPreferences("quiet-knight-ii", 0);
            return sharedPreferences.edit().putString("backup", sharedPreferences.getString("state", "")).putString("state", str).commit();
        }

        @JavascriptInterface
        public void haptic() {
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override // java.lang.Runnable
                public final void run() {
                    LocalBridge.this.performHaptic();
                }
            });
        }

        void performHaptic() {
            if (MainActivity.this.game != null) {
                MainActivity.this.game.performHapticFeedback(4);
            }
        }

        @JavascriptInterface
        public void copyText(final String str) {
            if (str == null || str.length() > 100000) {
                return;
            }
            MainActivity.this.runOnUiThread(new Runnable() {
                @Override // java.lang.Runnable
                public final void run() {
                    LocalBridge.this.copyToClipboard(str);
                }
            });
        }

        void copyToClipboard(String str) {
            ((ClipboardManager) MainActivity.this.getSystemService("clipboard")).setPrimaryClip(ClipData.newPlainText("Quiet Knight II", str));
        }
    }

    @Override // android.app.Activity
    public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        FrameLayout frameLayout = new FrameLayout(this);
        frameLayout.setBackgroundColor(Color.rgb(16, 37, 30));
        frameLayout.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override // android.view.View.OnApplyWindowInsetsListener
            public final WindowInsets onApplyWindowInsets(View view, WindowInsets windowInsets) {
                return MainActivity.applyInsets(view, windowInsets);
            }
        });
        this.game = new WebView(this);
        this.game.setBackgroundColor(Color.rgb(16, 37, 30));
        WebSettings settings = this.game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(1);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(this.game, false);
        this.game.setOverScrollMode(2);
        this.game.addJavascriptInterface(new LocalBridge(), "Native");
        this.game.setWebChromeClient(new WebChromeClient() {
            @Override // android.webkit.WebChromeClient
            public void onPermissionRequest(PermissionRequest permissionRequest) {
                permissionRequest.deny();
            }
        });
        this.game.setWebViewClient(new WebViewClient() {
            @Override // android.webkit.WebViewClient
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest webResourceRequest) {
                return !MainActivity.this.local(webResourceRequest.getUrl());
            }

            @Override // android.webkit.WebViewClient
            public WebResourceResponse shouldInterceptRequest(WebView webView, WebResourceRequest webResourceRequest) {
                return MainActivity.this.asset(webResourceRequest.getUrl());
            }
        });
        frameLayout.addView(this.game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(frameLayout);
        frameLayout.requestApplyInsets();
        this.game.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    static WindowInsets applyInsets(View view, WindowInsets windowInsets) {
        view.setPadding(windowInsets.getSystemWindowInsetLeft(), windowInsets.getSystemWindowInsetTop(), windowInsets.getSystemWindowInsetRight(), windowInsets.getSystemWindowInsetBottom());
        return windowInsets.consumeSystemWindowInsets();
    }

    @Override // android.app.Activity
    protected void onPause() {
        if (this.game != null) {
            this.game.evaluateJavascript("window.onNativePause&&window.onNativePause()", null);
            this.game.onPause();
        }
        super.onPause();
    }

    @Override // android.app.Activity
    protected void onResume() {
        super.onResume();
        if (this.game != null) {
            this.game.onResume();
            this.game.evaluateJavascript("window.onNativeResume&&window.onNativeResume()", null);
        }
    }

    void confirmExit(String str) {
        if ("true".equals(str)) {
            return;
        }
        new AlertDialog.Builder(this).setTitle("Leave your table?").setMessage("Your position is saved. Return whenever you like.").setNegativeButton("Keep playing", new DialogInterface.OnClickListener() {
            @Override // android.content.DialogInterface.OnClickListener
            public final void onClick(DialogInterface dialogInterface, int i) {
                dialogInterface.dismiss();
            }
        }).setPositiveButton("Close", new DialogInterface.OnClickListener() {
            @Override // android.content.DialogInterface.OnClickListener
            public final void onClick(DialogInterface dialogInterface, int i) {
                MainActivity.this.closeGame(dialogInterface, i);
            }
        }).show();
    }

    void closeGame(DialogInterface dialogInterface, int i) {
        finish();
    }

    @Override // android.app.Activity
    public void onBackPressed() {
        if (this.game == null) {
            super.onBackPressed();
        } else {
            this.game.evaluateJavascript("window.onNativeBack&&window.onNativeBack()", new ValueCallback() {
                @Override // android.webkit.ValueCallback
                public final void onReceiveValue(Object obj) {
                    MainActivity.this.confirmExit((String) obj);
                }
            });
        }
    }

    @Override // android.app.Activity
    protected void onDestroy() {
        if (this.game != null) {
            this.game.removeJavascriptInterface("Native");
            this.game.stopLoading();
            this.game.destroy();
            this.game = null;
        }
        super.onDestroy();
    }
}
