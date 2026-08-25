"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, BookOpen, Search, Bookmark, MessageSquare, Share2 } from "lucide-react";
import { getConfig, setConfig } from "./api-client";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const config = getConfig();
    setApiUrl(config.apiUrl);
    setApiKey(config.apiKey);
  }, []);

  const handleSaveSettings = () => {
    setConfig({ apiUrl, apiKey });
    setShowSettings(false);
    // Reload page to apply new config across all components
    window.location.reload();
  };

  const navItems = [
    { name: "Search", href: "/search", icon: Search },
    { name: "Collections", href: "/collections", icon: Bookmark },
    { name: "RAG Q&A", href: "/ask", icon: MessageSquare },
    { name: "Knowledge Graph", href: "/graph", icon: Share2 },
  ];

  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="flex min-h-full flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-400 hover:text-indigo-300 transition-colors">
                <BookOpen className="h-6 w-6" />
                <span>OpenKnowledge</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                        isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Mobile menu trigger could go here, but keep clean */}
              <button
                onClick={() => setShowSettings(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <p>© 2026 Universal Open Knowledge Search Engine. Powered by NestJS & Nvidia NIM.</p>
        </footer>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-400" />
                Connection Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    NestJS API Base URL
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="http://localhost:3000/api/v1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    API Key (x-api-key)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="demo-api-key-12345"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
