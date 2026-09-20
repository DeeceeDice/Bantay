import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin
    // Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Release signing is read from android/key.properties, which is deliberately
// git-ignored so no keystore or password is ever committed. When the file is
// absent - a fresh clone, or a CI run with no signing secrets configured -
// the build falls back to the debug key so it still produces an installable
// APK for testing. Only a properly signed build is fit for the Play Store;
// see docs/RELEASING.md.
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasReleaseSigning = keystorePropertiesFile.exists()
if (hasReleaseSigning) {
    keystorePropertiesFile.let { FileInputStream(it).use(keystoreProperties::load) }
}

android {
    namespace = "com.deeceedice.bantay"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.deeceedice.bantay"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = keystoreProperties["storeFile"]?.let { file(it) }
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
            // Code shrinking is left off by default: it changes runtime
            // behaviour and needs a real device test before it can be
            // trusted. proguard-rules.pro already holds the keep rules, so
            // turning this on is a one-line change once you can test a
            // release build on hardware. See docs/RELEASING.md.
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
