import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Open Library Knowledge Engine',
  description: 'Hybrid search and citation-grounded RAG across public knowledge domains',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>
            Open Library Knowledge Engine • Powered by Open Data, PostgreSQL, pgvector, and FastAPI.
          </p>
        </footer>
      </body>
    </html>
  );
}
