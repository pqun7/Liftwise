# Manual iPhone test plan

Run this plan on a physical, supported iPhone before releasing an installable build.

## Prepare

1. Build and deploy the exact release commit to an HTTPS URL. Do not use Vite's development server for PWA verification.
2. On the iPhone, open **Settings → Safari → Advanced → Website Data**, find the test host, and remove its old data for a clean-install pass.
3. In Safari, open the HTTPS URL while online.

## Install and launch

1. Confirm the first load has no missing icons, fonts, or layout flashes.
2. Tap **Share → Add to Home Screen → Add**.
3. Confirm the Liftwise icon and name appear on the Home Screen.
4. Launch from the Home Screen. Confirm it opens without Safari chrome and uses the dark status-bar treatment.
5. Check portrait layout on devices with a notch or Dynamic Island: content must clear the top inset and navigation must clear the home indicator.

## Navigation and accessibility

1. Tap Home, Plan, Workout, Progress, and Settings. Confirm each opens once, highlights correctly, and has no horizontal scrolling.
2. Confirm every bottom-navigation target is comfortable to tap one-handed and the label remains legible at the system's larger text sizes.
3. Enable **Settings → Accessibility → Display & Text Size → Larger Text** and inspect headings, cards, prompts, and navigation for clipping.
4. Enable **Reduce Motion** and confirm the experience remains clear.
5. With VoiceOver enabled, swipe through the header, main content, and primary navigation. Confirm meaningful names, selected-link state, and logical order.

## Offline behavior

1. While online, visit every route once, then close Liftwise from the app switcher.
2. Enable Airplane Mode and also disable Wi-Fi.
3. Launch Liftwise from its Home Screen icon.
4. Confirm Home renders and all five routes navigate without a network error or blank screen.
5. Close and relaunch it while still offline; repeat navigation.
6. Restore connectivity and confirm no errors appear.

## Lifecycle and updates

1. Background Liftwise, lock the phone for at least one minute, unlock, and return. Confirm the same route remains usable.
2. Rotate briefly if rotation lock is off; the manifest should prefer portrait and the layout must remain intact.
3. Deploy a changed build, reopen the installed app online, and wait for the update prompt.
4. Dismiss it once and confirm the current app remains usable.
5. Reopen, accept the update, and confirm Liftwise reloads into the new version.

## Data boundary

v0.2.0 contains the versioned domain schema but no workout-management UI. In Safari Web Inspector, confirm there are no unexpected network requests after cached launch and no application data in `localStorage`. IndexedDB should report schema version 2 with the stores documented in `docs/DATABASE.md`; a fresh installation may leave them empty.

Record the iPhone model, iOS version, deployed commit, date, and any deviations in the release issue.
