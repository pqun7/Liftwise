# Personal release-candidate soak plan

Status: planned, not performed. v0.9 automated checks do not establish physical gym reliability.

Perform at least five real sessions across one week on an installed iPhone PWA. Record device/iOS version, app/tag, network state, battery mode, observed issue, reproducible steps and backup timestamp. Keep backups outside Safari website data.

1. Planned workout online: compare prescriptions/previous data, log/correct/undo sets and finish. Check exact history and CSV.
2. Planned workout in Airplane Mode (Wi-Fi off): log two sets, lock/background/force-close/reopen and recover exactly once. Rest continues from timestamps.
3. Quick Workout offline: add/reorder/skip/session-replace exercises; recover and finish without modifying programs.
4. Low Power Mode: enable screen-awake; denial or revocation must not block training. Hide/return, pause/resume, leave workout and verify release/reacquisition behavior.
5. Update/storage/data safety: open another tab with a new deployed build during active/paused training; no forced reload. Finish then explicitly update. Download/clear only media, verify user data, export backup and restore a safety copy on a spare browser profile.

Check VoiceOver, larger system text, landscape, notch/home-indicator spacing, keyboard dismissal and manual pinch zoom during these sessions. Do not induce storage exhaustion on the only copy of valuable data.

## Severity and release decision

- Critical: data loss/corruption, destructive failed restore, historical identity/prescription corruption. Stop release; preserve backup and reproduction.
- High: blocked offline core flow, unrecoverable workout, forced reload during training, inaccessible essential action. Stop v1.0 until fixed and reverified.
- Medium: recoverable performance/layout/error-message defect. Record workaround, owner and follow-up.
- Low: cosmetic/non-blocking polish. Record without expanding feature scope.

v1.0 requires no known unresolved Critical or High defect, completed physical acceptance and a reviewed issue log. Do not convert pending checks into passes.
