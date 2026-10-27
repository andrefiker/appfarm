package com.andrefiker.minesweeper;
import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.view.HapticFeedbackConstants;
public class MainActivity extends Activity {
 private WebView web;
 @Override public void onCreate(Bundle state) { super.onCreate(state);
  getWindow().setStatusBarColor(0xff152334); getWindow().setNavigationBarColor(0xff152334);
  web=new WebView(this); web.setBackgroundColor(0xff152334);
  web.getSettings().setJavaScriptEnabled(true); web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(true); web.getSettings().setAllowContentAccess(false);
  web.getSettings().setBlockNetworkLoads(true);
  web.addJavascriptInterface(new Object(){@JavascriptInterface public void pulse(){runOnUiThread(()->web.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS));}},"Native");
  web.setWebViewClient(new WebViewClient());
  if(android.os.Build.VERSION.SDK_INT>=35){web.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});}
  setContentView(web); web.loadUrl("file:///android_asset/index.html");
 }
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.pauseGame && window.pauseGame()",null);web.onPause();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.resumeGame && window.resumeGame()",null);}}
 @Override public void onBackPressed(){web.evaluateJavascript("window.closePanel && window.closePanel()",null);}
}
