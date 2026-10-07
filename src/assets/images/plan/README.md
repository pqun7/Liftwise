# Plan illustrations

The PNG files are user-supplied artwork for the Plan empty state and recovery day.
The application uses `plan-empty-transparent.png` and `recovery-transparent.png`, edited with the built-in imagegen tool using the original artwork and supplied mockups as references. Both have real alpha transparency; no CSS blending or masking is needed. The original files are retained.

Art direction: retain the diagonal 3D dumbbell, bed silhouette, ascending Z letters, circular disc and small plus signs. Match the mockups with dark emerald shading and mint highlights, remove rectangular backgrounds and excessive neon bloom, and keep transparent padding. The dumbbell disc has no bright outline; the recovery disc has a thin mint rim. No extra text or UI.

Shared palette, Manrope weights and typography roles live in `src/styles/index.css` and are exposed as semantic Tailwind utilities. Plan landing and recovery illustrations render directly on the shared panel background.
