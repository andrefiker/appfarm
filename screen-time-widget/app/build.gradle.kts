import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.ghost.screentimewidget"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.ghost.screentimewidget"
        minSdk = 28
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    testOptions { unitTests.isIncludeAndroidResources = true }
    tasks.withType<Test>().configureEach {
        systemProperty("robolectric.dependency.repo.url", "https://repo.maven.apache.org/maven2")
        // JVM does not inherit standard HTTPS_PROXY; honor it for test-only SDK downloads.
        System.getenv("HTTPS_PROXY")?.let { proxy -> val uri = URI(proxy); systemProperty("https.proxyHost",uri.host); systemProperty("https.proxyPort",uri.port.toString()) }
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    signingConfigs.getByName("debug") {
        storeFile = rootProject.file("signing/debug.keystore")
        storePassword = "android"
        keyAlias = "androiddebugkey"
        keyPassword = "android"
        enableV1Signing = false
        enableV2Signing = true
        enableV3Signing = true
    }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.datastore:datastore-preferences:1.1.2")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.core:core-ktx:1.15.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
