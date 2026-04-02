# NoteSync — Codemagic Build Guide

## Overview

Three build workflows are configured in `codemagic.yaml`:

| Workflow | Trigger | Output | Use For |
|---|---|---|---|
| `android-debug` | Every push | Debug APK | Dev testing |
| `android-release-apk` | Tag `v*` | Signed APK | Tester distribution |
| `android-playstore` | Tag `release-*` | Signed AAB | Google Play upload |

---

## Step 1 — Connect your repo to Codemagic

1. Go to [codemagic.io](https://codemagic.io) and sign up (free tier available)
2. Click **Add application**
3. Choose your Git provider (GitHub / GitLab / Bitbucket)
4. Select the `notesync-android` repository
5. When asked for build config, choose **codemagic.yaml** (not the Flutter wizard)

---

## Step 2 — Upload your Android keystore

> Skip if you don't have one yet — see "Generate a keystore" below.

1. In Codemagic, go to **Teams → Code signing → Android keystores**
2. Click **Add keystore**
3. Upload your `.jks` or `.keystore` file
4. Enter your key alias, key password, and keystore password
5. Name it exactly: **`notesync_keystore`** (must match `codemagic.yaml`)

### Generate a new keystore (if you don't have one)

```bash
keytool -genkey -v \
  -keystore notesync.keystore \
  -alias notesync \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keep this file safe — you need the same keystore for every future update.

---

## Step 3 — Set environment variables

In Codemagic → **Teams → Global variables & secrets**, create a group called **`notesync_env`** and add:

| Variable | Value | Secret? |
|---|---|---|
| `CM_NOTIFY_EMAIL` | your@email.com | No |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | (JSON content — see Step 5) | **Yes** |

---

## Step 4 — Run your first build

### Debug APK (no signing needed)
Just push any commit to your repo — the `android-debug` workflow triggers automatically.

### Signed release APK
```bash
git tag v1.0.0
git push origin v1.0.0
```
The `android-release-apk` workflow triggers and produces a downloadable signed APK.

---

## Step 5 — Google Play publishing (optional)

Only needed for the `android-playstore` workflow.

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup → API access**
3. Link to a Google Cloud project
4. Create a **Service Account** with the **Release Manager** role
5. Download the JSON key file
6. Paste the entire JSON content into the `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` env variable in Codemagic

Then tag a release:
```bash
git tag release-1.0.0
git push origin release-1.0.0
```
The AAB uploads directly to the **Internal testing** track in Play Console.

---

## Step 6 — Promote to production

In Google Play Console:
- Internal → Alpha → Beta → Production

Each promotion is manual so you control rollout.

---

## Build Artifacts

After each build, Codemagic emails you a download link. You can also find artifacts at:

**Codemagic dashboard → Your app → Build → Artifacts tab**

- `app-debug.apk` — install directly on any Android device (enable "Unknown sources")
- `app-release.apk` — signed APK for distribution outside Play Store
- `app-release.aab` — for Play Store submission

---

## Troubleshooting

**`expo prebuild` fails**
→ Make sure `package.json` has all dependencies. Run `npm ci` locally first.

**Keystore not found**
→ Check that the keystore name in Codemagic Code Signing matches `notesync_keystore` exactly.

**Gradle build fails with SDK error**
→ The `local.properties` script in the workflow handles this automatically. If it still fails, check that `compileSdkVersion: 34` is set in `app.json`.

**Notifications not working after install**
→ Go to Android Settings → Apps → NoteSync → Notifications → Enable all.
