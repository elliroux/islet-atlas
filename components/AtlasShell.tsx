"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const groups = [
  { title: "Explore", links: [
    ["Overview", "/"],
    ["Nano to Macro", "/nano-to-macro"],
    ["Connections", "/connections"],
    ["Find connections", "/#view=Find+connections"],
  ] },
  { title: "Evidence", links: [
    ["Findings", "/#view=Research+landscape"],
    ["Compare", "/#view=Evidence+comparison"],
    ["Research leads", "/#view=Research+leads"],
    ["Research collection", "/research"],
  ] },
  { title: "Workspace", links: [
    ["Investigate", "/#view=Explore+this+question"],
    ["Notebook", "/#view=Notebook"],
  ] },
  { title: "About", links: [
    ["Methods", "/#view=Sources+%26+methods"],
    ["Open source", "/community"],
  ] },
];

export default function AtlasShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [view, setView] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      setView(new URLSearchParams(window.location.hash.slice(1)).get("view"));
    }
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return (
    <div className="atlas-site">
      <header className="atlas-brandbar">
        <a href="/" className="atlas-wordmark"><img src="/favicon.svg" alt="" />Islet Atlas</a>
        <span>Type 1 diabetes research</span>
      </header>
      <div className="atlas-layout">
        <nav className="atlas-nav" aria-label="Islet Atlas pages">
          {groups.map(({ title, links }) => (
            <div className="atlas-nav-group" key={title}>
              <span>{title}</span>
              {links.map(([label, href]) => {
                const [path, hash] = href.split("#");
                const targetView = new URLSearchParams(hash).get("view");
                const current = pathname === path && (path !== "/" || targetView === view);
                return <a key={href} href={href} aria-current={current ? "page" : undefined}>{label}</a>;
              })}
            </div>
          ))}
        </nav>
        <div className="atlas-content">{children}</div>
      </div>
    </div>
  );
}
