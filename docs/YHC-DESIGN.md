# Islet Atlas visual system

Adapted from the November 10, 2026 Islet Atlas mockup and the proposed YHC design standard (candidate v1.0-rc.1). This applies the proposed design to Islet Atlas; it does not change the approval status of the company-wide YHC standard.

- Primary font: locally hosted Geist Regular and Semibold.
- Metadata, years, counters, and technical labels: Geist Mono.
- Primary ink #171717; secondary text #555555; rules #D8D8D8; shaded surfaces #F0F0F0; white paper.
- White ruled header, horizontal grouped navigation on desktop, collapsible navigation on mobile.
- Thin rules, restrained 2–3px card corners, compact research cards, clear selected states, and visible keyboard focus.
- Homepage: architectural hero, working topic filters, source-backed findings, map entry points, recent records from the curated collection, and research questions.
- Existing routes, research content, APIs, notebook behavior, and authentication remain in place.
- Responsive layouts: four/two/one research-card columns; mobile navigation at 760px; stacked content at narrower widths.

## Assets

`public/fonts/` includes the bundled Geist license. Fonts are served locally.

`public/architecture-hero.jpg` was generated with the built-in image-generation tool for this redesign, then encoded as JPEG. Prompt: “Create a photorealistic black-and-white architectural photograph for an editorial research website hero. Wide landscape 3:2 composition: monumental pale board-formed concrete curved facade and sweeping cantilever, close crop, no windows, no people, no lettering. Structure concentrated on right half with diagonal/curved concrete overhang moving from upper right toward lower center, left half is softly lit pale concrete wall nearly white. Subtle realistic pores and seams, soft daylight, restrained gray shadows. Sophisticated minimalist architectural photography. No text, no UI, no collage.”

The source collection supplies the homepage findings and publication years. Mockup-only confidence values, counts, dates, and synthetic study titles were not imported.

Image and font bytes are stored in `assets/yhc-design-assets.json` and materialized into `public/` by the dev/build entrypoints. This makes text-only source synchronization lossless and avoids external asset services. Generated binary copies are ignored by Git.
