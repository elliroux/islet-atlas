import type { Metadata } from "next";
import TrajectoryExplorer from "../../components/TrajectoryExplorer";
import ShareDesign from "./share-design";
import "./style.css";

const pageUrl = "https://isletatlas.org/trajectories";
const description = "Explore an open research design connecting biological changes over time, early type 1 diabetes autoimmunity, mechanisms, and evidence for intervention.";

export const metadata: Metadata = {
  title: "Trajectories · Public Design Preview · Islet Atlas",
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: "Islet Atlas Trajectories — an open research design",
    description,
    url: pageUrl,
    type: "website",
    siteName: "Islet Atlas",
    images: [{ url: "https://isletatlas.org/trajectories/social-preview.png", width: 1200, height: 630, alt: "Islet Atlas Trajectories: connecting early biological changes in type 1 diabetes. Public design preview." }],
  },
  twitter: { card: "summary_large_image", title: "Islet Atlas Trajectories", description, images: ["https://isletatlas.org/trajectories/social-preview.png"] },
};

const feedbackUrl = "https://github.com/elliroux/islet-atlas/issues/new?" + new URLSearchParams({
  title: "Trajectories design feedback: ",
  body: "Public design preview: https://isletatlas.org/trajectories\n\nWhat would you improve or test next?\n\nRelevant view or section:\n\nSuggestion, missing evidence, or alternative explanation:\n\nSupporting source, if applicable:\n\nPlease include only information you intend to make public; no personal health records are needed.",
}).toString();

export default function TrajectoriesPage() {
  return (
    <main className="atlas-page trajectories-page">
      <section className="tr-intro" aria-labelledby="tr-title">
        <div className="tr-meta"><p className="atlas-kicker">Trajectories</p><span className="tr-status">Public design preview</span></div>
        <h1 id="tr-title">Connecting early biological changes in type 1 diabetes</h1>
        <p className="tr-deck">A proposed research workspace for following changes over time, understanding what might explain them, and examining the evidence for influencing those processes.</p>
        <blockquote className="tr-question">Which changes from a person’s expected biological trajectory reliably precede detectable T1D-related autoimmunity—and which reveal a process we can safely influence?</blockquote>
        <div className="tr-actions">
          <a className="tr-button tr-primary" href="#explore">Explore the concept <span aria-hidden="true">↓</span></a>
          <a className="tr-button" href="/trajectories/design">Read the research design</a>
          <ShareDesign />
        </div>
        <p className="tr-version">Design version 1 · November 8, 2026 · Open for feedback</p>
      </section>

      <section className="tr-context" aria-labelledby="tr-context-title">
        <h2 id="tr-context-title">Four questions. Different kinds of evidence.</h2>
        <ol className="tr-questions">
          <li><span className="tr-step">01</span><h3>What changed?</h3><p>A departure from an expected biological pattern, with its context and uncertainty.</p></li>
          <li><span className="tr-step">02</span><h3>Does it predict?</h3><p>Useful information about a defined outcome, tested in independent people.</p></li>
          <li><span className="tr-step">03</span><h3>What explains it?</h3><p>Competing mechanisms and evidence that could distinguish them.</p></li>
          <li><span className="tr-step">04</span><h3>Can changing it help?</h3><p>Benefit, harms, and durability for a specific intervention and disease stage.</p></li>
        </ol>
      </section>

      <section id="explore" className="tr-explore" aria-labelledby="tr-explore-title">
        <div className="tr-section-heading"><div><p className="atlas-kicker">Explore the proposal</p><h2 id="tr-explore-title">Follow a finding through the evidence</h2></div><a href="/trajectories/design#initial-research-dossiers">About these examples <span aria-hidden="true">↗</span></a></div>
        <p className="tr-explore-intro">Choose a biological signal, then change the disease window or evidence view. Published observations and proposed next studies are labeled separately.</p>
        <TrajectoryExplorer />
        <p className="tr-caption">This concept uses selected published studies. It provides no individual risk estimate. Participant-data analysis and prediction models remain proposed work.</p>
      </section>

      <section className="tr-first-study" aria-labelledby="tr-first-study-title">
        <div>
          <p className="atlas-kicker">A concrete first test</p>
          <h2 id="tr-first-study-title">Does tracking change add useful information?</h2>
          <p>The proposed first benchmark asks whether a personal molecular trajectory improves prediction of first persistent, confirmed islet autoantibody positivity.</p>
          <p>It would compare three models using appropriately accessible longitudinal data. The key comparison is between the latest RNA measurement and that same information plus change over time.</p>
          <a href="/trajectories/design#proposed-primary-benchmark">Read the benchmark and validation plan <span aria-hidden="true">→</span></a>
        </div>
        <ol className="tr-models">
          <li><span>A</span><div><h3>Available risk information</h3><p>Age, inherited and family risk, and available context.</p></div></li>
          <li><span>B</span><div><h3>Add the current molecular state</h3><p>The same information plus the latest predefined RNA-module values.</p></div></li>
          <li><span>C</span><div><h3>Add the trajectory</h3><p>The same information plus deviations, slopes, persistence, or recovery.</p></div></li>
        </ol>
      </section>

      <section className="tr-feedback" aria-labelledby="tr-feedback-title">
        <div><p className="atlas-kicker">Build this with us</p><h2 id="tr-feedback-title">Help shape the next version</h2><p>Families, people living with T1D, clinicians, researchers, and developers bring different questions. We welcome all of them.</p></div>
        <ul className="tr-feedback-prompts">
          <li><strong>Clarity</strong><span>Where does the design need a clearer explanation—or suggest more certainty than the evidence supports?</span></li>
          <li><strong>Missing evidence</strong><span>Which studies, datasets, negative findings, or alternative explanations should be included?</span></li>
          <li><strong>Research priorities</strong><span>Which proposed question would you most like to see tested, and why?</span></li>
        </ul>
        <div className="tr-actions"><a className="tr-button tr-primary" href={feedbackUrl}>Suggest an improvement on GitHub <span aria-hidden="true">↗</span></a><a className="tr-button" href="https://github.com/elliroux/islet-atlas/tree/main/app/trajectories">Explore the source</a></div>
        <p className="tr-feedback-note">GitHub feedback is public and requires a GitHub account. Feedback about the design needs no personal health records.</p>
      </section>

      <div className="tr-footer"><a href="/trajectories/design">Complete research specification</a><a href="/trajectories/research-design.md" download>Download the specification (.md)</a><a href="/community">Contribute to Islet Atlas</a></div>
    </main>
  );
}
