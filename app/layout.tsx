import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pronostics CDM 2026",
  description: "Pronostics Coupe du Monde 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
