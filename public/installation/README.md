# Installation image assets

All four WebP files preserve the source pixels exactly. They were encoded in lossless mode with no resizing, sharpening, denoising, or generated content. Decoded RGBA pixel equality was verified against each supplied PNG. Source files remain in the user's Downloads folder.

| Asset                   | Supplied source                            | Original dimensions | CSS viewport (x, y, width, height) |
| ----------------------- | ------------------------------------------ | ------------------- | ---------------------------------- |
| recovery-dashboard.webp | Liftwise Recovery Day Dashboard - Copy.png | 851 × 1847          | 0, 0, 851, 1847                    |
| safari-share.webp       | IMG_1633.PNG                               | 1179 × 2556         | 246, 900, 750, 490                 |
| safari-home-screen.webp | IMG_1635.PNG                               | 1179 × 2556         | 48, 1700, 1083, 525                |
| safari-confirm.webp     | IMG_1634.PNG                               | 1179 × 2556         | 0, 180, 1179, 825                  |

The screenshot viewports focus on the relevant action while keeping the original source resolution. The browser address bar in step 1 is a labeled HTML/SVG illustration rather than a screenshot. The phone frame is CSS, and all screenshot text remains untouched.

The four supplied PNGs totaled 6,501,382 bytes. Their lossless WebP equivalents total 2,089,824 bytes (about 68% smaller). Images are hosted locally; the hero loads eagerly, and instruction screenshots load lazily. These assets are not loaded by the installed-app entry point or added to its image precache.
