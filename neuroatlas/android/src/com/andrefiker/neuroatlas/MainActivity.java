package com.andrefiker.neuroatlas;
import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.*;
import android.net.Uri;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
public final class MainActivity extends Activity {
 private WebView web;
 private static final String HOST="appassets.androidplatform.net";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  final FrameLayout root=new FrameLayout(this); root.setBackgroundColor(Color.rgb(11,21,28));
  web=new WebView(this); root.addView(web,new FrameLayout.LayoutParams(-1,-1)); setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}
   else {v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());}return insets;
  });root.requestApplyInsets();
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setBlockNetworkLoads(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportZoom(false);s.setTextZoom(Math.max(100,Math.min(200,(int)(100*getResources().getConfiguration().fontScale))));
  CookieManager.getInstance().setAcceptCookie(false);WebView.setWebContentsDebuggingEnabled(false);
  web.addJavascriptInterface(new Object(){@JavascriptInterface public void theme(final boolean light){runOnUiThread(()->{int c=light?Color.rgb(246,247,242):Color.rgb(11,21,28);root.setBackgroundColor(c);getWindow().setStatusBarColor(c);getWindow().setNavigationBarColor(c);int layout=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;getWindow().getDecorView().setSystemUiVisibility(layout|(light?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR:0));});}},"NativeTheme");
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !HOST.equals(r.getUrl().getHost());}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
    Uri u=r.getUrl();String p=u.getPath();
    if(!HOST.equals(u.getHost())||p==null||p.contains("..")||!"GET".equals(r.getMethod()))return denied();
    try {String n=p.equals("/")?"index.html":p.substring(1);String mime=n.endsWith(".css")?"text/css":n.endsWith(".js")?"application/javascript":n.endsWith(".svg")?"image/svg+xml":n.endsWith(".json")?"application/json":"text/html";return new WebResourceResponse(mime,"UTF-8",getAssets().open(n));}catch(Exception e){return denied();}
   }
  });
  web.loadUrl("https://"+HOST+"/index.html");
  if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->goBack());
 }
 private WebResourceResponse denied(){return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",new HashMap<String,String>(),new ByteArrayInputStream(new byte[0]));}
 private void goBack(){web.evaluateJavascript("window.Neuro ? window.Neuro.back() : false",value->{if(!"true".equals(value))finish();});}
 @Override public void onBackPressed(){goBack();}
 @Override protected void onPause(){web.onPause();web.pauseTimers();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("NativeTheme");web.destroy();}super.onDestroy();}
}
