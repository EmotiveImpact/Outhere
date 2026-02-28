# Root Layout Build (`src/app/_layout.jsx`)

## Purpose
- Global app shell bootstrap.
- Initializes auth/device state before rendering navigation.

## Main Function
- `RootLayout()`

## Startup Responsibilities
- Calls `initiate()` from auth module.
- Calls `initializeDevice()` from `useUserStore`.
- Loads custom fonts.
- Holds splash screen until auth + fonts are ready.

## Providers
- `QueryClientProvider` for React Query
- `GestureHandlerRootView` for gesture-enabled UI

## Navigation Graph
- Root `Stack` with hidden headers.
- Main child route: `(tabs)` group.

## Feature Connections
- Everything else depends on this layout for:
  - query caching
  - gesture support
  - initialized device identity
