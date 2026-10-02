# Manual iPhone test plan

Run this plan on a physical, supported iPhone before releasing an installable build.

## v0.9 release-candidate QA matrix

- Automated: domain/repository/migration/backup tests and production-browser offline flows.
- WebKit emulation: 320/375/390/393/414/430px portrait, large text, focus and landscape. This is not an iPhone keyboard, Dynamic Island or storage-eviction test.
- Physical iPhone: **pending**. Record device/iOS/build and results; follow `SOAK_TESTING.md` across multiple gym sessions before v1.0.

On the installed PWA, check notch/Dynamic Island and home-indicator spacing; bottom navigation, update messages, Current/Undo and focused controls must not obscure actions. Repeat with larger system text, VoiceOver and Reduce Motion. Editable mobile controls must compute to at least 16px; manual pinch zoom remains enabled.

Enable **Keep screen awake while training**. Verify visibility return, pause/resume, leaving/finishing the workout release and reacquire appropriately. Denial/unsupported/Low Power Mode must never block training. Repeat offline after caching/installing. During an active and a paused workout, activate an update from another tab: this screen must not reload; finish and explicitly apply afterward.

Use a separate test profile for quota/failure tests. Unknown storage estimates or persistence API failures must be reported honestly; downloaded media can be cleared without touching user data. Keep external backups: no browser persistence guarantee is made.

## Prepare

1. Build and deploy the exact release commit to an HTTPS URL. Do not use Vite's development server for PWA verification.
2. Use a dedicated test host/profile for the clean-install pass. Only after exporting and verifying an external backup of any existing test data, open **Settings → Safari → Advanced → Website Data** and remove that test host's data. Never clear the only copy of real training data.
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

## Form focus and zoom acceptance (v0.6.1)

Editable mobile controls must compute to at least 16 CSS px to avoid unwanted iOS/WebKit focus auto-zoom. Manual pinch zoom must remain enabled.

1. Open the installed Liftwise PWA on a physical iPhone and go to Plan → Create Program. Confirm the keyboard does not open on page load.
2. Tap Program Name, type, and confirm the keyboard opens without viewport auto-zoom.
3. Dismiss the keyboard and confirm the original page scale remains.
4. Repeat with multiline Program Description/Notes.
5. Create a day; check Day Name and Day Notes, including no automatic focus on page load.
6. Add an exercise; check prescription numeric fields and Exercise Notes.
7. Check Custom Exercise Name and Exercise Library Search.
8. Manually pinch-zoom and confirm it still works.
9. At narrow portrait width, confirm fields wrap and fit, with no horizontal scrolling or bottom-navigation overlap.

WebKit emulation checks computed font sizes and layout at 320, 375, 390, 393, 414, and 430 CSS px. It cannot prove physical iPhone keyboard or zoom behavior.

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

## Data Safety acceptance

1. While online, create a custom exercise and a program that uses both it and one RepDB exercise. Note the exact day/exercise ordering and prescription values.
2. Open **Settings → Data Safety**. Confirm Database health is Healthy and that storage usage/persistence is described without promising permanent storage.
3. Tap **Create Backup**. Confirm iOS presents or saves a file named `liftwise-backup-YYYY-MM-DD.json`; move it to Files/iCloud Drive or another location outside Safari website data.
4. Tap **Restore Backup**, choose that file, and confirm the preview date and entity counts are accurate. Do not confirm yet; verify current data is unchanged.
5. Use **Download current data first** and keep the safety copy.
6. Confirm restore, then close Liftwise from the app switcher and reopen it. Confirm the exact custom exercise, program order, RepDB reference, and prescriptions remain.
7. Repeat the open/inspect flow in Airplane Mode with Wi-Fi disabled. No restore or data screen should require a remote API.
8. Create a second temporary user record. In the danger zone, verify the delete button remains disabled until `DELETE` is entered exactly. Delete user data and confirm RepDB exercises still browse normally.
9. Confirm previously downloaded exercise images remain after user-data deletion. Then use **Clear Offline Exercise Images** and confirm it does not remove restored user records.
10. Restore the backup again and verify the exact reconstruction after an app restart.

The automated Mobile Safari project covers this logical round trip, including offline verification, but physical iOS file-picker/download behavior and browser storage eviction still require this real-device pass.

## Workout recovery acceptance

1. Create and activate a program day containing Bench Press at 3 sets × 8 reps with a 180-second rest.
2. Open Workout, start that planned day, and confirm the displayed prescription is 3 × 8.
3. Enter and complete two sets. Background Liftwise, lock the phone, then force-close and reopen the installed app.
4. Confirm the unfinished-workout card appears. Resume it and verify both completed sets appear exactly once.
5. Complete another set and confirm the rest timer continues from its real end timestamp after backgrounding; it must not restart from 180 seconds.
6. Pause and resume the workout, add a custom or RepDB exercise, reorder it, add a set, and confirm every change survives another reopen.
7. Finish the workout. Edit the program prescription to 4 × 6, then open the completed workout from Recent workouts and confirm its history still shows 3 × 8.
8. Start a Quick Workout without a program, add an exercise, complete a set, and confirm recovery after reopen.
9. Repeat the planned or quick flow in Airplane Mode with Wi-Fi disabled. No set action, recovery screen, timer, exercise picker, or history screen may require network access.
10. While a workout is active, deploy a new build and confirm accepting an update cannot force a reload; finish or discard the workout before applying it.

Record any loss, duplicate set, stale prescription, timer restart, or forced update reload as a release blocker.

## Lifecycle and updates

1. Background Liftwise, lock the phone for at least one minute, unlock, and return. Confirm the same route remains usable.
2. Rotate briefly if rotation lock is off; the manifest should prefer portrait and the layout must remain intact.
3. Deploy a changed build, reopen the installed app online, and wait for the update prompt.
4. Dismiss it once and confirm the current app remains usable.
5. Reopen, accept the update, and confirm Liftwise reloads into the new version.

## Program Builder reference acceptance (physical test pending)

1. Plan → Create Program: compare header, stepper, details card, goal/level controls and CTA with the first reference screen. Focus every text field; verify no automatic zoom and retain manual pinch zoom.
2. Choose weekdays and a split; change a weekday deliberately, then change templates. Confirm the choice stays intact. At 375/390/430px confirm all seven days are readable; only the selector may scroll at 320px.
3. Add built-in and custom exercises, edit prescriptions/rest/notes, change day tabs and reorder using the handle's Up/Down alternatives. Compare the third reference screen; no actual weight/set logger belongs here.
4. Back through builder steps, reload and reopen a saved draft. Verify exact metadata and prescriptions. Attempt to leave unsaved field edits; verify Keep editing and Leave behavior.
5. Review and Save without starting a workout. Start separately through Workout and confirm prescription snapshots. Repeat after cache readiness in Airplane Mode; test keyboard scrolling, safe areas and VoiceOver.

## Data boundary

v0.9.0 includes the Exercise Library, Program Builder, Data Safety, durable workouts, history and local charts. In Safari Web Inspector, confirm no requests to RepDB, GitHub or exercise-dataset.com during normal use and no critical data in `localStorage`. IndexedDB remains schema version 6; backup format remains v2. Exercise art belongs in independently clearable Cache Storage; clearing it must leave user records unchanged.

Record the iPhone model, iOS version, deployed commit, date, and any deviations in the release issue.

## Home visual and recovery acceptance (pending physical device)

1. Open the installed PWA: verify the compact green-black Home, Local pill and safe-area-aware bottom navigation, with no hardware frame/status bar imitation.
2. With an active program containing exercises, verify today's suggested day and real prescription counts. Select another weekday and return to today; this must not alter the program or create a workout.
3. Tap Start Workout, complete a set, then return Home. Confirm the in-progress hero reports the exact saved state; Continue returns to that session. Finish and confirm rest-day/recent-history content.
4. After installation/cache readiness, enable Airplane Mode and repeat navigation/recovery. Confirm all three Home photographs load; this does not require the optional RepDB image pack.
5. Verify narrow-screen calendar scrolling, 44px touch targets, VoiceOver day/status names, keyboard focus, pinch zoom, Reduce Motion and navigation clear of the home indicator. Desktop browser checks do not substitute for these physical-device steps.
