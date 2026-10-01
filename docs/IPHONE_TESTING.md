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
6. Launch and resume the installed app several times without a hardware keyboard. Confirm “Skip to content” never appears visually in the top safe area.
7. With a hardware keyboard connected, press Tab from the top of the page. Confirm “Skip to content” becomes visible and moves focus to the main content when activated.

## Exercise catalog acceptance

1. Open Exercise Library and confirm the catalog count appears without an external-network error.
2. Search `bench`.
3. Open Filters, choose Body part → Chest, then choose an available Equipment option.
4. Open an exercise and confirm its instructions are readable without horizontal scrolling.
5. For an exercise with paired art (for example Bench Dips), switch Start → Peak and confirm the image/pressed state changes.
6. Open a single-image movement (for example Bench Chest Stretch) and confirm it shows one image without an empty toggle.
7. Create a custom exercise with name, primary/secondary muscles, equipment, and notes.
8. Close Liftwise completely.
9. Enable Airplane Mode and disable Wi-Fi.
10. Reopen Liftwise, search the library, open a previously available detail, and confirm the custom exercise still exists.
11. Confirm no network-dependent error breaks catalog metadata or navigation.
12. If the image pack was downloaded in Settings → Offline Data, confirm the exercise illustrations also load offline.

## Offline behavior

1. While online, visit every route once, then close Liftwise from the app switcher.
2. Enable Airplane Mode and also disable Wi-Fi.
3. Launch Liftwise from its Home Screen icon.
4. Confirm Home renders and all five routes navigate without a network error or blank screen.
5. Close and relaunch it while still offline; repeat navigation.
6. Restore connectivity and confirm no errors appear.

## Program Builder acceptance

1. Open Programs and create “Push Pull Legs”.
2. Confirm the first program becomes Active.
3. Add “Push Day” with a short note.
4. Add Barbell Bench Press from the existing exercise picker.
5. Enter 3 sets, 6–8 reps, 1–2 RIR, and 180 seconds rest; save.
6. Add a custom exercise through the same picker and save a second prescription.
7. Use Move Up and Move Down; confirm order changes immediately.
8. Edit the day and a prescription, close the installed app, then reopen it.
9. Confirm names, notes, exercise identities, ordering, sets, reps, RIR, and rest are exact.
10. Enable Airplane Mode and disable Wi-Fi.
11. Reopen Programs and navigate into the same day.
12. Confirm the complete program remains editable without a network error.
13. Test Duplicate on a day and on the program; confirm content is copied and independently editable.
14. Test Delete, cancel once, then confirm once; verify confirmation protects accidental removal.

WebKit emulation exercises this flow automatically but does not count as physical-device testing.

## Lifecycle and updates

1. Background Liftwise, lock the phone for at least one minute, unlock, and return. Confirm the same route remains usable.
2. Rotate briefly if rotation lock is off; the manifest should prefer portrait and the layout must remain intact.
3. Deploy a changed build, reopen the installed app online, and wait for the update prompt.
4. Dismiss it once and confirm the current app remains usable.
5. Reopen, accept the update, and confirm Liftwise reloads into the new version.

## Data boundary

v0.4.0 contains the Exercise Library and Program Builder but no Live Workout Logger. In Safari Web Inspector, confirm there are no requests to RepDB, GitHub, or exercise-dataset.com during normal use and no application data in `localStorage`. IndexedDB should report schema version 4 with programs, ordered days, prescriptions, exercises, and catalog metadata. Exercise art belongs in versioned Cache Storage; clearing it from the app must leave IndexedDB records unchanged.

Record the iPhone model, iOS version, deployed commit, date, and any deviations in the release issue.
