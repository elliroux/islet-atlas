import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
 title: "Islet Atlas · Type 1 Diabetes Research Discovery",
 description: "Investigate findings across type 1 diabetes studies, trials and dataset catalogs.",
 icons: {icon: "/favicon.svg"}
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>
}
