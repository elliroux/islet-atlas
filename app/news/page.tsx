import NewsFeed from "../../components/NewsFeed";

export const metadata = { title: "News & Developments | Islet Atlas", description: "Source-linked news, funding announcements, and developments in type 1 diabetes research." };

export default function NewsPage() {
  return <main className="atlas-page"><p className="atlas-kicker">Research updates</p>
    <h1>News & Developments</h1>
    <p className="intro">Recent programs, ideas, and developments in type 1 diabetes research. We check Yale School of Medicine, Harvard Gazette, and Diabetes UK every six hours. Automatically collected stories are labeled and link to the original reporting; they have not been appraised as Atlas evidence. Source-checked backfill also includes Breakthrough T1D reports.</p>
    <p><a href="/">Back to overview</a> · <a href="/news/feed.xml">Subscribe via RSS</a></p>
    <NewsFeed />
  </main>;
}
