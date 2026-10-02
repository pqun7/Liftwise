# Program templates

Liftwise supplies editable, evidence-informed starting points for healthy adults—not individualized prescriptions, universal optimums or official ACSM/NSCA routines.

## Definitions (version 1)

| Stable ID       | Schedule                                           | Intended context                                         |
| --------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `full-body-3`   | Mon/Wed/Fri, Full Body A/B/C                       | Beginner/general; non-consecutive whole-body sessions    |
| `upper-lower-4` | Mon Upper A, Tue Lower A, Thu Upper B, Fri Lower B | Intermediate; balanced twice-weekly upper/lower exposure |
| `ppl-6`         | Mon–Sat Push/Pull/Legs A then B                    | Experienced users with suitable recovery and schedule    |
| Custom          | User-selected weekdays                             | Empty weekday-named days; choose exercises yourself      |

Real exercise menus and exact targets live in `src/features/plan/programTemplates.ts`. Definitions reference stable catalog IDs, not copies of RepDB records. Full Body contains 5–6 exercises per day, Upper/Lower 5–6, and PPL 5. Catalog-supported choices include dumbbell shoulder press and lying EZ-bar triceps extension instead of unavailable exact variants.

Compound defaults: 3 × 6–10, RIR 1–3, 150s rest. Secondary defaults: 3 × 8–12, RIR 1–3, 120s. Isolation defaults: 2 × 10–15, RIR 1–3, 90s; lateral/rear raises use 12–20. Individual menus override sets/ranges where appropriate. These are curated app choices, not claims that evidence specifies one exact menu, RIR or rest interval. Adjust to ability, equipment, goals and recovery. Newly picked isolation exercises use isolation defaults; other/custom movements use editable compound defaults.

## Evidence reviewed 2026-10-02

- [ACSM 2026 position stand announcement](https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/) and [official practical infographic](https://www.acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf): consistency, regular major-muscle training, goal-specific volume and practical individualization inform the templates. Exact Liftwise routines are our interpretation, not ACSM endorsement.
- [NSCA resistance-training frequency guidance](https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/): non-consecutive beginner full-body training and intermediate splits inform scheduling; higher frequency requires attention to experience and recovery.
- [NSCA Program Design Essentials](https://www.nsca.com/education/tools-and-resources/program-design-essentials/) provides the professional design framework. [Essentials of Strength Training and Conditioning, fifth edition](https://www.nsca.com/certification/cscs/essentials-of-strength-training-and-conditioning-5th-edition/) is a reference, not a claim that the full textbook was reproduced or reviewed here.

## Ownership and safety

Preview before applying. Replacing existing days/targets requires confirmation. Application validates all exercise references and creates days/prescriptions atomically; failure leaves the original program intact. Definition versions remain separate from user records. Applied programs are user-owned: future template changes never rewrite them. Weekday is Monday-first and distinct from the editable workout name. Moving an exercise preserves its prescription/ID; copying creates a prescription ID, not an exercise record. Same-day accidental duplicates are rejected.

Changes commit through existing repositories. Save Program finalizes the draft. Starting a workout snapshots prescription values; later program edits or deletion do not rewrite history. New Quick Workout creation is absent from product UX, while existing unplanned sessions remain resumable and visible in history/backups.

Duration labels are rough planning estimates, not measured workout time: 45s per set + prescribed rests between sets + 60s between exercises, rounded up to 5 minutes. Unknown sets/rest omit the estimate. Actual duration remains timestamp-derived. No data/schema/backup migration, network service or new dependency is required.
