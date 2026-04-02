import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Hitachi2 Parking",
    short_name: "Hitachi2",
    description: "Reservation, check-in et suivi des places de parking.",
    start_url: "/",
    scope: "/",
    lang: "fr",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Parking",
        short_name: "Parking",
        url: "/parking",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
      },
      {
        name: "Mon compte",
        short_name: "Compte",
        url: "/account",
      },
    ],
  };
}
