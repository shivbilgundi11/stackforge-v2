import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Scoped deliberately: display titles and the home hero only. It is what keeps
// the product from reading as stock shadcn, and it stops being that if it
// leaks into body copy.
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StackForge — Plan your AI stack before you build",
    template: "%s · StackForge",
  },
  description:
    "An AI engineering workbench. Estimate cost, compare tools, design architectures, and export the artifacts to build them.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the theme
    // class onto <html> before paint, which the server render cannot know about.
    <html lang="en" suppressHydrationWarning>
      {/* Also on <body>: browser extensions routinely inject attributes there
          (Grammarly, ColorZilla, password managers) before React hydrates,
          which otherwise reports as a hydration mismatch we cannot fix. */}
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrains.variable} ${instrument.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
