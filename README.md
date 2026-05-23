# CryptoLife

A phone-simulator life game that teaches real crypto safety — spotting
rug pulls, phishing, wallet drainers and impersonators — by letting the
player live a crypto life and feel the consequences.

This folder is the **app** (Expo / React Native). The design documents
live one level up in `/CryptoLife/`. The canonical references are
`CLAUDE.md` (how the software is built) and `CryptoLife_Design_Bible.md`
(what the game is).

---

## What the tools are (plain language)

If you know React but not mobile, here's the short version:

- **React Native** lets you build a real iOS/Android app using React.
  Same components, props and hooks — but instead of rendering to a web
  page, it renders to native phone UI.
- **Expo** is a toolkit on top of React Native. It handles the painful
  native build, signing and release steps for you, so one codebase
  becomes a real iPhone app and a real Android app.
- **Expo Go** is a free app you install on your phone from the App Store
  or Play Store. It runs this project on your physical phone instantly
  while you develop — no Xcode, no Android Studio needed yet.

---

## Running it for the first time

You need **Node.js** installed on your computer. Then, in a terminal:

```sh
cd /Users/kyle/CryptoLife/cryptolife
npm install        # downloads the libraries — only needed once (and after dependency changes)
npx expo start     # starts the development server
```

> **Heads up — two folders, almost the same name.** The project root is
> `/Users/kyle/CryptoLife/` (design docs). The Expo app is one level
> deeper: `/Users/kyle/CryptoLife/cryptolife/`. macOS treats the two
> names as identical, so always `cd` into the **full path above** — that
> is the only folder with a `package.json`.

`npx expo start` prints a **QR code** in the terminal. To see the app:

- **On your phone:** install **Expo Go**, then scan the QR code
  (iPhone: with the Camera app; Android: from inside Expo Go).
- **In a simulator:** press `i` for the iOS simulator (needs Xcode, Mac
  only) or `a` for the Android emulator (needs Android Studio).

You should see a dark screen with the **CryptoLife** wordmark. That is
the boot screen — proof the scaffold runs. The real game is built on top
of it stage by stage.

---

## Project layout

```
cryptolife/
  app/                 Expo Router entry + top-level flows (added later)
  src/
    engine/            pure game logic — NO React/RN imports
      time/ market/ economy/ scam-director/ social/
    state/             Zustand store + selectors
    save/              SaveAdapter interface, local + cloud adapters
    data/              static content: tokens, scams, milestones, skill tree
    ui/                reusable components (PhoneShell, AppIcon, Banner, ...)
    theme/             design tokens — theme.ts (the only place colours live)
  assets/              images, fonts, sounds
  __tests__/           engine unit tests + the simulation harness
  docs/                design documents
  App.tsx              entry component (currently the boot screen)
  CHANGELOG.md         updated after every coding session
```

**The one rule:** the engine and the screen are separate. Game logic is
pure TypeScript with no React; components only render state and send
input back. See `CLAUDE.md` §5.

---

## Useful commands

```sh
npx expo start          # start the dev server
npx expo start --clear  # start with a cleared cache (fixes odd build errors)
npx tsc --noEmit        # type-check the whole project
```
