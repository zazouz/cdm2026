import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pronostics CDM 2026",
  description: "Pronostics Coupe du Monde 2026",
  icons: { icon: '/logo-fifa-2026.jpg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://flagcdn.com" />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
          <img src="/bg-fifa-2026.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-[1]">
          {children}
        </div>
      </body>
    </html>
  );
}
