import type { Metadata, Viewport } from "next";
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
  title: "DriveBoard",
  description: "Dealership sales appointment board",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
  // Standalone launch (no Safari chrome) + a native-feeling status bar
  // when added to the iOS home screen.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DriveBoard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Lets fixed chrome (bottom nav, TV clock chip) extend into the safe
  // area on notched/home-indicator iOS devices instead of stopping short
  // of the edge — combined with env(safe-area-inset-*) padding below.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
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
