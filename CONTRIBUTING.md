# Contributing to Islet Atlas

Families, researchers and developers can [open an issue](https://github.com/elliroux/islet-atlas/issues) with a correction, a research question or a reproducible bug. For a code or evidence change, fork the repository, commit the change on a branch and open a pull request against main. Explain the change, link the evidence and describe what you checked. Contributors can also maintain independent forks under the project license.

## Evidence contributions

Pick one finding. Describe the population, stage, comparator, endpoint and follow-up. Cite the DOI, PMID, registry record or repository and the exact table, figure, or passage. Explain uncertainty, selection limits, and known cohort reuse. Distinguish a result from a hypothesis and a negative trial from an administrative stop. Mark unknowns explicitly. Include public metadata and your own summaries. Keep restricted participant data, medical records and third-party full text out of submissions.

## Code contributions

Work on a branch in your fork. Explain the user-facing change and how to reproduce it. Run pnpm exec tsc --noEmit and pnpm build. For evidence changes, open the finding through the normal research workflow and verify its source. In a shared repository, submit a pull request and invite code or evidence review as appropriate.

## Good first tasks

- Check a source locator or flag overlapping participants in a study family.
- Add a second cross-cohort comparison using public aggregate results and uncertainty intervals.
- Improve screen-reader access, keyboard navigation or small-screen comparison tables.
