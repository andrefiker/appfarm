package com.andrefiker.quietpong;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
  private WebView web;
  private static final String ORIGIN = "https://quietpong.local/";
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    hideSystemUi();
    web = new WebView(this);
    web.setBackgroundColor(0xff090d10);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
    s.setAllowFileAccess(false); s.setAllowContentAccess(false); s.setMediaPlaybackRequiresUserGesture(true);
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
        String url=request.getUrl().toString();
        if (!url.startsWith(ORIGIN)) return null;
        String path=request.getUrl().getPath(); if (path==null || path.equals("/")) path="/index.html";
        String name=path.substring(1); String mime=mime(name);
        try { InputStream in=getAssets().open("www/"+name); Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,in); }
        catch(Exception ignored){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream(new byte[0]));}
      }
    });
    setContentView(web);
    web.loadUrl(ORIGIN+"index.html");
  }
  private String mime(String p){if(p.endsWith(".html"))return "text/html";if(p.endsWith(".js"))return "text/javascript";if(p.endsWith(".css"))return "text/css";if(p.endsWith(".svg"))return "image/svg+xml";if(p.endsWith(".webmanifest"))return "application/manifest+json";return "application/octet-stream";}
  private void hideSystemUi(){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);}
  @Override public void onWindowFocusChanged(boolean hasFocus){super.onWindowFocusChanged(hasFocus);if(hasFocus)hideSystemUi();}
  @Override protected void onPause(){if(web!=null){web.evaluateJavascript("window.dispatchEvent(new Event('blur'))",null);web.onPause();}super.onPause();}
  @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();hideSystemUi();}
  @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
