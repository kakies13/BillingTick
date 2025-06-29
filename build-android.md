# 🚀 Android APK Build Kılavuzu

Bu doküman, BillingTick React Native uygulamasının Android APK'sını oluşturma sürecini açıklar.

## 📋 Gereksinimler

### 1. Android Geliştirme Ortamı
- **Android Studio** (en son sürüm)
- **Android SDK** (API Level 21 veya üstü)
- **Java JDK 17** veya **OpenJDK 17**

### 2. React Native CLI
```bash
npm install -g @react-native-community/cli
```

### 3. Android SDK Yolu
Aşağıdaki ortam değişkenlerini ayarlayın:

**Windows (PowerShell):**
```powershell
$env:ANDROID_HOME = "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🔨 Build Adımları

### 1. Bağımlılıkları Yükle
```bash
cd BillingTickRN
npm install
```

### 2. Android Klasörüne Git
```bash
cd android
```

### 3. Gradle Build
```bash
# Debug APK oluştur
./gradlew assembleDebug

# Release APK oluştur (Signing gerekli)
./gradlew assembleRelease
```

### 4. APK Dosyasını Bul
APK dosyası şu konumda oluşturulur:
```
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release.apk
```

## 🔐 Release APK için Signing

### 1. Keystore Oluştur
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore billingtick-release-key.keystore -alias billingtick-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. gradle.properties Güncelle
`android/gradle.properties` dosyasına ekle:
```properties
BILLINGTICK_UPLOAD_STORE_FILE=billingtick-release-key.keystore
BILLINGTICK_UPLOAD_KEY_ALIAS=billingtick-key-alias
BILLINGTICK_UPLOAD_STORE_PASSWORD=***
BILLINGTICK_UPLOAD_KEY_PASSWORD=***
```

### 3. build.gradle Güncelle
`android/app/build.gradle` dosyasında signing config:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('BILLINGTICK_UPLOAD_STORE_FILE')) {
                storeFile file(BILLINGTICK_UPLOAD_STORE_FILE)
                storePassword BILLINGTICK_UPLOAD_STORE_PASSWORD
                keyAlias BILLINGTICK_UPLOAD_KEY_ALIAS
                keyPassword BILLINGTICK_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## 🚀 Hızlı Build Script

### build-apk.bat (Windows)
```batch
@echo off
echo 🔨 Building BillingTick Android APK...
cd /d "%~dp0"
call npm install
cd android
call gradlew clean
call gradlew assembleDebug
echo ✅ APK oluşturuldu: android\app\build\outputs\apk\debug\app-debug.apk
pause
```

### build-apk.sh (macOS/Linux)
```bash
#!/bin/bash
echo "🔨 Building BillingTick Android APK..."
npm install
cd android
./gradlew clean
./gradlew assembleDebug
echo "✅ APK oluşturuldu: android/app/build/outputs/apk/debug/app-debug.apk"
```

## 📋 Sorun Giderme

### 1. Gradle Build Hatası
```bash
# Gradle cache temizle
cd android
./gradlew clean

# Metro bundler cache temizle
npx react-native start --reset-cache
```

### 2. SDK Lisans Hatası
```bash
# SDK lisanslarını kabul et
%ANDROID_HOME%\tools\bin\sdkmanager --licenses
```

### 3. ML Kit Bağımlılık Hatası
`android/app/build.gradle` dosyasında şu satırları kontrol edin:
```gradle
implementation 'com.google.android.gms:play-services-mlkit-text-recognition:19.0.0'
```

### 4. Camera İzin Hatası
`android/app/src/main/AndroidManifest.xml` dosyasında izinleri kontrol edin:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

## 📱 Test Etme

### 1. Emulator'de Test
```bash
# Android emulator başlat
npx react-native run-android
```

### 2. Fiziksel Cihazda Test
1. USB Debugging'i aç
2. Cihazı bilgisayara bağla
3. `adb devices` ile cihazı kontrol et
4. `npx react-native run-android` komutunu çalıştır

### 3. APK Kurulumu
```bash
# APK'yi cihaza kur
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🌍 Çoklu Dil Testi

Uygulamayı farklı dillerde test etmek için:
1. Cihaz dilini değiştir (Ayarlar > Dil)
2. Uygulamayı yeniden başlat
3. Desteklenen diller: İngilizce, Türkçe, Almanca

## ✅ Başarılı Build Kontrol Listesi

- [ ] Tüm kütüphaneler yüklendi
- [ ] Android SDK ayarlandı
- [ ] Gradle build başarılı
- [ ] APK dosyası oluşturuldu
- [ ] Kamera izinleri çalışıyor
- [ ] OCR işlevi test edildi
- [ ] Çoklu dil desteği kontrol edildi
- [ ] Fatura analizi doğru çalışıyor

## 📞 Destek

Sorunlarla karşılaştığınızda:
1. Bu dokümanı tekrar kontrol edin
2. React Native ve Android Studio sürümlerini güncelleyin
3. GitHub Issues bölümünden yardım alın 