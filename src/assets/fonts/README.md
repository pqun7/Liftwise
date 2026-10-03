# Manrope

Unmodified variable TTF from `google/fonts`, commit `b31870aff700ab7a1d74fa0c6887d95beb9e0037`, `ofl/manrope/Manrope[wght].ttf`.

- Size: 164,700 bytes.
- SHA-256: `3ae11c49db0455a3cc33e37d380f20fdb8c7f8b41dc07625c177e3d87a9d6ae6`.
- License: SIL OFL 1.1, copied to `public/fonts/manrope-OFL.txt` and shipped with the application. Liftwise's source license does not replace the font license.
- Loaded from bundled CSS, precached locally; no Google Fonts runtime requests.

The `wght` axis supports 200–800 (default 200). The font includes `tnum` for
tabular numerals. The original TTF remains the canonical source.

`Manrope-{400,500,600,700,800}.woff2` are local static instances generated from
that same source with fontTools' variable-font instancer and WOFF2 encoder.
They retain its copyright/license metadata and use the same shipped OFL.
`src/styles/index.css` registers one Manrope family globally and defines the
shared semantic scale, weights, leading, and tracking. No remote font requests,
runtime font manager, or additional package dependency is used.

These instances are necessary because the Windows WebKit runtime rasterizes
the variable TTF at its default weight even when its reported CSS weight and
layout metrics are correct. Explicit axis binding and a compressed variable
WOFF2 reproduced the same outline problem. The original page-scoped Progress
workaround is now replaced by this application-wide registration. Browser
verification checks glyph widths and screenshots; CSS weight alone is insufficient.

Reproduce each instance with fontTools: load `Manrope-Variable.ttf` using
`TTFont`, call `instantiateVariableFont(font, {'wght': weight})`, set
`font.flavor = 'woff2'`, and save the resulting `Manrope-{weight}.woff2`.
Only these required static faces ship in the current runtime; the source TTF
is retained in the repository without an extra runtime request.
