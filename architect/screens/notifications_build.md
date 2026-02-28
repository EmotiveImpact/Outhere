# Notifications Build (`src/app/notifications.jsx`)

## Purpose
- Display categorized in-app notifications.
- Provide filter-driven notification views.

## Main Function
- `NotificationsScreen()`

## Local State
- `activeFilter`: one of `All | Club | Challenge | Achievement | Social | Move`

## Core Logic
- `filtered` derived list:
  - `All`: full `NOTIFICATIONS`
  - Specific category: category-matched subset

## Main Interactions
- Back button: `router.back()`
- Category pills: set filter + haptic
- Action CTA on each item: currently haptic-only placeholder

## Dependencies
- `useRouter`
- `useSafeAreaInsets`
- Haptics
- Static local notification dataset (no API/store binding yet)

## Feature Connections
- Entered from Home bell button.
- Ready to be wired to server-driven notification stream.
