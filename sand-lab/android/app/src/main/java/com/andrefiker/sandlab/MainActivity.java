package com.andrefiker.sandlab;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.widget.FrameLayout;
import android.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends Activity {
 private WebView web;
 private String pendingExport;
 private final String origin="https://sandlab.local/";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(11,18,30));getWindow().setNavigationBarColor(Color.rgb(11,18,30));
  if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
  else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  web=new WebView(this);web.setBackgroundColor(Color.rgb(11,18,30));
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(11,18,30));
  root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  root.setOnApplyWindowInsetsListener((v,insets)->{
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(b.left,b.top,b.right,b.bottom);}
   else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets;
  });
  setContentView(root);root.requestApplyInsets();
  WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setTextZoom(100);s.setSupportZoom(false);s.setMediaPlaybackRequiresUserGesture(true);
  web.setOverScrollMode(View.OVER_SCROLL_NEVER);
  web.setWebChromeClient(new WebChromeClient());
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
    String url=r.getUrl().toString();
    if(url.startsWith(origin)&&r.getMethod().equals("GET")){
     String path=r.getUrl().getPath().substring(1);if(path.isEmpty())path="index.html";
     if(!path.contains("..")&&!path.contains("/"))try{
      String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".html")?"text/html":"application/octet-stream";
      return new WebResourceResponse(mime,"UTF-8",getAssets().open(path));
     }catch(IOException ignored){}
    }
    return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",null,new ByteArrayInputStream(new byte[0]));
   }
  });
  web.addJavascriptInterface(new Object(){
   @JavascriptInterface public void exportWorld(String data){if(data==null||data.length()>8000000)return;runOnUiThread(()->{
    pendingExport=data;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"sand-lab-world.json");try{startActivityForResult(i,41);}catch(Exception e){message("No document saver available");}
   });}
   @JavascriptInterface public void importWorld(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");try{startActivityForResult(i,42);}catch(Exception e){message("No document picker available");}});}
  },"Android");
  web.loadUrl(origin+"index.html");
 }
 private void message(String text){web.evaluateJavascript("window.nativeMessage && window.nativeMessage("+JSONObject.quote(text)+")",null);}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(result!=RESULT_OK||data==null||data.getData()==null){pendingExport=null;return;}
  if(request==41&&pendingExport!=null){final String export=pendingExport;pendingExport=null;new Thread(()->{try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(export.getBytes(StandardCharsets.UTF_8));runOnUiThread(()->message("World exported"));}catch(Exception e){runOnUiThread(()->message("Export failed"));}}).start();}
  if(request==42)new Thread(()->{try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] buf=new byte[8192];int n,total=0;while((n=in.read(buf))!=-1){total+=n;if(total>8000000)throw new IOException("File exceeds 8 MB");out.write(buf,0,n);}
   String text=new String(out.toByteArray(),StandardCharsets.UTF_8);runOnUiThread(()->web.evaluateJavascript("window.receiveWorld("+JSONObject.quote(text)+")",null));
  }catch(Exception e){runOnUiThread(()->message("Import failed: unreadable file or over 8 MB"));}}).start();
 }
 @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.appBackground && window.appBackground()",null);web.onPause();web.pauseTimers();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.resumeTimers();web.onResume();web.evaluateJavascript("window.appForeground && window.appForeground()",null);}}
 @Override public void onBackPressed(){web.evaluateJavascript("document.getElementById('panel').open && document.getElementById('panel').close()",null);}
 @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();web=null;}super.onDestroy();}
}
