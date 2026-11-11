export type NewsItem = {
  id: string; title: string; published: string; source: string; url: string;
  category: string; summary: string; significance: string;
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
}].sort((a, b) => b.published.localeCompare(a.published));

export function newsDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}
