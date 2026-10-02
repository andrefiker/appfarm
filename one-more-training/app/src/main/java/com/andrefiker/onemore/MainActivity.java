package com.andrefiker.onemore;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.HapticFeedbackConstants;
import android.widget.FrameLayout;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public final class MainActivity extends Activity {
 private WebView web;
 private FrameLayout frame;
 private String pendingExport;
 private final int EXPORT=71, IMPORT=72;
 private SharedPreferences prefs;
 @Override public void onCreate(Bundle saved) {
  super.onCreate(saved);
  prefs=getSharedPreferences("one-more",MODE_PRIVATE);
  pendingExport=prefs.getString("pending-export",null);
  if(android.os.Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  frame=new FrameLayout(this);
  frame.setBackgroundColor(Color.rgb(17,23,19));
  frame.setOnApplyWindowInsetsListener((v,insets)->{
   int l,t,r,b;
   if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());l=i.left;t=i.top;r=i.right;b=i.bottom;}
   else {l=insets.getSystemWindowInsetLeft();t=insets.getSystemWindowInsetTop();r=insets.getSystemWindowInsetRight();b=insets.getSystemWindowInsetBottom();}
   v.setPadding(l,t,r,b);return insets;
  });
  WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0);
  web=new WebView(this);web.setBackgroundColor(Color.rgb(17,23,19));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(true);settings.setAllowContentAccess(false);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);settings.setSupportZoom(false);settings.setBuiltInZoomControls(false);settings.setDisplayZoomControls(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.addJavascriptInterface(new Ledger(),"OneMore");web.setWebChromeClient(new WebChromeClient());
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return !req.getUrl().toString().startsWith("file:///android_asset/");}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){if(!req.getUrl().toString().startsWith("file:///android_asset/"))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));return null;}
  });
  frame.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(frame);web.loadUrl("file:///android_asset/index.html");
 }
 private void message(String text){web.post(()->web.evaluateJavascript("window.backupStatus("+JSONObject.quote(text)+")",null));}
 private final class Ledger {
  @JavascriptInterface public String load(){return prefs.getString("ledger","");}
  @JavascriptInterface public boolean save(String json){if(json==null||json.length()>10000000)return false;return prefs.edit().putString("ledger",json).commit();}
  @JavascriptInterface public void tick(){web.post(()->web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP));}
  @JavascriptInterface public void awake(boolean active){runOnUiThread(()->{if(active)getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);});}
  @JavascriptInterface public void appearance(boolean light){runOnUiThread(()->{int color=light?Color.rgb(243,245,237):Color.rgb(17,23,19);frame.setBackgroundColor(color);web.setBackgroundColor(color);getWindow().setStatusBarColor(color);getWindow().setNavigationBarColor(color);if(android.os.Build.VERSION.SDK_INT>=30){getWindow().getInsetsController().setSystemBarsAppearance(light?24:0,24);}else {int flags=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;if(light)flags|=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;getWindow().getDecorView().setSystemUiVisibility(flags);}});}
  @JavascriptInterface public void exportBackup(String json){if(json==null||json.length()>10000000)return;pendingExport=json;prefs.edit().putString("pending-export",json).commit();runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"ONE-MORE-backup.json");startActivityForResult(i,EXPORT);});}
  @JavascriptInterface public void importBackup(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");startActivityForResult(i,IMPORT);});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null)return;Uri uri=data.getData();new Thread(()->{try{
  if(request==EXPORT){if(pendingExport==null)throw new IOException("No backup ready");try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IOException("Cannot open file");out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}pendingExport=null;prefs.edit().remove("pending-export").commit();message("Backup exported.");}
  else if(request==IMPORT){ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=getContentResolver().openInputStream(uri)){if(in==null)throw new IOException("Cannot open file");byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1){out.write(buffer,0,count);if(out.size()>10000000)throw new IOException("Backup too large");}}String json=out.toString("UTF-8");web.post(()->web.evaluateJavascript("window.receiveBackup("+JSONObject.quote(json)+")",null));}
 }catch(Exception error){message("Could not open or save this backup.");}}).start();}
 @Override public void onBackPressed(){web.evaluateJavascript("window.androidBack()",result->{if("false".equals(result))moveTaskToBack(true);});}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("OneMore");web.destroy();}super.onDestroy();}
}
