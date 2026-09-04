import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "Appointment Board",
  description: "Dealership sales appointment board",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Applies a saved theme choice before first paint (no flash of the
            wrong theme). Next.js hoists beforeInteractive scripts into
            <head> regardless of where they're placed in the tree. Falls
            back to the server-rendered "light" default above when nothing's
            saved, or defers to prefers-color-scheme if the saved choice is
            "system" — see ThemeToggle.tsx. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}else if(t==="system"){document.documentElement.removeAttribute("data-theme");}}catch(e){}})();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
