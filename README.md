# Loggy

A personal workout-tracking app built with Expo / React Native, ported from a
high-fidelity HTML/React design prototype.

## Stack

- Expo + Expo Router (file-based routing, `src/app`)
- `@react-native-async-storage/async-storage` for on-device persistence
- `react-native-svg` for icons and the progress mini-chart
- `expo-location` + [Open-Meteo](https://open-meteo.com) for the weather widget
- `expo-notifications` for scheduled routine reminders

## Screens

- **Today** — daily quote, routine timeline, and today's Lifting session
- **Workout Logger** — set-by-set logging with double-progression goals
- **History** — Log / Progress / Maxes
- **Notes** — Notes / Philosophy / Aphorisms (aphorisms can optionally be
  linked to a public Google Sheet — see below)
- **Settings** — schedule alerts, weather toggle, accent color, and in-app
  editors for the daily routine and the Lifting program

All program/routine data is edited in-app and stored locally. The one
exception is aphorisms: from the Aphorisms sub-tab you can link a Google
Sheet (shared as "Anyone with the link can view") with the aphorism in
column A and its attribution in column B — the app fetches it as CSV (no
OAuth/Drive picker), re-syncing whenever that sub-tab is opened, with a
manual "Sync now" and "Unlink" available too. Today's daily-quote card reads
from the same linked data and stays hidden until a sheet is linked.

## Get started

```bash
npm install
npx expo start
```

Use `--web` to preview in a browser, or scan the QR code with Expo Go /a
development build for iOS/Android.

### Troubleshooting: dev server hangs / device won't connect

Prefer plain `npx expo start` (LAN) over `--tunnel` — Expo's shared ngrok
tunnel is currently rate-limited/broken for a lot of people
([expo/expo#43335](https://github.com/expo/expo/issues/43335)) and there's no
ETA for a fix. If LAN mode hangs forever loading the bundle, check these in
order:

1. **Windows Firewall blocking Node on a "Public" network.** If Windows
   classifies your Wi-Fi as Public, an existing Block rule for Node.js on
   that profile silently drops the phone's connection. Check with:
   `Get-NetConnectionProfile` (look at `NetworkCategory`). Fix by setting the
   network to Private (Settings → Network & Internet → Wi-Fi → network name →
   Network profile type), or by removing the conflicting Public Block rule in
   Windows Defender Firewall → Inbound Rules → "Node.js JavaScript Runtime".
2. **"Project is incompatible with this version of Expo Go."** The Play
   Store build of Expo Go often lags behind the SDK version this project
   uses (currently SDK 57) by weeks or months, even when Play Store reports
   it as up to date. Sideload the matching client instead of using the Play
   Store version: https://expo.dev/go?sdkVersion=57&platform=android&device=true
   (or swap `platform=android` for `ios`).

If you still need a tunnel (e.g. a genuinely restrictive network), see the
workarounds in the issue linked above — a personal ngrok account or a
`cloudflared` tunnel now work more reliably than `expo start --tunnel`.

## Building a standalone APK

There's no local Android SDK set up for this project, so builds go through
[EAS Build](https://docs.expo.dev/build/introduction/) (Expo's free cloud
build service) instead of `expo run:android`. The `preview` profile in
`eas.json` is configured to produce a plain installable `.apk` — a fully
standalone build (JS bundle embedded at build time), not a dev-client build,
so it opens straight to the real app with no Metro server or computer needed
afterward.

```bash
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

`eas login` opens a browser to sign in / create a free Expo account. The
first `eas build` run will offer to link/create an EAS project for
Loggy — accept it. The cloud build takes roughly 10–15 minutes; the CLI
prints a build URL you can also open in a browser to watch progress.

Once it finishes, open that build URL (or scan the QR code EAS prints)
directly on your phone and tap **Install** — same "allow installs from this
browser" permission as sideloading Expo Go. `expo-notifications` also only
works correctly in a build like this, not in Expo Go.

## Project layout

```
src/
  app/        expo-router screens (tabs + the workout logger)
  components/ shared UI components
  data/       shared types + small fixed config (routine tag labels/colors,
              the lifting program's id) — no seed content; the app ships empty
  lib/        pure helpers (dates, progression math, storage, weather, notifications)
  store/      AsyncStorage-backed hooks (one per data domain)
  theme/      color tokens, spacing, ThemeContext
```
