import type { MetadataRoute } from "next";

/** Permet instal·lar TradeLab com una app (mòbil i ordinador). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradeLab",
    short_name: "TradeLab",
    description: "Diari de trading, anàlisi i aprenentatge",
    lang: "ca",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#05070D",
    theme_color: "#05070D",
    categories: ["finance", "education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nova operació", url: "/diari/nova" },
      { name: "Calculadora", url: "/calculadora" },
      { name: "Informes de mercat", url: "/informes" },
    ],
  };
}
