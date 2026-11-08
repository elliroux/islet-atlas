import { env } from "cloudflare:workers";
import { getChatGPTUser } from "./chatgpt-auth";
import type { Metadata } from "next";
import "./globals.css";
import "./atlas.css";
import AtlasShell from "../components/AtlasShell";
export const metadata: Metadata = {
 title: "Islet Atlas · Type 1 Diabetes Research Discovery",
 description: "Investigate findings across type 1 diabetes studies, trials and dataset catalogs.",
 icons: {icon: "/favicon.svg"}
};
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 const accessEnabled = env.ATLAS_AUTH_MODE === "access";
 const user = accessEnabled ? await getChatGPTUser() : null;
 return <html lang="en"><body>
  {accessEnabled && <nav aria-label="Account" className="flex justify-end gap-3 px-4 py-2 text-sm">
   {user ? <><span>{user.displayName}</span><a href="/atlas-sign-out">Sign out</a></>
    : <a href="/atlas-sign-in">Sign in</a>}
  </nav>}
  <AtlasShell>{children}</AtlasShell>
 </body></html>
}
