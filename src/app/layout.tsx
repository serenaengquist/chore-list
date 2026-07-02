import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chore List | Glitchtype",
  description: "A retro-terminal task management system built with Next.js, Supabase, and Glitchtype design system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
