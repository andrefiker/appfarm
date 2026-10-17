package com.andrefiker.trajectory;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Build;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import java.io.ByteArrayInputStream;

public final class MainActivity extends Activity {
 private WebView web;
 private static final String START="file:///android_asset/index.html";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(9,27,43));
  getWindow().setNavigationBarColor(Color.rgb(9,27,43));
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  web=new WebView(this);web.setBackgroundColor(Color.rgb(9,27,43));setContentView(web);
  web.setOnApplyWindowInsetsListener((view,insets)->{
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());}return insets;
  });web.requestApplyInsets();
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(true);s.setAllowContentAccess(false);s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);s.setBlockNetworkLoads(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportZoom(false);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setTextZoom(100);s.setMediaPlaybackRequiresUserGesture(true);
  web.setOverScrollMode(View.OVER_SCROLL_NEVER);web.setWebChromeClient(new WebChromeClient());
  web.addJavascriptInterface(new Object(){@JavascriptInterface public void haptic(int duration){runOnUiThread(()->{Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createOneShot(Math.max(1,Math.min(50,duration)),VibrationEffect.DEFAULT_AMPLITUDE));});}},"Android");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){String u=r.getUrl().toString();if(u.startsWith("file:///android_asset/"))return null;return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
  });web.loadUrl(START);
 }
 @Override public void onBackPressed(){web.evaluateJavascript("window.dispatchEvent(new Event('trajectoryPause'));",null);}
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('trajectoryPause'));",null);web.onPause();web.pauseTimers();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.resumeTimers();web.onResume();}}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.stopLoading();web.destroy();}super.onDestroy();}
}
