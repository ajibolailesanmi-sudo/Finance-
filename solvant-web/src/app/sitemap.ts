import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/posts";

const BASE = "https://solvantlabs.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/services", "/work", "/process", "/insights", "/contact", "/privacy"];
  const pages = routes.map((r) => ({
    url: `${BASE}${r}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: r === "" ? 1 : 0.7,
  }));
  const posts = POSTS.map((p) => ({
    url: `${BASE}/insights/${p.slug}`,
    lastModified: new Date(p.date + "T00:00:00"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...pages, ...posts];
}
