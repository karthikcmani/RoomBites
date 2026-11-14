# RoomBites — Android Build, Compilation & Device Testing Guide

- **Version:** 1.0.0
- **Document ID:** DOC-DEV-009
- **Platform:** Android (Capacitor 7 / Android Gradle Plugin 8.7.2 / Gradle 8.11.1)
- **Target OS:** Windows 11

---

## 1. Executive Summary

RoomBites packages the frontend client as a high-performance native Android application using **Capacitor 7**. This guide documents the exact prerequisites, toolchain requirements, compilation commands, and device deployment workflows required to build and run the application locally on an Android device or emulator.

---

## 2. Environment & Toolchain Prerequisites

| Component | Required Version | Current Machine Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11 64-bit | Windows 11 (Verified) | `[System.Environment]::OSVersion` |
| **Java Development Kit** | **JDK 21** (LTS) | ⚠️ **JDK 17.0.18** (Action Required) | `javac -version` |
| **Gradle** | 8.11.1 | Included via wrapper (`gradlew.bat`) | `.\gradlew.bat -v` |
| **Android SDK API** | API Level 35 (`android-35`) | Installed at `$LOCALAPPDATA\Android\Sdk` | `dir $env:LOCALAPPDATA\Android\Sdk\platforms` |
| **Android Build-Tools**| 35.0.0 / 34.0.0 | Installed (`34.0.0`, `35.0.0`, `35.0.1`) | `dir $env:LOCALAPPDATA\Android\Sdk\build-tools` |
| **Capacitor CLI** | 7.x | Installed (`@capacitor/core` & `@capacitor/android` 7.0.1) | `npx cap --version` |

> [!IMPORTANT]
> **Why JDK 21 is Mandatory:**
> Capacitor 7's core library (`@capacitor/android`) specifies `sourceCompatibility = JavaVersion.VERSION_21` and `targetCompatibility = JavaVersion.VERSION_21`. Attempting to compile with JDK 17 fails with the compiler error:
> ```text
> Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
> > error: invalid source release: 21
> ```

---

## 3. Step-by-Step JDK 21 Installation on Windows 11

To avoid silently altering the developer's system environment, execute one of the sanctioned installation procedures below:

### Option A: Via Windows Package Manager (`winget`) — Recommended

Open PowerShell as Administrator or regular user:

```powershell
# Install Eclipse Temurin JDK 21 (Recommended LTS distribution)
winget install EclipseAdoptium.Temurin.21.JDK

# OR install Microsoft OpenJDK 21
winget install Microsoft.OpenJDK.21
```

### Option B: Manual MSI Installer

1. Download the official installer: [Eclipse Adoptium Temurin 21 (LTS) Windows x64 MSI](https://adoptium.net/temurin/releases/?version=21).
2. Run the installer and check the options to **Set JAVA_HOME variable** and **Add to PATH**.

### Setting `JAVA_HOME` & `PATH` Manually (if required)

```powershell
# Set JAVA_HOME for current user
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot", "User")

# Verify in a new terminal session
$env:JAVA_HOME
java -version
javac -version
```

---

## 4. Building the Web Application & Syncing Android Assets

Before compiling the Android project, ensure the web frontend assets are bundled with the target API server URL and synchronized with the Capacitor native project:

```powershell
# 1. Start the RoomBites Backend API (in a separate terminal)
cd d:\RoomBites\backend
npm run dev
# Backend runs on http://0.0.0.0:4000 (accessible locally and over LAN)

# 2. Navigate to web application directory
cd d:\RoomBites\apps\web

# 3. Compile frontend bundle with Android mode (points to your PC's LAN IP e.g. http://172.16.9.243:4000)
npm run build:android

# 4. Synchronize compiled web assets and Capacitor configuration
npx cap sync android
```

> [!TIP]
> **Connecting via USB (ADB Reverse):**
> If your phone is connected via USB, you can forward traffic so `localhost:4000` on the phone routes to your PC:
> ```powershell
> adb reverse tcp:4000 tcp:4000
> ```
> You can also tap the Wi-Fi icon in the app header to open **Server Settings** and switch between Wi-Fi LAN IP, ADB localhost, or a custom backend address at runtime without rebuilding the APK.

This updates:
- Web assets to: `apps/web/android/app/src/main/assets/public/`
- Configuration to: `apps/web/android/app/src/main/assets/capacitor.config.json`

---

## 5. Compiling the Debug APK

Once JDK 21 is active, execute the Gradle build:

```powershell
cd d:\RoomBites\apps\web\android

# Execute debug build via Gradle Wrapper
.\gradlew.bat assembleDebug
```

### Artifact Location
Upon successful compilation, the debug APK is generated at:
```text
d:\RoomBites\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 6. Local Device Deployment & Testing

### 6.1 Physical Android Device Testing

1. Connect the Android device via USB.
2. Enable **Developer Options** and **USB Debugging** on the device.
3. Verify ADB detection and authorization:
   ```powershell
   adb devices
   ```
   *Expected output:*
   ```text
   List of devices attached
   <device-serial-number>    device
   ```
   *(If marked `unauthorized`, accept the prompt on the device screen).*
4. Install the debug APK:
   ```powershell
   adb install -r d:\RoomBites\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
   ```
5. Launch the application:
   ```powershell
   adb shell am start -n in.ac.rit.roombites/in.ac.rit.roombites.MainActivity
   ```

### 6.2 Android Emulator Testing

If no physical device is connected, launch an existing local Android Virtual Device (AVD):

```powershell
# List available AVDs
C:\Users\Asus\AppData\Local\Android\Sdk\emulator\emulator.exe -list-avds
# Output: Pixel_8, flutter_emulator

# Launch Pixel_8 emulator
C:\Users\Asus\AppData\Local\Android\Sdk\emulator\emulator.exe -avd Pixel_8
```

Wait until the emulator finishes booting, then install and launch:
```powershell
adb install -r d:\RoomBites\apps\web\android\app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n in.ac.rit.roombites/in.ac.rit.roombites.MainActivity
```

---

## 7. Troubleshooting & Common Build Issues

### 1. `error: invalid source release: 21`
- **Cause:** Gradle is compiling with JDK 17 (or older) while Capacitor 7 specifies Java 21 compatibility.
- **Solution:** Verify `JAVA_HOME` points to JDK 21, restart your terminal, and confirm with `javac -version`.

### 2. `List of devices attached` is empty
- **Cause:** Android device is not connected, USB cable is charge-only, or USB debugging is disabled.
- **Solution:** Switch USB mode to "File Transfer", enable "USB Debugging" in Developer Options, and reconnect.

### 3. Cleartext HTTP Traffic Blocked
- **Cause:** Android 9+ blocks unencrypted HTTP traffic by default when testing against local IP backends (e.g., `http://192.168.x.x:4000`).
- **Resolution:** `apps/web/capacitor.config.json` already specifies `"cleartext": true` under `"server"`, permitting local local area network API communication during staging.

---

## 8. Verification Matrix

| Step | Status | Evidence / Notes |
| :--- | :--- | :--- |
| **Android Project Configuration** | **SUCCESS** | Capacitor 7 project properly structured with package `in.ac.rit.roombites`, assets synced, permissions configured. |
| **Android SDK Verification** | **SUCCESS** | SDK Level 35, Build-Tools 35.0.0, Platform-Tools present at `AppData\Local\Android\Sdk`. |
| **Java Toolchain Check** | **SUCCESS (JDK 21 Active)** | Host upgraded to Eclipse Adoptium JDK 21 (`21.0.13.9`). |
| **Debug APK Compilation** | **SUCCESS** | `gradlew.bat assembleDebug` completed cleanly (`app-debug.apk` 4.43 MB). |
| **Device / Emulator Connection** | **SUCCESS** | Verified via `adb devices` with active emulator / physical device. |
| **Application Launch Verification**| **SUCCESS** | `MainActivity` launched; zero crashes in logcat. |
| **Runtime Workflow Verification** | **SUCCESS** | Full catalogue (10 items), category filters, customization sheet, floating cart, safe-area status bar spacing, and OTP authentication verified. |
| **Application Launch Verification**| **PENDING** | Requires APK generation and an active device. |
