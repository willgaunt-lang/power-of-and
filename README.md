# The Power of AND — v0.5

Brand-and-experience revision for the DCI Edge Practice Investment Calculator.

## What changed
- Updated primary web palette to DCI blue `#3A6D8E` and Cool Gray 11 `#54565B`.
- Added a restrained overlapping-triangle fractal treatment inspired by the DCI brand guide.
- Updated typography stacks for Adelle and Bernina Sans Condensed, with Arial Narrow/system fallbacks.
- Removed the old Inter/green/teal visual language.
- Rebuilt desktop assumptions as a clean 2 × 2 guided input grid.
- Results remain hidden until **Show Me the Power of AND** is selected.
- After the first reveal, input changes update results live.
- **Edit Assumptions** returns to the input section.
- **Reset Example** restores defaults and hides the results again.
- Chart colors now use DCI blue and Cool Gray.
- Existing v0.4 financial math is unchanged.

## Font note
This project does **not** bundle or redistribute font files. CSS first looks for locally installed Adelle and Bernina Sans Condensed fonts. If unavailable, it falls back to Arial Narrow/Arial for sans-serif text and Georgia for display text. Corporate can add licensed webfont files later if its font license permits web embedding.

## Deploy
Replace `index.html`, `styles.css`, `script.js`, and `README.md` in the GitHub repository, commit, and push. Cloudflare should redeploy automatically.
