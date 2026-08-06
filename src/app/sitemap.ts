import type { MetadataRoute } from "next";
import { listLessons } from "@/lib/course";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ai-kaoyan-tutor.vercel.app";
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/course`, lastModified: now },
    { url: `${base}/notes`, lastModified: now },
    { url: `${base}/chat`, lastModified: now },
    { url: `${base}/mistakes`, lastModified: now },
    { url: `${base}/logs`, lastModified: now },
  ];
  const lessons: MetadataRoute.Sitemap = listLessons().map((l) => ({
    url: `${base}/course/${encodeURIComponent(l.slug)}`,
    lastModified: now,
  }));
  return [...staticPages, ...lessons];
}
