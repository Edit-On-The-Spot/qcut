import type { Metadata } from "next"

/** Creates page metadata with canonical URL and hreflang tags. */
export function createPageMetadata(
  path: string,
  overrides?: Omit<Metadata, "alternates">,
): Metadata {
  return {
    ...overrides,
    alternates: {
      canonical: path,
      languages: {
        en: path,
        "x-default": path,
      },
    },
  }
}
