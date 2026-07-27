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
- **Notes** — Notes / Philosophy / Aphorisms
- **Settings** — schedule alerts, weather toggle, accent color, and in-app
  editors for the daily routine and the Lifting program

All program/routine data is edited in-app and stored locally — there is no
external data source (see `src/data/` for the default seed data).

## Get started

```bash
npm install
npx expo start
```

Use `--web` to preview in a browser, or scan the QR code with Expo Go /a
development build for iOS/Android.

## Project layout

```
src/
  app/        expo-router screens (tabs + the workout logger)
  components/ shared UI components
  data/       default program/routine/quotes + shared types
  lib/        pure helpers (dates, progression math, storage, weather, notifications)
  store/      AsyncStorage-backed hooks (one per data domain)
  theme/      color tokens, spacing, ThemeContext
```
