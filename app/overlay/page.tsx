import { OverlayScreen } from "@/components/operations/overlay-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/overlay", {
  title: "Add Overlay to Video - Qcut",
  description:
    "Add image watermarks or overlays to your video. Position, scale, and set opacity. Free in-browser video overlay tool.",
})

export default function OverlayPage() {
  return (
    <OperationLayout>
      <OverlayScreen />
    </OperationLayout>
  )
}
