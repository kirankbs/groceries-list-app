# Maestro E2E Tests

[Maestro](https://maestro.mobile.dev) is a mobile UI test framework that drives iOS simulators and Android emulators via YAML flow files.

## Prerequisites

- A running iOS Simulator or Android Emulator with the app installed
- The backend running at `http://localhost:8001` with MongoDB
- A test user account created (flows use `testuser@example.com` / `testpassword123`)

## Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify the install:

```bash
maestro --version
```

## Bundle ID

Every flow file has an `appId` at the top. The current value (`host.exp.Exponent`) targets Expo Go in development.

For a standalone build, replace it with the actual bundle ID from `frontend/app.json`:
- iOS: `expo.ios.bundleIdentifier`
- Android: `expo.android.package`

Update all four flow files, or extract the appId into a shared `config.yaml` once Maestro supports it.

## Running Tests

Run all flows in sequence:

```bash
maestro test maestro/flows/
```

Run a single flow:

```bash
maestro test maestro/flows/login.yaml
```

## Flow Order

The flows are designed to run in sequence — each assumes the previous left the app in a known state:

1. `login.yaml` — authenticates and lands on the Pantry tab
2. `add_item.yaml` — adds "Test Apple" via the FAB
3. `check_item_offline.yaml` — enables airplane mode and checks the item (queues a sync op)
4. `reconnect_sync.yaml` — restores connectivity and verifies the sync queue drains

## Notes

- `tapOn: text` matches rendered text nodes. Placeholder text works for unfocused inputs.
- `toggleAirplaneMode` requires the emulator/simulator to support it (works on Android; on iOS it requires the simulator to be in airplane mode already or use `setLocation` workarounds — verify on your target platform).
- The offline banner (`"Offline"`, `"pending"`, `"Syncing…"`) is only rendered when `isOnline` is false or a sync is in flight. If assertions fail, check that the `useNetworkStatus` hook correctly detects the airplane mode state in the simulator.
