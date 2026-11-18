import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operly: the AI workspace for running your business",
  description:
    "Manage customers, sales, tasks and quotations in one workspace, with an AI assistant that handles the busywork.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
