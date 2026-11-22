# the duel

The profile README is a single animated SVG (light + dark). Two stick-figure wizards fight
over the intro text: a red/green duel, a beam clash, a knockout, a Super Saiyan comeback, a
Kamehameha, a skeleton, dust, and an awkward cleanup. The loop runs 27.5 s and plays as a plain
`<img>`. It uses SMIL only: no JavaScript, no web fonts, no external requests.

```
assets/duel-light.svg         animated, light theme      (~1.2 MB, ~250 KB gzipped)
assets/duel-dark.svg          animated, dark theme
assets/duel-still-*.svg       static face-off frame for prefers-reduced-motion
README.md                     <picture> that picks the right one
duel/                         the generator (this folder)
preview/                      local review renders (git-ignored)
```

## Regenerate

```bash
cd duel
bun install
bun run build        # writes ../assets/*.svg (under a second)
bun run preview      # contact sheets + 30 fps MP4s of the full loop -> ../preview/
bun run embed        # loads README.md's <picture> in Chromium as a visitor would -> ../preview/embed/
bun run check        # typecheck
```

`preview` and `embed` drive headless Chromium through `playwright-core` 1.62.1. On a new
machine, install the browser once with `bunx playwright-core install chromium-headless-shell`.

## Change things

| What | Where |
|---|---|
| Name, the three lines, smart apostrophe | `src/config.ts` → `CONTENT` |
| Fonts, sizes, line positions | `src/config.ts` → `TYPE` (fonts live in `fonts/`, both SIL OFL) |
| Colours per theme (ink, spells, gold, beam, bones…) | `src/config.ts` → `THEMES` |
| Character proportions | `src/config.ts` → `HERO_DIMS`, `VILLAIN_DIMS` |
| Loop length, poster frame | `src/config.ts` → `DURATION`, `POSTER_T` |
| Phone-width zoom region | `src/config.ts` → `MOBILE` |
| Every beat of the story | `src/choreography.ts` (absolute seconds, act by act) |
| Pose library | `src/rig/poses.ts` |

After changing the text, run `bun src/dev/glyphs.ts` to print glyph positions. Letters are
referenced by line and character (e.g. `L(3, "G")` is the G in "GTM"), so the choreography
follows the layout. Only the beats that aim at specific letters need a look.

## How it works

- **Rig** (`src/rig/`): joint angles drive forward kinematics, so bones never stretch while
  poses blend. Feet plant with two-bone IK (no sliding). Hands reach with IK (pushing up off the
  floor, cupping the Kamehameha, picking up and slotting the letter). A cadence-driven gait solver
  places footsteps from how far the body travels. Each joint samples the pose timeline with its
  own lag, so heads, forearms and wands trail the torso (overlap and follow-through come for free).
- **Timeline** (`src/core/track.ts`, `Fighter.key`): pose-to-pose keys with per-key easing. Every
  channel tweens from the fighter's previous key.
- **Spells** fire at the instant the wand actually points at the target (`shoot()` scans the
  swing), so they always leave the wand tip.
- **Letters** (`src/env/`): every glyph is its own outline path, from OFL fonts via opentype.js.
  They can be knocked, wobbled, shaken (stepped "on twos"), dropped with real bounces, carried,
  and restored.
- **Output** (`src/core/svg.ts`): every animated attribute is sampled at 60 fps, then thinned
  with a Ramer–Douglas–Peucker pass on value error. The SVG keeps only the keys linear
  interpolation needs. The same scene graph also renders the static fallback frame. Base attribute
  values are the poster frame, so a client that ignores SMIL still shows a clean face-off.

## GitHub notes

- Light/dark and reduced motion are chosen by `<picture>` sources. GitHub's sanitizer keeps all
  of them (checked through GitHub's Markdown render API) and wraps them in its `themed-picture`
  element, which follows the viewer's GitHub theme.
- When the image renders under 560 px wide, a CSS media query inside the SVG zooms into the
  central stage so the small lines stay readable on phones.
- The flashes are local radial glows. Nothing flashes full-screen.
