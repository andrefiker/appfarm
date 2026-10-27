package com.andrefiker.quietbubbles;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
public final class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(11,16,32));
  getWindow().setNavigationBarColor(Color.rgb(11,16,32));
  web = new WebView(this);
  web.setBackgroundColor(Color.rgb(11,16,32));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(true);
  web.getSettings().setAllowContentAccess(false);
  web.getSettings().setAllowFileAccessFromFileURLs(false);
  web.getSettings().setAllowUniversalAccessFromFileURLs(false);
  web.setWebViewClient(new WebViewClient());
  setContentView(web);
  web.loadUrl("file:///android_asset/index.html");
 }
 @Override protected void onPause() { if(web!=null){web.evaluateJavascript("if(typeof pause==='function'&&!paused)pause()",null);web.onPause();} super.onPause(); }
 @Override protected void onResume() {super.onResume();if(web!=null)web.onResume();}
 @Override public void onBackPressed(){web.evaluateJavascript("if(typeof pause==='function'&&!paused)pause();else if(typeof showMenu==='function')showMenu()",null);}
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
