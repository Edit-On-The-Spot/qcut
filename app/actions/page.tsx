import { ActionsScreen } from "@/components/actions-screen"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/actions", {
  title: "Choose Action - Qcut",
  description:
    "Select a video editing operation — trim, convert, compress, resize, extract audio, create GIFs, and more. Free browser-based video editor.",
})

export default function ActionsPage() {
  return <ActionsScreen />
}
