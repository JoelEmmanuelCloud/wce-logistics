import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", site.url).toString(), changeFrequency: "monthly", priority: 1 },
    { url: new URL("/shop", site.url).toString(), changeFrequency: "daily", priority: 0.9 },
    { url: new URL("/privacy", site.url).toString(), changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/terms", site.url).toString(), changeFrequency: "yearly", priority: 0.3 },
    { url: new URL("/cookies", site.url).toString(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
