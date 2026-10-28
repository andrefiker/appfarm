package com.andrefiker.towerstack;
import android.app.Activity;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.*;
import android.view.View;
import java.io.*;
import java.nio.charset.StandardCharsets;
public final class MainActivity extends Activity {
 private WebView web;
 private static final String ORIGIN="https://tower-stack.appfarm/";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);web=new WebView(this);web.setBackgroundColor(0xffece7db);web.setOverScrollMode(View.OVER_SCROLL_NEVER);setContentView(web);
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setSupportZoom(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
  web.addJavascriptInterface(new Object(){@JavascriptInterface public void pulse(){Vibrator v=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createOneShot(12,45));}},"AndroidHaptics");
  web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;} @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}});
  try(InputStream input=getAssets().open("tower-stack.html");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=input.read(b))!=-1)out.write(b,0,n);web.loadDataWithBaseURL(ORIGIN,out.toString(StandardCharsets.UTF_8.name()),"text/html","UTF-8",null);}catch(IOException e){throw new IllegalStateException("Offline assets missing",e);}
 }
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.pauseTower&&window.pauseTower()",null);web.onPause();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){if(web!=null)web.evaluateJavascript("window.pauseTower&&window.pauseTower()",null);}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("AndroidHaptics");web.destroy();web=null;}super.onDestroy();}
}
