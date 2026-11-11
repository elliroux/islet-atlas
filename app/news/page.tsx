import NewsFeed from "../../components/NewsFeed";

export const metadata = { title: "News & Developments | Islet Atlas", description: "Source-linked news, funding announcements, and developments in type 1 diabetes research." };

export default function NewsPage() {
  return <main className="atlas-page"><p className="atlas-kicker">Research updates</p>
    <h1>News & Developments</h1>
    <p className="intro">A curated feed of new programs, ideas, and developments in type 1 diabetes research. Each item links to its original source and distinguishes announcements from research findings.</p>
    <p><a href="/">Back to overview</a> · <a href="/news/feed.xml">Subscribe via RSS</a></p>
    <NewsFeed />
  </main>;
}
