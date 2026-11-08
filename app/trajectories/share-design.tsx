"use client";

import { useRef, useState } from "react";

const url = "https://isletatlas.org/trajectories";

export default function ShareDesign() {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const manualLink = useRef<HTMLInputElement>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }

  return <div className="tr-share">
    <button className="tr-button tr-share-button" type="button" onClick={copyLink}>{status === "copied" ? "Link copied" : "Copy page link"}</button>
    <span className="tr-screen-reader" role="status" aria-live="polite">{status === "copied" ? "Page link copied to the clipboard." : status === "manual" ? "Automatic copying is unavailable. Use the page address below." : ""}</span>
    {status === "manual" && <label className="tr-manual-link">Copy this page address<input ref={manualLink} readOnly value={url} onFocus={() => manualLink.current?.select()} /></label>}
  </div>;
}
