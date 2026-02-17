import { FrameExtractScreen } from "@/components/operations/frame-extract-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/frame-extract", {
  title: "Extract Frames from Video - Qcut",
  description:
    "Extract screenshots and frames from video as images. Free browser-based frame extractor.",
})

export default function FrameExtractPage() {
  return (
    <OperationLayout>
      <FrameExtractScreen />
    </OperationLayout>
  )
}
