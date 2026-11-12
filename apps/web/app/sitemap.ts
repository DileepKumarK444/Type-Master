import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about", "/privacy", "/terms"].map((p) => ({ url: `${base}${p}`, changeFrequency: p ? "yearly" : "monthly", priority: p ? 0.4 : 1 }));
}
