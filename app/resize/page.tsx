import { ResizeScreen } from "@/components/operations/resize-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/resize")

export default function ResizePage() {
  return (
    <OperationLayout>
      <ResizeScreen />
    </OperationLayout>
  )
}
