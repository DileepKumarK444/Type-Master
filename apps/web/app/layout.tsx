import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/tokens.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "TypeMaster", template: "%s · TypeMaster" },
  description: "Learn to type faster with lessons, honest analytics and games.",
  applicationName: "TypeMaster",
  openGraph: { type: "website", siteName: "TypeMaster", title: "TypeMaster — type faster, understand why you’re slow", description: "Free typing lessons, a 30-second speed test, weak-key drills and games." },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Set the theme before first paint (no flash): saved choice, else the system preference. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("tm-theme");if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only z-50 rounded-token bg-accent px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 [[data-theme=dark]_&]:text-bg">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
