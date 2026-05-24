import type { Metadata } from "next";
import { Fraunces, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sloopquest — a workspace for marine surveyors",
  description:
    "Capture findings on the dock. Ship polished reports the same day. An almanac-grade workspace built for marine surveyors who care about their craft.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <div className="grain" aria-hidden />
        <div className="vignette" aria-hidden />
        {children}
      </body>
    </html>
  );
}
