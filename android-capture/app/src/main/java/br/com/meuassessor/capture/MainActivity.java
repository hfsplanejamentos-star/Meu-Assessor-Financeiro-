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
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.speech.RecognizerIntent;
import android.view.View;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.window.OnBackInvokedDispatcher;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import android.view.Gravity;

import java.util.ArrayList;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.zip.GZIPInputStream;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

public final class MainActivity extends Activity {
    static final int REQUEST_VOICE = 701;
    private static final int REQUEST_FILE = 702;
    private static final String APP_URL =
            "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/snake-finance-mobile.html?android=1.5.7";
    private static final String APP_BASE_URL =
            "https://hfsplanejamentos-star.github.io/Meu-Assessor-Financeiro-/";
    private static final String OTA_CACHE_FILE = "snake_dashboard_last_good.html";
    private static final String OTA_TEMP_FILE = "snake_dashboard_candidate.html";

    static final int REQUEST_BACKUP_EXPORT = 708;
    private String pendingBackupJson;
    private static final String BACKUP_PENDING_FILE = "snake_backup_pending.json";
    private java.io.File pendingBackupFile() {
        return new java.io.File(getFilesDir(), BACKUP_PENDING_FILE);
    }
    void exportBackupDocument(String json, String filename) {
        runOnUiThread(() -> {
            try {
                byte[] content = json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                if (content.length < 20) throw new java.io.IOException("JSON sem conteúdo");
                java.io.File tmp = new java.io.File(getFilesDir(), BACKUP_PENDING_FILE + ".tmp");
                try (java.io.FileOutputStream out = new java.io.FileOutputStream(tmp)) {
                    out.write(content);
                    out.flush();
                    out.getFD().sync();
                }
                java.io.File target = pendingBackupFile();
                if (!tmp.renameTo(target)) throw new java.io.IOException("Não foi possível preservar o backup antes de exportar");
                pendingBackupJson = json;
            } catch (Exception e) {
                android.widget.Toast.makeText(this, "Exportação cancelada: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
                return;
            }
            Intent save = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            save.addCategory(Intent.CATEGORY_OPENABLE);
            save.setType("application/json");
            save.putExtra(Intent.EXTRA_TITLE, filename == null ? "Snake_Finance_Backup.json" : filename);
            try { startActivityForResult(save, REQUEST_BACKUP_EXPORT); }
            catch (Exception e) {
                pendingBackupJson = null;
                android.widget.Toast.makeText(this, "Não foi possível abrir o salvamento do backup", android.widget.Toast.LENGTH_LONG).show();
            }
        });
    }
    private WebView webView;
    private FrameLayout startupSplash;
    private boolean dashboardReady = false;
    private volatile boolean showUpdatedDashboardNotice = false;
    private boolean authenticatedForDisplay = false;
    private ValueCallback<Uri[]> fileCallback;
    private Uri capturedImageUri;
    private boolean choosingJsonBackup;
    private boolean deliveringBackup;
    private static final String PENDING_IMPORT_FILE = "snake_backup_import_pending.json";
    private Bundle pendingState;
    private boolean authenticated;
    private boolean authenticationInProgress;
    private boolean queueReceiverRegistered;
    private final android.content.BroadcastReceiver queueReceiver = new android.content.BroadcastReceiver(){ @Override public void onReceive(android.content.Context context, android.content.Intent intent){ if(webView!=null) webView.post(() -> webView.evaluateJavascript("window.meuAssessorAndroidAutoSync&&window.meuAssessorAndroidAutoSync()", null)); }};

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        // Hide real Android status icons only while the startup screen is visible.
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.hide(android.view.WindowInsets.Type.statusBars());
        }
        webView = buildWebView();
        String nativeVersion = getSharedPreferences("native_runtime", MODE_PRIVATE)
                .getString("web_cache_version", "");
        if (!"1.5.7".equals(nativeVersion)) {
            webView.clearCache(true);
            getSharedPreferences("native_runtime", MODE_PRIVATE).edit()
                    .putString("web_cache_version", "1.5.7").apply();
        }
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        FrameLayout splash = new FrameLayout(this);
        splash.setBackgroundColor(Color.BLACK);
        startupSplash = splash;
        // Use the exact user-approved JPG when packaged in assets. Never crop or redraw it.
        // No alternative splash image or generated logo is permitted.
        try {
            android.graphics.Bitmap splashBitmap = android.graphics.BitmapFactory.decodeStream(
                getAssets().open("snake_splash_aprovada.jpg"));
            if (splashBitmap != null) {
                ImageView approvedSplash = new ImageView(this);
                // Display the approved artwork without the phone chrome captured in its source.
                // Source bytes and the approved logo remain unchanged.
                approvedSplash.setImageDrawable(new android.graphics.drawable.Drawable() {
                    private final android.graphics.Paint paint = new android.graphics.Paint(
                            android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG);
                    @Override public void draw(android.graphics.Canvas canvas) {
                        android.graphics.Rect source = new android.graphics.Rect(0,
                                Math.round(splashBitmap.getHeight() * 0.045f),
                                Math.round(splashBitmap.getWidth() * 0.965f), splashBitmap.getHeight());
                        android.graphics.Rect bounds = getBounds();
                        float scale = Math.min((float) bounds.width() / source.width(),
                                (float) bounds.height() / source.height());
                        float width = source.width() * scale, height = source.height() * scale;
                        float left = bounds.left + (bounds.width() - width) / 2f;
                        float top = bounds.top + (bounds.height() - height) / 2f;
                        canvas.drawBitmap(splashBitmap, source,
                                new android.graphics.RectF(left, top, left + width, top + height), paint);
                    }
                    @Override public void setAlpha(int alpha) { paint.setAlpha(alpha); }
                    @Override public void setColorFilter(android.graphics.ColorFilter filter) { paint.setColorFilter(filter); }
                    @Override public int getOpacity() { return android.graphics.PixelFormat.OPAQUE; }
                });
                approvedSplash.setBackgroundColor(Color.BLACK);
                approvedSplash.setScaleType(ImageView.ScaleType.FIT_CENTER);
                splash.addView(approvedSplash, new FrameLayout.LayoutParams(-1, -1));
            }
        } catch (java.io.IOException missingApprovedSplash) {
            // An absent asset must not crash app startup.
        }
        root.addView(splash, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        // Keep Android status/navigation bars outside the WebView content area.
        // This prevents the status clock and icons from overlapping the dashboard header.
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                        android.view.WindowInsets.Type.statusBars()
                                | android.view.WindowInsets.Type.navigationBars());
                // Inset only the dashboard: the startup splash must remain edge-to-edge.
                // Padding the root also shifts/crops the splash and can expose status-bar artifacts.
                webView.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 35) root.requestApplyInsets();
        webView.setVisibility(View.INVISIBLE);
        pendingState = state;
        if (state != null) choosingJsonBackup = state.getBoolean("choosing_json_backup", false);
        receiveSharedBackup(getIntent());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBackNavigation);
        }
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            requestAuthentication();
        }, 3000L);
    }

    private void revealDashboardWhenReady() {
        if (!authenticatedForDisplay || !dashboardReady || startupSplash == null) return;
        // Restore the system status bar for normal dashboard use.
        getWindow().getDecorView().setSystemUiVisibility(0);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) controller.show(android.view.WindowInsets.Type.statusBars());
        }
        webView.requestApplyInsets();
        offerPendingBackup();
        FrameLayout splash = startupSplash;
        startupSplash = null;
        if (splash.getParent() instanceof ViewGroup) ((ViewGroup) splash.getParent()).removeView(splash);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
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
        authenticatedForDisplay = true;
        webView.setVisibility(View.VISIBLE);
        revealDashboardWhenReady();

        if (pendingState != null) {
            String savedImageUri = pendingState.getString("captured_image_uri");
            if (savedImageUri != null) capturedImageUri = Uri.parse(savedImageUri);
            pendingState = null;
        }
        // Rebuild the bundled view; financial records persist in WebView localStorage.
        // Serializing loadDataWithBaseURL history can put the full HTML in the Activity Bundle.
        if (webView.getUrl() == null) loadDashboardHtml();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 703);
        }
        DailyFinanceReminder.schedule(this);
        requestNativePermissions();
        if(!queueReceiverRegistered){android.content.IntentFilter queueFilter=new android.content.IntentFilter("br.com.meuassessor.capture.QUEUE_CHANGED");
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.TIRAMISU) registerReceiver(queueReceiver,queueFilter,RECEIVER_NOT_EXPORTED); else registerReceiver(queueReceiver,queueFilter);queueReceiverRegistered=true;}
        UpdateChecker.check(this);
    }

    private static final String CACHE_FILE = "snake_finance_dashboard_1_5_1.html";
    private static final String CACHE_BACKUP_FILE = "snake_finance_dashboard_1_5_1.backup.html";

    private boolean validDashboard(String html) {
        if (html == null || html.length() < 50000) return false;
        return html.contains("Snake Finance Mobile — V84 · Visual aprovado")
                && html.contains("SNAKE FINANCE")
                && html.contains("window.SNAKE_DISTRIBUTABLE")
                && html.contains("</html>");
    }

    private String readCachedDashboard() {
        File file = new File(getFilesDir(), CACHE_FILE);
        if (!file.exists()) return null;
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int offset = 0;
            while (offset < bytes.length) {
                int read = input.read(bytes, offset, bytes.length - offset);
                if (read < 0) break;
                offset += read;
            }
            String html = new String(bytes, 0, offset, StandardCharsets.UTF_8);
            return validDashboard(html) ? html : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private void saveDashboardAtomically(String html) throws Exception {
        File current = new File(getFilesDir(), CACHE_FILE);
        File backup = new File(getFilesDir(), CACHE_BACKUP_FILE);
        File temp = new File(getFilesDir(), CACHE_FILE + ".tmp");
        try (FileOutputStream output = new FileOutputStream(temp, false)) {
            output.write(html.getBytes(StandardCharsets.UTF_8));
            output.flush();
            output.getFD().sync();
        }
        if (!validDashboard(html)) throw new IllegalStateException("dashboard inválido");
        if (current.exists()) {
            if (backup.exists()) backup.delete();
            current.renameTo(backup);
        }
        if (!temp.renameTo(current)) throw new IllegalStateException("falha ao ativar dashboard");
    }

    private void showDashboard(String html) {
        if (!validDashboard(html)) {
            webView.loadUrl(APP_URL);
            return;
        }
        webView.loadDataWithBaseURL(APP_BASE_URL, html, "text/html", "UTF-8", APP_URL);
    }

    private void loadDashboardHtml() {
        // Official Rev. 0 must never replace its bundled dashboard with a
        // stale cache or GitHub Pages. This changes HTML selection only:
        // WebView localStorage, finance entries and bank data are untouched.
        try (InputStream input = getAssets().open("snake-finance-mobile.html")) {
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
            String bundled = bytes.toString("UTF-8");
            if (!validDashboard(bundled)) {
                throw new IllegalStateException("Invalid bundled dashboard");
            }
            showDashboard(bundled);
        } catch (Exception failure) {
            android.widget.Toast.makeText(this,
                    "Falha no painel interno. Dados preservados.",
                    android.widget.Toast.LENGTH_LONG).show();
        }
        return;
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
    protected void onDestroy(){ if(queueReceiverRegistered){try{unregisterReceiver(queueReceiver);}catch(Exception ignored){}queueReceiverRegistered=false;} super.onDestroy(); }

    @Override
    protected void onStart() {
        super.onStart();
        BankNotificationListener.reconnect(this);
    }

    private WebView buildWebView() {
        WebView value = new WebView(this);
        value.setSaveEnabled(false);
        value.setSaveFromParentEnabled(false);
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
        // Pull-to-refresh only from the top of the dashboard, not inside a modal.
        // Reloading the WebView preserves the app's localStorage and ledger.
        value.setOnTouchListener(new View.OnTouchListener() {
            private float startY;
            private boolean eligible;
            private boolean fired;
            @Override public boolean onTouch(View view, MotionEvent event) {
                switch (event.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN:
                        startY = event.getY();
                        eligible = authenticated && !value.canScrollVertically(-1);
                        fired = false;
                        break;
                    case MotionEvent.ACTION_MOVE:
                        if (eligible && !fired && event.getY() - startY > dp(120)) {
                            fired = true;
                            eligible = false;
                            value.evaluateJavascript(
                                "(function(){var m=document.getElementById('md');" +
                                "return !(m&&getComputedStyle(m).display!=='none')&&" +
                                "!(document.scrollingElement&&document.scrollingElement.scrollTop>2);" +
                                "})()",
                                allowed -> {
                                    if ("true".equals(allowed) && authenticated) {
                                        android.widget.Toast.makeText(MainActivity.this,
                                            "Atualizando Snake Finance…",
                                            android.widget.Toast.LENGTH_SHORT).show();
                                        value.reload();
                                    }
                                });
                        }
                        break;
                    case MotionEvent.ACTION_UP:
                    case MotionEvent.ACTION_CANCEL:
                        eligible = false;
                        break;
                }
                return false;
            }
        });
        value.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                dashboardReady = true;
                revealDashboardWhenReady();
                offerPendingBackup();
                if (showUpdatedDashboardNotice) {
                    showUpdatedDashboardNotice = false;
                    view.evaluateJavascript("(function(){var n=document.createElement('div');n.textContent='Snake Finance: painel atualizado pelo GitHub';n.style.cssText='position:fixed;bottom:80px;left:14px;right:14px;z-index:2147483647;background:#171717;color:#f1ce79;padding:14px;border:1px solid #b68d38;border-radius:12px;text-align:center;font:600 14px sans-serif;box-shadow:0 8px 24px #0008';document.body.appendChild(n);setTimeout(function(){n.remove()},6500)})()", null);
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost() == null ? "" : uri.getHost();
                String path = uri.getPath() == null ? "" : uri.getPath();
                if (!request.isForMainFrame()
                        || !"hfsplanejamentos-star.github.io".equalsIgnoreCase(host)
                        || !(path.equals("/Meu-Assessor-Financeiro-/")
                        || path.equals("/Meu-Assessor-Financeiro-/index.html"))) return null;
                try {
                    HttpURLConnection connection = (HttpURLConnection)
                            new URL(uri.toString()).openConnection();
                    connection.setConnectTimeout(12000);
                    connection.setReadTimeout(20000);
                    connection.setRequestProperty("Accept", "text/html,application/xhtml+xml");
                    connection.setRequestProperty("Accept-Encoding", "identity");
                    connection.setRequestProperty("Cache-Control", "no-cache");
                    connection.connect();
                    if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) return null;
                    return new WebResourceResponse("text/html", "UTF-8", connection.getInputStream());
                } catch (Exception ignored) {
                    return null;
                }
            }

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
                choosingJsonBackup = false;
                for (String accept : params.getAcceptTypes()) {
                    if (accept != null && accept.toLowerCase(java.util.Locale.ROOT).contains("json")) {
                        choosingJsonBackup = true;
                        break;
                    }
                }
                if (choosingJsonBackup) {
                    // JSON backups go directly to DocumentsUI, without camera/gallery intents.
                    capturedImageUri = null;
                    Intent backup = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    backup.addCategory(Intent.CATEGORY_OPENABLE);
                    backup.setType("*/*");
                    backup.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    try {
                        startActivityForResult(backup, REQUEST_FILE);
                    } catch (android.content.ActivityNotFoundException missingProvider) {
                        backup.setAction(Intent.ACTION_GET_CONTENT);
                        try { startActivityForResult(backup, REQUEST_FILE); }
                        catch (Exception error) { cancelFileSelection("Não foi possível abrir o seletor de arquivos"); }
                    } catch (Exception error) {
                        cancelFileSelection("Não foi possível abrir o seletor de arquivos");
                    }
                    return true;
                }

                Intent files = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                files.addCategory(Intent.CATEGORY_OPENABLE);
                files.setType("*/*");
                files.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                        "image/*", "application/pdf", "text/csv", "text/plain",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "application/vnd.ms-excel", "application/x-ofx", "application/json", "text/json"
                });

                Intent gallery;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    gallery = new Intent(MediaStore.ACTION_PICK_IMAGES);
                } else {
                    gallery = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    gallery.addCategory(Intent.CATEGORY_OPENABLE);
                    gallery.setType("image/*");
                }

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

                Intent chooser = Intent.createChooser(files, "Anexar comprovante, print ou extrato");
                ArrayList<Intent> initialIntents = new ArrayList<>();
                if (gallery.resolveActivity(getPackageManager()) != null) {
                    initialIntents.add(gallery);
                }
                if (capturedImageUri != null && camera.resolveActivity(getPackageManager()) != null) {
                    initialIntents.add(camera);
                }
                if (!initialIntents.isEmpty()) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,
                            initialIntents.toArray(new Intent[0]));
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
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        receiveSharedBackup(intent);
    }

    private void receiveSharedBackup(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
        Uri uri;
        if (Build.VERSION.SDK_INT >= 33) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        else uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
            uri = intent.getClipData().getItemAt(0).getUri();
        }
        // Never fetch network URLs or inspect arbitrary filesystem paths from an external intent.
        if (uri == null || !"content".equals(uri.getScheme())) {
            android.widget.Toast.makeText(this, "Compartilhe o arquivo JSON pelo gerenciador de arquivos",
                    android.widget.Toast.LENGTH_LONG).show();
            return;
        }
        intent.removeExtra(Intent.EXTRA_STREAM);
        intent.setAction(Intent.ACTION_MAIN);
        stageBackupUri(uri);
    }

    private void stageBackupUri(Uri uri) {
        new Thread(() -> {
            java.io.File staged = new java.io.File(getFilesDir(), PENDING_IMPORT_FILE);
            java.io.File temp = new java.io.File(getFilesDir(), PENDING_IMPORT_FILE + ".tmp");
            try {
                synchronized (MainActivity.class) {
                    try (java.io.InputStream input = getContentResolver().openInputStream(uri);
                         java.io.FileOutputStream output = new java.io.FileOutputStream(temp)) {
                        if (input == null) throw new java.io.IOException("Arquivo indisponível");
                        byte[] chunk = new byte[8192];
                        int n, total = 0;
                        while ((n = input.read(chunk)) != -1) {
                            total += n;
                            if (total > 20 * 1024 * 1024) throw new java.io.IOException("O backup excede 20 MB");
                            output.write(chunk, 0, n);
                        }
                        if (total == 0) throw new java.io.IOException("O arquivo está vazio (0 KB)");
                        output.getFD().sync();
                    }
                    // Check JSON syntax before replacing an earlier pending import.
                    String json = new String(java.nio.file.Files.readAllBytes(temp.toPath()), StandardCharsets.UTF_8);
                    if (json.startsWith("\uFEFF")) json = json.substring(1);
                    Object parsed = new org.json.JSONTokener(json).nextValue();
                    if (!(parsed instanceof org.json.JSONObject) && !(parsed instanceof org.json.JSONArray))
                        throw new java.io.IOException("Selecione um backup JSON válido");
                    if (!temp.renameTo(staged)) throw new java.io.IOException("Não foi possível preparar a conferência");
                }
                runOnUiThread(this::offerPendingBackup);
            } catch (Exception error) {
                temp.delete();
                runOnUiThread(() -> android.widget.Toast.makeText(this,
                        "Importação não iniciada: " + error.getMessage(), android.widget.Toast.LENGTH_LONG).show());
            }
        }, "snake-backup-reader").start();
    }

    private void offerPendingBackup() {
        if (!authenticatedForDisplay || !dashboardReady || deliveringBackup || isFinishing()) return;
        java.io.File pending = new java.io.File(getFilesDir(), PENDING_IMPORT_FILE);
        if (!pending.isFile()) return;
        deliveringBackup = true;
        new Thread(() -> {
            try {
                byte[] bytes = java.nio.file.Files.readAllBytes(pending.toPath());
                String encoded = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
                runOnUiThread(() -> {
                    if (isFinishing()) { deliveringBackup = false; return; }
                    webView.evaluateJavascript("window.__snakeImportParts=[];true", ignored ->
                            sendBackupChunk(encoded, 0, pending));
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    deliveringBackup = false;
                    android.widget.Toast.makeText(this, "Não foi possível ler o backup preparado",
                            android.widget.Toast.LENGTH_LONG).show();
                });
            }
        }, "snake-backup-preview").start();
    }

    private void sendBackupChunk(String encoded, int offset, java.io.File pending) {
        if (isFinishing() || webView == null) { deliveringBackup = false; return; }
        if (offset < encoded.length()) {
            int end = Math.min(offset + 48000, encoded.length());
            String part = encoded.substring(offset, end);
            webView.evaluateJavascript("window.__snakeImportParts.push('" + part + "');true",
                    result -> {
                        if (!"true".equals(result)) { deliveringBackup = false; return; }
                        sendBackupChunk(encoded, end, pending);
                    });
            return;
        }
        // Existing Auditoria 31 validators and explicit user confirmation still own all ledger writes.
        String script = "(function(){try{if(typeof previewBackup!=='function')return false;" +
                "var raw=atob(window.__snakeImportParts.join(''));" +
                "var bytes=Uint8Array.from(raw,function(c){return c.charCodeAt(0)});" +
                "var text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\\uFEFF/,'');" +
                "previewBackup(JSON.parse(text));return true;" +
                "}catch(e){alert('Importação recusada: '+e.message);return false;}" +
                "finally{delete window.__snakeImportParts}})()";
        webView.evaluateJavascript(script, result -> {
            deliveringBackup = false;
            // The pending file is never an active ledger. Validation did not import any data yet.
            pending.delete();
        });
    }

    private void cancelFileSelection(String message) {
        ValueCallback<Uri[]> callback = fileCallback;
        fileCallback = null;
        choosingJsonBackup = false;
        capturedImageUri = null;
        if (callback != null) callback.onReceiveValue(null);
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show();
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        // Keep Activity state compact when DocumentsUI or the camera moves us to the background.
        // Backup bytes and ledger data never belong in a Binder transaction.
        state.putBoolean("choosing_json_backup", choosingJsonBackup);
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
        if (requestCode == REQUEST_BACKUP_EXPORT) {
            String json = pendingBackupJson;
            pendingBackupJson = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                try {
                    byte[] bytes;
                    java.io.File staged = pendingBackupFile();
                    if (staged.isFile() && staged.length() >= 20) {
                        bytes = java.nio.file.Files.readAllBytes(staged.toPath());
                    } else if (json != null) {
                        bytes = json.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                    } else {
                        throw new java.io.IOException("Backup temporário indisponível");
                    }
                    if (bytes.length < 20) throw new java.io.IOException("Conteúdo JSON vazio");
                    Uri target = data.getData();
                    try (java.io.OutputStream out = getContentResolver().openOutputStream(target, "wt")) {
                        if (out == null) throw new java.io.IOException("Destino indisponível");
                        out.write(bytes);
                        out.flush();
                    }
                    long actual = -1;
                    try (android.os.ParcelFileDescriptor fd = getContentResolver().openFileDescriptor(target, "r")) {
                        if (fd != null) actual = fd.getStatSize();
                    }
                    if (actual < 0) {
                        try (android.database.Cursor c = getContentResolver().query(target,
                            new String[]{android.provider.OpenableColumns.SIZE}, null, null, null)) {
                            if (c != null && c.moveToFirst() && !c.isNull(0)) actual = c.getLong(0);
                        }
                    }
                    if (actual != bytes.length) throw new java.io.IOException(
                        "Arquivo não confirmado: esperado " + bytes.length + " B, encontrado " + actual + " B");
                    try (java.io.InputStream check = getContentResolver().openInputStream(target)) {
                        if (check == null) throw new java.io.IOException("Arquivo exportado não pode ser reaberto");
                        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
                        byte[] chunk = new byte[8192];
                        int n; long total = 0;
                        while ((n = check.read(chunk)) != -1) { digest.update(chunk, 0, n); total += n; }
                        byte[] expected = java.security.MessageDigest.getInstance("SHA-256").digest(bytes);
                        if (total != bytes.length || !java.util.Arrays.equals(expected, digest.digest()))
                            throw new java.io.IOException("Falha na conferência de integridade do arquivo exportado");
                    }
                    staged.delete();
                    android.widget.Toast.makeText(this,
                        "Backup confirmado e verificado: " + actual + " bytes", android.widget.Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    android.widget.Toast.makeText(this,
                        "Backup NÃO confirmado: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
                }
            }
            return;
        }
        if (requestCode == AppLock.REQUEST_DEVICE_CREDENTIAL) {
            if (resultCode == RESULT_OK) unlockApplication();
            else cancelAuthentication();
            return;
        }
        if (requestCode == REQUEST_FILE && choosingJsonBackup) {
            choosingJsonBackup = false;
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            capturedImageUri = null;
            if (callback != null) callback.onReceiveValue(null);
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                stageBackupUri(data.getData());
            }
            return;
        }
        if (requestCode == REQUEST_FILE) {
            ValueCallback<Uri[]> callback = fileCallback;
            fileCallback = null;
            boolean jsonBackup = choosingJsonBackup;
            choosingJsonBackup = false;
            Uri[] result = null;
            try {
                if (resultCode == RESULT_OK) {
                    result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                    if (!jsonBackup && (result == null || result.length == 0) && capturedImageUri != null) {
                        result = new Uri[]{capturedImageUri};
                    }
                }
                if (capturedImageUri != null && (result == null || result.length == 0
                        || !capturedImageUri.equals(result[0]))) {
                    try { getContentResolver().delete(capturedImageUri, null, null); }
                    catch (Exception ignored) { /* Cleanup cannot interrupt an import. */ }
                }
                if (result != null && result.length > 0 && result[0] != null && !jsonBackup) {
                    recognizeImageText(result[0]);
                }
            } catch (Exception error) {
                result = null;
                android.widget.Toast.makeText(this, "Não foi possível abrir o arquivo selecionado",
                        android.widget.Toast.LENGTH_LONG).show();
            } finally {
                capturedImageUri = null;
                if (callback != null) callback.onReceiveValue(result);
            }
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

    private void recognizeImageText(Uri uri) {
        String mime = getContentResolver().getType(uri);
        if (mime != null && !mime.startsWith("image/")) return;
        try {
            InputImage image = InputImage.fromFilePath(this, uri);
            com.google.mlkit.vision.text.TextRecognizer recognizer =
                    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                    .addOnSuccessListener(result -> {
                        dispatchOcrResult(result.getText(), "ok");
                        recognizer.close();
                    })
                    .addOnFailureListener(error -> {
                        dispatchOcrResult("", "O reconhecimento ainda não está disponível. Verifique a internet e tente novamente.");
                        recognizer.close();
                    });
        } catch (Exception error) {
            dispatchOcrResult("", "Não foi possível ler esta imagem.");
        }
    }

    private void dispatchOcrResult(String text, String status) {
        String text64 = android.util.Base64.encodeToString(
                (text == null ? "" : text).getBytes(StandardCharsets.UTF_8),
                android.util.Base64.NO_WRAP);
        String status64 = android.util.Base64.encodeToString(
                status.getBytes(StandardCharsets.UTF_8), android.util.Base64.NO_WRAP);
        runOnUiThread(() -> webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('android-ocr-result',{detail:{text:decodeURIComponent(escape(atob('" +
                        text64 + "'))),status:decodeURIComponent(escape(atob('" + status64 + "')))}}));",
                null));
    }
}

