package br.com.meuassessor.capture;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.speech.RecognizerIntent;
import android.view.View;
import android.view.ViewGroup;
import android.window.OnBackInvokedDispatcher;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.ArrayList;

public final class MainActivity extends Activity {
    static final int REQUEST_VOICE = 701;
    private static final int REQUEST_FILE = 702;
    private static final String APP_URL =
            "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/?android=1.3.1";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri capturedImageUri;
    private Bundle pendingState;
    private boolean authenticated;
    private boolean authenticationInProgress;
    private long backgroundAt;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        webView = buildWebView();
        String nativeVersion = getSharedPreferences("native_runtime", MODE_PRIVATE)
                .getString("web_cache_version", "");
        if (!"1.3.1".equals(nativeVersion)) {
            webView.clearCache(true);
            getSharedPreferences("native_runtime", MODE_PRIVATE).edit()
                    .putString("web_cache_version", "1.3.1").apply();
        }
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#020A14"));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        webView.setVisibility(View.INVISIBLE);
        pendingState = state;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBackNavigation);
        }
        requestAuthentication();
    }

    private void requestAuthentication() {
        if (authenticationInProgress) return;
        authenticationInProgress = true;
        AppLock.authenticate(this, this::unlockApplication, this::cancelAuthentication);
    }

    private void unlockApplication() {
        if (isFinishing()) return;
        authenticationInProgress = false;
        authenticated = true;
        backgroundAt = 0L;
        webView.setVisibility(View.VISIBLE);

        if (pendingState == null) {
            if (webView.getUrl() == null) webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(pendingState);
            String savedImageUri = pendingState.getString("captured_image_uri");
            if (savedImageUri != null) capturedImageUri = Uri.parse(savedImageUri);
            pendingState = null;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 703);
        }
        requestNativePermissions();
        UpdateChecker.check(this);
    }

    private void requestNativePermissions() {
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.CAMERA);
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                missing.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
            missing.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        if (!missing.isEmpty()) requestPermissions(missing.toArray(new String[0]), 704);
    }

    private void cancelAuthentication() {
        authenticationInProgress = false;
        if (!authenticated) finish();
    }

    @Override
    protected void onStart() {
        super.onStart();
        BankNotificationListener.reconnect(this);
        if (authenticated && backgroundAt > 0L
                && System.currentTimeMillis() - backgroundAt >= 30000L) {
            authenticated = false;
            webView.setVisibility(View.INVISIBLE);
            requestAuthentication();
        }
    }

    @Override
    protected void onStop() {
        if (authenticated && !isChangingConfigurations()) {
            backgroundAt = System.currentTimeMillis();
        }
        super.onStop();
    }

    private WebView buildWebView() {
        WebView value = new WebView(this);
        WebSettings settings = value.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setUserAgentString(settings.getUserAgentString() + " MeuAssessorAndroid/1.0");

        WebAppBridge bridge = new WebAppBridge(this);
        value.addJavascriptInterface(bridge, "AndroidBridge");
        value.addJavascriptInterface(bridge, "AndroidApp");
        value.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                if ("hfsplanejamentos-star.github.io".equalsIgnoreCase(host)) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });
        value.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    ArrayList<String> granted = new ArrayList<>();
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                                && checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                                == PackageManager.PERMISSION_GRANTED) granted.add(resource);
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                                && checkSelfPermission(Manifest.permission.CAMERA)
                                == PackageManager.PERMISSION_GRANTED) granted.add(resource);
                    }
                    if (granted.isEmpty()) request.deny();
                    else request.grant(granted.toArray(new String[0]));
                });
            }

            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;

                Intent files = params.createIntent();
                files.addCategory(Intent.CATEGORY_OPENABLE);

                Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                ContentValues image = new ContentValues();
                image.put(MediaStore.Images.Media.DISPLAY_NAME,
                        "meu_assessor_" + System.currentTimeMillis() + ".jpg");
                image.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                capturedImageUri = getContentResolver().insert(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, image);
                if (capturedImageUri != null) {
                    camera.putExtra(MediaStore.EXTRA_OUTPUT, capturedImageUri);
                    camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                Intent chooser = Intent.createChooser(files, "Anexar comprovante ou extrato");
                if (capturedImageUri != null && camera.resolveActivity(getPackageManager()) != null) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                }

                try {
                    startActivityForResult(chooser, REQUEST_FILE);
                } catch (Exception error) {
                    fileCallback = null;
                    capturedImageUri = null;
                    return false;
                }
                return true;
            }
        });
        return value;
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        webView.saveState(state);
        if (capturedImageUri != null) state.putString("captured_image_uri", capturedImageUri.toString());
        super.onSaveInstanceState(state);
    }

    private void handleBackNavigation() {
        webView.evaluateJavascript(
                "(function(){try{return !!(window.handleAndroidBack&&window.handleAndroidBack())}catch(e){return false}})()",
                handled -> {
                    if ("true".equals(handled)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else finish();
                });
    }

    @Override
    public void onBackPressed() {
        handleBackNavigation();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == AppLock.REQUEST_DEVICE_CREDENTIAL) {
            if (resultCode == RESULT_OK) unlockApplication();
            else cancelAuthentication();
            return;
        }
        if (requestCode == REQUEST_FILE) {
            Uri[] result = null;
            if (resultCode == RESULT_OK) {
                result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                if ((result == null || result.length == 0) && capturedImageUri != null) {
                    result = new Uri[]{capturedImageUri};
                } else if (capturedImageUri != null) {
                    getContentResolver().delete(capturedImageUri, null, null);
                }
            } else if (capturedImageUri != null) {
                getContentResolver().delete(capturedImageUri, null, null);
            }
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
            capturedImageUri = null;
            return;
        }
        if (requestCode == REQUEST_VOICE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> values =
                    data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            String text = values == null || values.isEmpty() ? "" : values.get(0);
            String encoded = android.util.Base64.encodeToString(
                    text.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    android.util.Base64.NO_WRAP);
            webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('android-voice-result',{detail:decodeURIComponent(escape(atob('" +
                            encoded + "')))}));", null);
        }
    }
}
