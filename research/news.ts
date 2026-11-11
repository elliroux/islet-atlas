export type NewsItem = {
  id: string; title: string; published: string; source: string; url: string;
  category: string; summary: string; significance: string; automatic?: boolean;
};

// Original editorial summaries; dates refer to the source's publication date.
export const news: NewsItem[] = [{
  id: "yale-bukhman-diabetes-program-2026",
  title: "Yale receives $10M for a five-year type 1 diabetes research program",
  published: "2026-11-10",
  source: "Yale School of Medicine",
  url: "https://medicine.yale.edu/news-article/yale-school-of-medicine-bukhman-gift-diabetes-research/",
  category: "Funding & research programs",
  summary: "A Bukhman Foundation gift supports a multidisciplinary program investigating personalized immune profiles, patient-specific disease models, immune tolerance, and the survival of replacement beta cells.",
  significance: "Connects immune protection with beta-cell replacement. This is a research funding announcement; it does not report a demonstrated cure or new clinical results.",
}, {
  id: "diabetes-uk-october-research-2026",
  title: "October research roundup examines vaccines and type 1 diabetes risk",
  published: "2026-11-02", source: "Diabetes UK",
  url: "https://www.diabetes.org.uk/about-us/news-and-views/vaccines-and-type-1-risk-and-dementia-risk-type-2-diabetes-october-2026",
  category: "Prevention & early detection",
  summary: "A research roundup discusses a Norwegian study that found no evidence of a change in type 1 diabetes risk following rotavirus vaccination.",
  significance: "This finding addresses one proposed prevention pathway; it does not rule out other roles for viral infections in T1D.",
}, {
  id: "tegoprubart-kidney-trial-2026",
  title: "New islet-transplant trial includes people with T1D and kidney disease",
  published: "2026-10-21", source: "Breakthrough T1D",
  url: "https://www.breakthrought1d.org/news-and-updates/tegoprubart-islet-transplants-kidney-disease/",
  category: "Clinical trial update",
  summary: "A Breakthrough T1D-funded trial is testing tegoprubart alongside islet transplantation in people with type 1 diabetes and chronic kidney disease. The first participant has received a transplant.",
  significance: "The new trial explores eligibility beyond earlier transplant populations. Its clinical outcomes are still being studied.",
}, {
  id: "easd-research-roundup-2026",
  title: "EASD roundup tracks cell replacement, immune therapies, and early detection",
  published: "2026-10-06", source: "Breakthrough T1D UK",
  url: "https://breakthrought1d.org.uk/news/research-momentum-at-easd-2026/",
  category: "Conference research",
  summary: "A conference recap brings together developments in beta-cell replacement, immunotherapy, screening, and diabetes technology from EASD 2026.",
  significance: "A roundup provides leads for exploration. Individual findings require appraisal of their original studies and trial reports.",
}, {
  id: "gut-bacteria-t1d-risk-2026",
  title: "Study explores early gut bacteria and type 1 diabetes risk",
  published: "2026-09-25", source: "Breakthrough T1D UK",
  url: "https://breakthrought1d.org.uk/news/new-study-looks-at-gut-bacteria-and-type-1-diabetes-risk/",
  category: "Disease origins",
  summary: "Breakthrough T1D reports on Harvard research linking early childhood gut microbiome development with type 1 diabetes risk.",
  significance: "An observed association is a research lead, not evidence that changing gut bacteria prevents diabetes.",
}].sort((a, b) => b.published.localeCompare(a.published));

export function newsDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}
