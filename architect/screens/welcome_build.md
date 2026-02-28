# Welcome Build (`src/app/welcome.jsx`)

## Purpose
- First-run marketing carousel.
- Entry point into onboarding/auth setup.

## Main Function
- `WelcomeScreen()`
  - Renders a slide carousel (`SLIDES`) with background imagery and messaging.
  - Tracks slide index via `handleScroll`.
  - Routes both CTA buttons to `/onboarding`.

## Local State
- `currentIndex`: active slide for pagination dots.
- `scrollRef`: carousel ref.

## Key Functions
- `handleScroll(event)`
  - Computes active page from horizontal offset.
  - Updates `currentIndex`.
  - Triggers `hapticSelection()` when slide changes.

## Dependencies
- `expo-router` (`useRouter`)
- `useSafeAreaInsets` for bottom button spacing and top logo spacing.
- `expo-linear-gradient` for image readability.
- Haptics service.

## Feature Connections
- Connects cold-start entry to onboarding profile/device setup.
- Visual brand layer only; no backend/store writes here.
