import "./tokens.css";
import "./globals.css";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Figtree } from "next/font/google";

// Self-hosted at build time: no request to Google from the clinician's browser.
const figtree = Figtree({ subsets: ["latin"], variable: "--font" });

export const metadata: Metadata = {
  title: "Neuronara — every standard in clinical neurophysiology, one question away",
  description: "Criteria, terminology, technical standards and protocols for EEG, EMG/NCS, evoked potentials, sleep and IONM. Ask which applies; see where it comes from.",
  icons: { icon: "/icon.svg" },
  metadataBase: new URL("https://neuronara.technoir.cloud"),
  openGraph: { title: "Neuronara", description: "Every standard in clinical neurophysiology, one question away.", type: "website" },
};

// Runs before first paint so a stored dark preference never flashes white (and vice versa).
const THEME = `try{document.documentElement.dataset.theme=localStorage.getItem("neuronara.theme")||"light"}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={figtree.variable} data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head>
      <body>{children}<Footer /></body>
    </html>
  );
}
