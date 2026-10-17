package com.andrefiker.lunarlander;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;

public class MainActivity extends Activity {
    private WebView game;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(11,17,29));
        root.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(11,17,29));
        game.getSettings().setJavaScriptEnabled(true);
        game.getSettings().setDomStorageEnabled(true);
        game.getSettings().setAllowFileAccess(false);
        game.getSettings().setAllowContentAccess(false);
        game.getSettings().setAllowFileAccessFromFileURLs(false);
        game.getSettings().setAllowUniversalAccessFromFileURLs(false);
        game.getSettings().setMediaPlaybackRequiresUserGesture(true);
        game.getSettings().setSupportZoom(false);
        game.getSettings().setBuiltInZoomControls(false);
        game.getSettings().setDisplayZoomControls(false);
        game.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        game.setWebViewClient(new WebViewClient(){
            private boolean local(Uri uri) { return "file".equals(uri.getScheme()) && "/android_asset/index.html".equals(uri.getPath()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !local(request.getUrl()); }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (local(request.getUrl())) return null;
                return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
            }
        });
        root.addView(game,new FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        root.requestApplyInsets();
        game.loadUrl("file:///android_asset/index.html");
    }
    @Override protected void onPause() {
        if(game!=null){game.evaluateJavascript("window.dispatchEvent(new Event('blur'))",null);game.onPause();game.pauseTimers();}
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if(game!=null){game.resumeTimers();game.onResume();} }
    @Override public void onBackPressed() {
        game.evaluateJavascript("window.dispatchEvent(new Event('blur'))",null);
        new AlertDialog.Builder(this).setTitle("Close Lunar Lander?").setMessage("Your saved progress is kept. Close the game?")
            .setNegativeButton("Keep playing",(dialog,which)->dialog.dismiss()).setPositiveButton("Close",(dialog,which)->finish()).show();
    }
    @Override protected void onDestroy(){if(game!=null){game.stopLoading();game.destroy();game=null;}super.onDestroy();}
}
