# Plan illustrations

## October 9 artwork update

The new user-supplied transparent illustrations have distinct roles:

- `program-orb.webp`: circular dumbbell, used only in the Plan creation empty state.
- `recovery-bed.webp`: sculpted bed, used only on the overview recovery card.
- `program-dumbbell.webp`: standalone dumbbell, used only in the active program details card.

These are resized WebP encodings of the three supplied PNGs, preserving their existing alpha transparency and aspect ratio. Their combined size is about 83 KB. The compact overview program summary has no illustration, and generic schedule prompts use a small calendar icon to avoid repeating the empty-state artwork. Original older illustrations remain for existing program/day flows.

The PNG files are user-supplied artwork for the Plan empty state and recovery day.
The older `plan-empty-transparent.png` and `recovery-transparent.png` were edited with the built-in imagegen tool using the original artwork and supplied mockups as references. Both have real alpha transparency. They are retained; existing program-day recovery screens still use the older recovery illustration. The main Plan page uses the distinct WebP artwork described above.

Art direction: retain the diagonal 3D dumbbell, bed silhouette, ascending Z letters, circular disc and small plus signs. Match the mockups with dark emerald shading and mint highlights, remove rectangular backgrounds and excessive neon bloom, and keep transparent padding. The dumbbell disc has no bright outline; the recovery disc has a thin mint rim. No extra text or UI.

Shared palette, Manrope weights and typography roles live in `src/styles/index.css` and are exposed as semantic Tailwind utilities. Plan landing and recovery illustrations render directly on the shared panel background.
