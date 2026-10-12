package com.andrefiker.commandcenter;
import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.view.WindowInsets;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.util.Arrays;
public class MainActivity extends Activity {
 private WebView web;
 private ValueCallback<Uri[]> fileCallback;
 private static final int FILE_PICKER=51;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(246,248,252));
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{
   if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());v.setPadding(i.left,i.top,i.right,i.bottom);}
   else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets;
  });root.requestApplyInsets();
  web.setBackgroundColor(Color.rgb(246,248,252));
  web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(true);
  web.getSettings().setBlockNetworkLoads(true);web.getSettings().setSupportZoom(false);
  web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){return openExternal(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView v,String url){return openExternal(Uri.parse(url));}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;
    Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("application/json");pick.addCategory(Intent.CATEGORY_OPENABLE);
    try{startActivityForResult(pick,FILE_PICKER);return true;}catch(Exception ex){fileCallback.onReceiveValue(null);fileCallback=null;return false;}
   }
  });
  web.loadUrl("file:///android_asset/index.html");
 }
 private boolean openExternal(Uri u){
  if("file".equals(u.getScheme())&&"/android_asset/index.html".equals(u.getPath()))return false;
  if("https".equals(u.getScheme())&&Arrays.asList("docs.google.com","github.com","www.instagram.com","ads.google.com","drive.google.com","chatgpt.com").contains(u.getHost())){
   try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ex){Toast.makeText(this,"No browser is available.",Toast.LENGTH_SHORT).show();}
  }return true;
 }
 @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==FILE_PICKER&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK&&intent!=null&&intent.getData()!=null?new Uri[]{intent.getData()}:null);fileCallback=null;}}
 @Override public void onBackPressed(){web.evaluateJavascript("(function(){var d=document.getElementById('detail');if(d&&d.open){d.close();return true;}return false;})()",value->{if(!"true".equals(value))super.onBackPressed();});}
 @Override protected void onPause(){super.onPause();web.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null)web.destroy();super.onDestroy();}
}
