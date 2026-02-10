import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://qcut.app"

  const operations = [
    "/trim",
    "/convert",
    "/compress",
    "/resize",
    "/extract-audio",
    "/merge",
    "/combine",
    "/frame-extract",
    "/gif",
    "/normalize-audio",
    "/rotate",
    "/overlay",
  ]

  const legal = ["/privacy", "/terms", "/cookies", "/contact"]

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...operations.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...legal.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ]
}
