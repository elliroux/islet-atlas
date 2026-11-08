import type { Metadata } from "next";
import type { ReactNode } from "react";
import blocks from "../../../research/trajectory-design.json";
import "../style.css";

export const metadata: Metadata = {
  title: "Trajectories Research Design · Islet Atlas",
  description: "The complete proposed evidence model, biological trajectory benchmark, validation plan, and implementation sequence for Islet Atlas Trajectories.",
  alternates: { canonical: "https://isletatlas.org/trajectories/design" },
};

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function inline(text: string): ReactNode[] {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  const nodes: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    nodes.push(text.slice(end, index));
    if (match[1]) nodes.push(<a key={index} href={match[2]}>{match[1]}</a>);
    else if (match[3]) nodes.push(<strong key={index}>{match[3]}</strong>);
    else nodes.push(<code key={index}>{match[4]}</code>);
    end = index + match[0].length;
  }
  nodes.push(text.slice(end));
  return nodes;
}

function documentContent() {
  const content: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.startsWith("## ")) {
      const title = block.slice(3);
      content.push(<h3 key={i} id={slug(title)}>{title}</h3>);
    } else if (block.startsWith("# ")) {
      const title = block.slice(2);
      content.push(<h2 key={i} id={slug(title)}>{title}</h2>);
    } else if (block.startsWith("|")) {
      const rows = block.trim().split("\n").map(row => row.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim()));
      content.push(<div key={i} className="tr-table-scroll"><table><thead><tr>{rows[0].map((cell, n) => <th key={n} scope="col">{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(2).map((row, n) => <tr key={n}>{row.map((cell, col) => <td key={col}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
    } else if (/^(\d+\. |[-*] )/.test(block)) {
      const ordered = /^\d+\. /.test(block);
      const start = i;
      const items: string[] = [];
      while (i < blocks.length && (ordered ? /^\d+\. / : /^[-*] /).test(blocks[i])) {
        items.push(blocks[i].replace(/^(\d+\. |[-*] )/, ""));
        i++;
      }
      i--;
      const children = items.map((item, n) => <li key={n}>{inline(item)}</li>);
      content.push(ordered ? <ol key={start}>{children}</ol> : <ul key={start}>{children}</ul>);
    } else {
      content.push(<p key={i}>{inline(block)}</p>);
    }
  }
  return content;
}

export default function TrajectoryResearchDesign() {
  const headings = blocks.filter(block => block.startsWith("# ")).map(block => block.slice(2));
  return <main className="atlas-page trajectories-page">
    <div className="tr-document-heading">
      <a href="/trajectories">← Back to the interactive design preview</a>
      <p className="atlas-kicker">Complete specification · Design version 1 · November 8, 2026</p>
      <h1>Islet Atlas Trajectories Research Design</h1>
      <div className="tr-actions"><a className="tr-button" href="/trajectories/research-design.md" download>Download the specification (.md)</a><a className="tr-button" href="/trajectories#tr-feedback-title">Suggest an improvement</a></div>
    </div>
    <nav className="tr-contents" aria-labelledby="tr-contents-title"><h2 id="tr-contents-title">In this design</h2><ul>{headings.map(title => <li key={title}><a href={"#" + slug(title)}>{title}</a></li>)}</ul></nav>
    <article className="tr-document" aria-label="Research design specification">{documentContent()}</article>
    <div className="tr-footer"><a href="/trajectories">Explore the interactive concept</a><a href="https://github.com/elliroux/islet-atlas">Open source on GitHub</a></div>
  </main>;
}
