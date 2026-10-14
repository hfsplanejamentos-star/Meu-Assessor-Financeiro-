plugins { id("com.android.application") }

// Development preview is assembled from the approved repository HTML/JS files.
// No generated copies are committed and the release application remains unchanged.
val assessorScripts = listOf(
    "assessor-mobile-api.js",
    "assessor-mobile-summary.js",
    "assessor-mobile-notifications.js",
    "assessor-mobile-screen.js"
)
val previewRoot = projectDir.resolve("../..").canonicalFile
val previewSources = listOf(
    previewRoot.resolve("assessor-ia-mobile.html"),
    previewRoot.resolve("assessor-brand-assets.css")
) + assessorScripts.map { previewRoot.resolve(it) }
val previewAssetsDir = layout.buildDirectory.dir("generated/assessorPreviewAssets")
val prepareAssessorPreview by tasks.registering {
    group = "verification"
    description = "Embed the approved Assessor IA screen in a debug-only Android asset"
    inputs.files(previewSources)
    outputs.dir(previewAssetsDir)
    doLast {
        var page = previewSources.first().readText(Charsets.UTF_8)
        val cssMarker = "<link rel=\"stylesheet\" href=\"./assessor-brand-assets.css\">"
        check(page.contains(cssMarker)) { "Missing exact Snake Finance branding stylesheet" }
        val css = previewRoot.resolve("assessor-brand-assets.css").readText(Charsets.UTF_8)
        check(css.contains("data:image/png;base64,") && css.contains("data:image/webp;base64,")) {
            "Snake logo or IA brain asset missing"
        }
        page = page.replace(cssMarker, "<style>\n$css\n</style>")
        for (script in assessorScripts) {
            val marker = "<script src=\"./$script\"></script>"
            check(page.contains(marker)) { "Missing Assessor preview script marker: $script" }
            val source = previewRoot.resolve(script).readText(Charsets.UTF_8)
            check(!source.contains("</script", ignoreCase = true)) {
                "Inline script contains an unsafe closing HTML script tag: $script"
            }
            page = page.replace(marker, "<script>\n$source\n</script>")
        }
        check(page.contains("SnakeAssessorNativeNotifications"))
        check(page.contains("SNAKE FINANCE"))
        page = page.replace(
            "<script>\n" + previewRoot.resolve(assessorScripts.first()).readText(Charsets.UTF_8),
            "<script>window.SNAKE_ASSESSOR_PREVIEW_ONLY=true;</script>\n<script>\n" +
                previewRoot.resolve(assessorScripts.first()).readText(Charsets.UTF_8)
        )
        check(page.contains("window.SNAKE_ASSESSOR_PREVIEW_ONLY=true"))
        val out = previewAssetsDir.get().asFile.resolve("assessor-ia-mobile.html")
        out.parentFile.mkdirs()
        out.writeText(page, Charsets.UTF_8)
    }
}

val releaseStorePath = System.getenv("ANDROID_KEYSTORE_FILE")
val releaseStorePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
val releaseKeyAlias = System.getenv("ANDROID_KEY_ALIAS")
val releaseKeyPassword = System.getenv("ANDROID_KEY_PASSWORD")
val hasReleaseSigning = listOf(
    releaseStorePath,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword
).all { !it.isNullOrBlank() }

android {
    namespace = "br.com.meuassessor.capture"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.snakefinance.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 24
        versionName = "1.5.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["snakeAppLabel"] = "Snake Finance"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(releaseStorePath!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                storeType = "PKCS12"
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
                enableV4Signing = true
            }
        }
    }

    buildTypes {
        getByName("debug") {
            // Install side-by-side: NEVER replace the signed production app.
            applicationIdSuffix = ".ia.preview"
            versionNameSuffix = "-assessor-preview"
            manifestPlaceholders["snakeAppLabel"] = "Snake Finance IA (Teste)"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    sourceSets.getByName("debug").assets.srcDir(previewAssetsDir)
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.1")
    testImplementation("junit:junit:4.13.2")
}

// Avoid racing the asset merge task during parallel Gradle execution.
tasks.matching { it.name == "mergeDebugAssets" }.configureEach {
    dependsOn(prepareAssessorPreview)
}
