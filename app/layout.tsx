import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Past-Tense | Hizaki Labs",
  description: "Converse with historically accurate temporal simulations.",
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      {/* suppressHydrationWarning prevents Grammarly from crashing the React tree */}
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}