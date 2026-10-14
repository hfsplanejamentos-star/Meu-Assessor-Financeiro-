import java.util.zip.ZipFile
plugins { id("com.android.application") }

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
        versionCode = 31
        versionName = "1.5.7"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.1")
    testImplementation("junit:junit:4.13.2")
}

/**
 * Install the exact user-approved splash from the ZIP uploaded to the repository.
 * The original JPG is copied byte-for-byte; no image generation or transformation.
 */
val installApprovedSplash = tasks.register("installApprovedSplash") {
    val sourceZip = layout.projectDirectory.file("src/main/assets/Snake_Finance_Splash_Original_Android.zip")
    val targetJpg = layout.projectDirectory.file("src/main/assets/snake_splash_aprovada.jpg")
    inputs.file(sourceZip)
    outputs.file(targetJpg)
    doLast {
        val zipFile = sourceZip.asFile
        require(zipFile.isFile) { "Missing approved splash archive: $zipFile" }
        ZipFile(zipFile).use { archive ->
            val entry = archive.entries().asSequence().firstOrNull {
                !it.isDirectory && it.name.substringAfterLast('/') == "snake_splash_aprovada.jpg"
            } ?: error("Approved splash JPG not found inside archive")
            val destination = targetJpg.asFile
            destination.parentFile.mkdirs()
            archive.getInputStream(entry).use { input ->
                destination.outputStream().use { output -> input.copyTo(output) }
            }
            require(destination.length() > 0) { "Approved splash JPG is empty" }
            val header = destination.inputStream().use { it.readNBytes(3) }
            require(header.size == 3 && header[0] == 0xFF.toByte() &&
                header[1] == 0xD8.toByte() && header[2] == 0xFF.toByte()) {
                "Approved splash is not a JPEG"
            }
        }
    }
}
// Fail the build rather than silently shipping the previous screenshot-based splash.
val verifyCorrectedSplash = tasks.register("verifyCorrectedSplash") {
    val correctedPng = layout.projectDirectory.file("src/main/assets/snake_splash_aprovada_corrigida.png")
    doLast {
        val png = correctedPng.asFile
        require(png.isFile && png.length() > 100_000) {
            "Missing approved clean splash PNG: ${png.path}. Copy it from snake_finance_splash_asset_para_android.zip before building."
        }
        val signature = png.inputStream().use { it.readNBytes(8) }
        require(signature.contentEquals(byteArrayOf(
            0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
        ))) { "Approved splash is not a valid PNG file" }
    }
}
tasks.named("preBuild") { dependsOn(installApprovedSplash, verifyCorrectedSplash) }
