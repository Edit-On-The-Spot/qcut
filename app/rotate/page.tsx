import { RotateScreen } from "@/components/operations/rotate-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/rotate", {
  title: "Rotate & Flip Video - Qcut",
  description:
    "Rotate or flip your video with lossless metadata rotation for MP4/MOV. Free browser-based video rotator.",
})

export default function RotatePage() {
  return (
    <OperationLayout>
      <RotateScreen />
    </OperationLayout>
  )
}
