package com.andrefiker.singularity;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** An offline, fullscreen renderer for bundled game assets. No network permissions. */
public final class MainActivity extends Activity {
    private WebView web;
    private void immersive() {
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        immersive();
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(2, 3, 11));
        web.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                return !"file".equalsIgnoreCase(req.getUrl().getScheme());
            }
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest req) {
                String scheme=req.getUrl().getScheme();
                if (!"file".equalsIgnoreCase(scheme) && !"data".equalsIgnoreCase(scheme)) {
                    return new android.webkit.WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
                }
                return null;
            }
        });
        setContentView(web);
        if(state==null)web.loadUrl("file:///android_asset/index.html");
        else web.restoreState(state);
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        if(web!=null)web.saveState(out);
        super.onSaveInstanceState(out);
    }
    @Override protected void onPause() {if(web!=null)web.onPause();super.onPause();}
    @Override protected void onResume(){super.onResume();immersive();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){
        if(web!=null){web.stopLoading();web.setWebChromeClient(null);web.setWebViewClient(null);web.destroy();web=null;}
        super.onDestroy();
    }
}
