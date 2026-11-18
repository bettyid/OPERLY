import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const rubik = localFont({
  src: "./fonts/rubik-latin-wght-normal.woff2",
  variable: "--font-rubik",
  weight: "300 900",
  display: "swap",
});

const nunito = localFont({
  src: "./fonts/nunito-sans-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

const fraunces = localFont({
  src: "./fonts/fraunces-latin-wght-normal.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Operly: your business, understood",
  description:
    "A worldwide AI business operating system. Manage customers, sales, tasks and quotations in one workspace, with an AI assistant that handles the busywork.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full ${rubik.variable} ${nunito.variable} ${fraunces.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
