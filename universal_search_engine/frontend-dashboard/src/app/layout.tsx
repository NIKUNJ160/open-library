import type { Metadata } from "next";
import { ClientShell } from "../components/client-shell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://openlibrary.pages.dev";

export const metadata: Metadata = {
  title: {
    default: "Universal Open Knowledge Search Engine | 33 Open Access Sources",
    template: "%s | OpenKnowledge",
  },
  description:
    "Federated search engine querying 33 authoritative open-access sources in parallel. Discover academic research papers, public domain books, open datasets, and patents with AI RAG and semantic knowledge graph.",
  keywords: [
    "open access search engine",
    "academic paper search",
    "free research papers",
    "public domain books",
    "open datasets",
    "patent search",
    "arXiv",
    "PubMed",
    "OpenAlex",
    "RAG research assistant",
    "knowledge graph",
  ],
  authors: [{ name: "OpenKnowledge Engine Contributors" }],
  creator: "OpenKnowledge Engine",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Universal Open Knowledge Search Engine",
    description:
      "Search 33 open-access knowledge sources in parallel. Free academic research papers, books, datasets, and patents with grounded AI Q&A.",
    siteName: "OpenKnowledge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal Open Knowledge Search Engine",
    description:
      "Federated open-access search engine across 33 scientific and academic repositories. Built with NestJS, pgvector, and Next.js.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="flex min-h-full flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
