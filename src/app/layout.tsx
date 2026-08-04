import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShotDeck",
  description: "Shot-level production tracker for AI-generated YouTube videos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center justify-between border-b border-black/[.08] px-8 py-3 dark:border-white/[.145]">
          <Link
            href="/"
            className="text-sm font-semibold text-black transition-colors hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            ShotDeck
          </Link>
          <Link
            href="/settings"
            className="text-sm text-zinc-500 hover:underline"
          >
            Settings
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
