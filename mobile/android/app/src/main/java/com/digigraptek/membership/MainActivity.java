package com.digigraptek.membership;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import org.json.JSONTokener;
import org.json.JSONObject;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int CAMERA = 11, FILE = 12, SAVE = 13;
    private static final int MAX_DOWNLOAD = 32 * 1024 * 1024;
    private final AppUrlPolicy policy = new AppUrlPolicy(BuildConfig.WEBSITE_URL);
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView web;
    private ProgressBar progress;
    private LinearLayout offline;
    private PermissionRequest cameraRequest;
    private ValueCallback<Uri[]> fileResult;
    private String pendingDownload, pendingCookies;
    private byte[] pendingBytes;
    private String printHook;
    private boolean readingBlob;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(21,92,194));
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((v,insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(safe.left,safe.top,safe.right,Math.max(safe.bottom,keyboard.bottom));
            } else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        web = new WebView(this);
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        progress = new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(progress,new FrameLayout.LayoutParams(-1,dp(3),Gravity.TOP));
        offline = new LinearLayout(this);
        offline.setOrientation(LinearLayout.VERTICAL);offline.setGravity(Gravity.CENTER);offline.setPadding(dp(28),dp(28),dp(28),dp(28));offline.setBackgroundColor(Color.rgb(247,250,255));
        TextView title = new TextView(this);title.setText(R.string.app_name);title.setTextSize(22);title.setTextColor(Color.rgb(21,92,194));title.setGravity(Gravity.CENTER);offline.addView(title);
        TextView message = new TextView(this);message.setText(R.string.connection_error);message.setTextSize(16);message.setGravity(Gravity.CENTER);message.setPadding(0,dp(24),0,dp(24));offline.addView(message);
        Button retry = new Button(this);retry.setText(R.string.try_again);retry.setOnClickListener(v -> {offline.setVisibility(View.GONE);web.loadUrl(BuildConfig.WEBSITE_URL);});offline.addView(retry);
        root.addView(offline,new FrameLayout.LayoutParams(-1,-1));offline.setVisibility(View.GONE);
        setContentView(root);
        configure(web);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        try (InputStream input = getAssets().open("native.js")) { printHook = readText(input); }
        catch (IOException error) { printHook = ""; }
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                String url=request.getUrl().toString();
                if (request.isForMainFrame() && policy.trusted(view.getUrl()) && url.startsWith("membership-print://invoice#")) {
                    showInvoice(request.getUrl().getFragment());return true;
                }
                if (policy.trusted(url)) return false;
                if (request.isForMainFrame()) openExternal(url);
                return request.isForMainFrame();
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon) {progress.setVisibility(View.VISIBLE);}
            @Override public void onPageFinished(WebView view,String url) {
                progress.setVisibility(View.GONE);CookieManager.getInstance().flush();
                if (policy.trusted(url)) view.evaluateJavascript(printHook,null);
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error) {
                if(request.isForMainFrame()) showOffline();
            }
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response) {
                if(request.isForMainFrame() && response.getStatusCode()>=500) showOffline();
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error) {handler.cancel();showOffline();}
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view,int value) {progress.setProgress(value);progress.setVisibility(value<100?View.VISIBLE:View.GONE);}
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if(!policy.trusted(request.getOrigin().toString()) || !policy.trusted(web.getUrl()) || !Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {request.deny();return;}
                    if(cameraRequest!=null) cameraRequest.deny();
                    cameraRequest=request;
                    if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED) finishCamera(true);
                    else requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA);
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {if(cameraRequest==request)cameraRequest=null;}
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> result,FileChooserParams params) {
                if(!policy.trusted(view.getUrl()))return false;
                if(fileResult!=null)fileResult.onReceiveValue(null);
                fileResult=result;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");
                String[] types=Arrays.stream(params.getAcceptTypes()).filter(t -> t.contains("/") && !t.contains(",")).toArray(String[]::new);
                if(types.length==1)intent.setType(types[0]);else if(types.length>1)intent.putExtra(Intent.EXTRA_MIME_TYPES,types);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
                try {startActivityForResult(intent,FILE);} catch(RuntimeException error) {fileResult.onReceiveValue(null);fileResult=null;toast("No file picker available");}
                return true;
            }
            @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean gesture,Message result) {
                if(!gesture || !policy.trusted(view.getUrl()))return false;
                WebView popup=new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView child,WebResourceRequest request){String url=request.getUrl().toString();if(policy.trusted(url))web.loadUrl(url);else openExternal(url);child.destroy();return true;}});
                ((WebView.WebViewTransport)result.obj).setWebView(popup);result.sendToTarget();return true;
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,size) -> prepareDownload(url,disposition,mime));
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::goBack);
        if(state==null || web.restoreState(state)==null)web.loadUrl(BuildConfig.WEBSITE_URL);
    }
    @android.annotation.SuppressLint("SetJavaScriptEnabled") private void configure(WebView view) {
        WebSettings s=view.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);s.setSupportMultipleWindows(true);s.setUserAgentString(s.getUserAgentString()+" MembershipAndroid/"+BuildConfig.VERSION_NAME);view.setBackgroundColor(Color.WHITE);
    }
    private void finishCamera(boolean granted) {
        PermissionRequest request=cameraRequest;cameraRequest=null;
        if(request!=null){if(granted && policy.trusted(web.getUrl()))request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});else request.deny();}
    }
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] grants) {
        super.onRequestPermissionsResult(code,permissions,grants);
        if(code==CAMERA)finishCamera(grants.length>0 && grants[0]==PackageManager.PERMISSION_GRANTED);
    }
    private void openExternal(String value) {
        if(!policy.external(value))return;
        try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(value)).addCategory(Intent.CATEGORY_BROWSABLE));}
        catch(RuntimeException error){toast("No app is available to open this link");}
    }
    private void prepareDownload(String url,String disposition,String mime) {
        if(pendingDownload!=null || pendingBytes!=null || readingBlob){toast("Finish the current download first");return;}
        if(!policy.trusted(web.getUrl()))return;
        if(url.startsWith("blob:") && policy.trusted(url.substring(5))){
            readingBlob=true;
            String key="__membershipDownload";
            web.evaluateJavascript("window."+key+"=null;fetch("+JSONObject.quote(url)+").then(r=>r.blob()).then(b=>{if(b.size>"+MAX_DOWNLOAD+")throw Error();const r=new FileReader();r.onload=()=>window."+key+"=r.result;r.readAsDataURL(b);}).catch(()=>window."+key+"='error');",null);
            pollBlob(0,disposition,mime);return;
        }
        if(!policy.trusted(url)){openExternal(url);return;}
        pendingDownload=url;pendingCookies=CookieManager.getInstance().getCookie(url);chooseSave(disposition,url,mime);
    }
    private void pollBlob(int attempt,String disposition,String mime) {
        web.postDelayed(() -> web.evaluateJavascript("window.__membershipDownload",value -> {
            try{
                Object parsed=new JSONTokener(value).nextValue();
                if(parsed==JSONObject.NULL){if(attempt<100)pollBlob(attempt+1,disposition,mime);else {readingBlob=false;toast("Unable to read download");}return;}
                String data=String.valueOf(parsed);
                readingBlob=false;
                if(!data.startsWith("data:") || data.length()>MAX_DOWNLOAD*1.4){toast("Unable to read download (maximum 32 MB)");return;}
                pendingBytes=android.util.Base64.decode(data.substring(data.indexOf(',')+1),android.util.Base64.DEFAULT);
                web.evaluateJavascript("delete window.__membershipDownload",null);chooseSave(disposition,"download",mime);
            }catch(Exception error){readingBlob=false;toast("Unable to read download");}
        }),100);
    }
    private void chooseSave(String disposition,String url,String mime) {
        String type=mime==null || mime.trim().isEmpty()?"application/octet-stream":mime;
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(type);intent.putExtra(Intent.EXTRA_TITLE,URLUtil.guessFileName(url,disposition,type));
        try{startActivityForResult(intent,SAVE);}catch(RuntimeException error){pendingDownload=null;pendingBytes=null;toast("No file saver available");}
    }
    @Override public void onActivityResult(int code,int status,Intent data) {
        super.onActivityResult(code,status,data);
        if(code==FILE && fileResult!=null){fileResult.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(status,data));fileResult=null;}
        if(code==SAVE){
            String url=pendingDownload,cookies=pendingCookies;byte[] bytes=pendingBytes;pendingDownload=null;pendingCookies=null;pendingBytes=null;
            if(status!=RESULT_OK || data==null || data.getData()==null)return;
            Uri destination=data.getData();io.execute(() -> {
                try(OutputStream output=getContentResolver().openOutputStream(destination)){
                    if(output==null)throw new IOException();
                    if(bytes!=null)output.write(bytes);else download(url,cookies,output);
                    runOnUiThread(() -> toast("File saved"));
                }catch(Exception error){runOnUiThread(() -> toast("Download failed. Please try again."));}
            });
        }
    }
    private void download(String value,String cookies,OutputStream output) throws IOException {
        for(int redirects=0;redirects<5;redirects++){
            if(!policy.trusted(value))throw new IOException("Unexpected download origin");
            HttpsURLConnection connection=(HttpsURLConnection)new URL(value).openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setInstanceFollowRedirects(false);
            if(cookies!=null)connection.setRequestProperty("Cookie",cookies);
            try{
                int status=connection.getResponseCode();
                if(status>=300 && status<400){value=new URL(new URL(value),connection.getHeaderField("Location")).toString();continue;}
                if(status!=200 || connection.getContentLengthLong()>MAX_DOWNLOAD)throw new IOException("Download unavailable");
                try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[16384];int count,total=0;while((count=input.read(buffer))!=-1){total+=count;if(total>MAX_DOWNLOAD)throw new IOException("File too large");output.write(buffer,0,count);}}
                return;
            }finally{connection.disconnect();}
        }
        throw new IOException("Too many redirects");
    }
    private void showInvoice(String html) {
        if(html==null || html.length()>512000)return;
        WebView invoice=new WebView(this);invoice.getSettings().setJavaScriptEnabled(false);
        invoice.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
            @Override public void onPageFinished(WebView v,String url){PrintManager printer=(PrintManager)getSystemService(PRINT_SERVICE);printer.print("Membership receipt",invoice.createPrintDocumentAdapter("Membership receipt"),new PrintAttributes.Builder().build());}
        });
        invoice.loadDataWithBaseURL(BuildConfig.WEBSITE_URL,html,"text/html","UTF-8",null);
    }
    private void goBack() {
        if(!policy.trusted(web.getUrl())){web.loadUrl(BuildConfig.WEBSITE_URL);return;}
        web.evaluateJavascript("(()=>{const panel=document.querySelector('.mobile-drawer[open],.modal-overlay');const close=panel?.querySelector('button[aria-label^=\"Close\"]');if(close){close.click();return true;}return false;})()",result -> {
            if("true".equals(result))return;
            if(web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setMessage("Close Membership Management System?").setNegativeButton("Stay",null).setPositiveButton("Close",(d,w)->finish()).show();
        });
    }
    // API 33+ uses the registered OnBackInvokedCallback; this override is only for Android 8-12.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed(){goBack();}
    @Override protected void onSaveInstanceState(Bundle state){web.saveState(state);super.onSaveInstanceState(state);}
    @Override protected void onPause(){super.onPause();web.onPause();CookieManager.getInstance().flush();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(cameraRequest!=null)cameraRequest.deny();if(fileResult!=null)fileResult.onReceiveValue(null);web.destroy();io.shutdown();super.onDestroy();}
    private static String readText(InputStream input) throws IOException {
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int count;
        while((count=input.read(buffer))!=-1)bytes.write(buffer,0,count);return bytes.toString("UTF-8");
    }
    private void showOffline(){progress.setVisibility(View.GONE);offline.setVisibility(View.VISIBLE);}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
}
