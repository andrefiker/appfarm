package com.andrefiker.impactlabcore;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.graphics.Color;
import android.view.ViewGroup;
import java.io.*;
import java.util.Collections;
public final class MainActivity extends Activity {
 private static final String HOST="impact-core.appfarm";
 private WebView web;
 @Override public void onCreate(Bundle state){super.onCreate(state);web=new WebView(this);web.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));web.setBackgroundColor(Color.rgb(233,231,223));web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);web.setVerticalScrollBarEnabled(false);web.setHorizontalScrollBarEnabled(false);setContentView(web);if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
 WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setSupportZoom(false);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
 web.setWebChromeClient(new WebChromeClient());web.setWebViewClient(new WebViewClient(){
 @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !HOST.equals(r.getUrl().getHost());}
 @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
 String p=r.getUrl().getPath();if(!HOST.equals(r.getUrl().getHost())||!"https".equals(r.getUrl().getScheme())||p==null||p.contains(".."))return blocked();
 if(p.equals("/"))p="/index.html";String mime=p.endsWith(".js")?"application/javascript":p.endsWith(".css")?"text/css":p.endsWith(".html")?"text/html":p.endsWith(".json")?"application/json":p.endsWith(".glb")?"model/gltf-binary":"text/plain";
 try{return new WebResourceResponse(mime,p.endsWith(".glb")?null:"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),getAssets().open("web"+p));}catch(IOException e){return blocked();}
 }});web.loadUrl("https://"+HOST+"/index.html");}
 private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
 @Override protected void onPause(){if(web!=null){web.onPause();web.pauseTimers();}super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
 @Override public void onBackPressed(){if(web==null){finish();return;}web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()",r->{if(!"true".equals(r))finish();});}
 @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.removeAllViews();web.destroy();web=null;}super.onDestroy();}
}
