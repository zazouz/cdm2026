import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "CDM 2026",
  description: "Pronostics Coupe du Monde 2026",
  appleWebApp: {
    capable: true,
    title: "CDM 2026",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://flagcdn.com" />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <ServiceWorkerRegistration />
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden style={{ backgroundImage: "url('/bg-fifa-2026.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.2 }} />
        <div className="relative z-[1]">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
