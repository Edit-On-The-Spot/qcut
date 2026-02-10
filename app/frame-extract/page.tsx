import { FrameExtractScreen } from "@/components/operations/frame-extract-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/frame-extract")

export default function FrameExtractPage() {
  return (
    <OperationLayout>
      <FrameExtractScreen />
    </OperationLayout>
  )
}
