import { GifScreen } from "@/components/operations/gif-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/gif", {
  title: "Create GIF from Video - Qcut",
  description:
    "Convert video clips to animated GIFs. Set start time, duration, and frame rate. Free in-browser GIF maker.",
})

export default function GifPage() {
  return (
    <OperationLayout>
      <GifScreen />
    </OperationLayout>
  )
}
