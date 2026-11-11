"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const groups = [
  { title: "Explore", links: [
    ["Overview", "/"],
    ["Nano to Macro", "/nano-to-macro"],
    ["Connections", "/connections"],
    ["Trajectories", "/trajectories"],
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

  const [menuOpen, setMenuOpen] = useState(false);
  const navigationId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);

  function dismissOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    const dropdown = (event.target as HTMLElement).closest("details");
    if (dropdown?.open) {
      event.preventDefault();
      dropdown.open = false;
      dropdown.querySelector("summary")?.focus();
      return;
    }
    if (!menuOpen || !menuButton.current?.getClientRects().length) return;
    event.preventDefault();
    setMenuOpen(false);
    menuButton.current.focus();
  }

  function followNavigationLink(event: MouseEvent<HTMLAnchorElement>) {
    const dropdown = event.currentTarget.closest("details");
    if (dropdown) dropdown.open = false;
    if (!menuButton.current?.getClientRects().length) return;
    setMenuOpen(false);
    content.current?.focus();
  }

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
      <a className="atlas-skip" href="#atlas-content">Skip to content</a>
      <header className="atlas-brandbar">
        <a href="/" className="atlas-wordmark">Islet Atlas</a>

        <button
          ref={menuButton}
          className="atlas-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls={navigationId}
          onClick={() => setMenuOpen(!menuOpen)}
          onKeyDown={dismissOnEscape}
        >
          <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4h16M2 10h16M2 16h16" />
          </svg>
          Menu
        </button>
        <nav
          id={navigationId}
          className="atlas-nav"
          aria-label="Islet Atlas pages"
          data-open={menuOpen}
          onKeyDown={dismissOnEscape}
        >
          {groups.map(({ title, links }) => (
            <details className="atlas-nav-group" name="atlas-navigation" key={title}>
              <summary>{title}<span aria-hidden="true">⌄</span></summary>
              <div className="atlas-nav-links">
              {links.map(([label, href]) => {
                const [path, hash] = href.split("#");
                const targetView = new URLSearchParams(hash).get("view");
                const current = pathname === path && (path !== "/" || targetView === view);
                return <a key={href} href={href} onClick={followNavigationLink} aria-current={current ? "page" : undefined}>{label}</a>;
              })}
              </div>
            </details>
          ))}
        </nav>
        <a className="atlas-search-link" href="/research" aria-label="Search research"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></a>
      </header>
      <div className="atlas-layout">
        <div className="atlas-content" id="atlas-content" ref={content} tabIndex={-1}>{children}</div>
      </div>
    </div>
  );
}
