import { ResizeScreen } from "@/components/operations/resize-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/resize", {
  title: "Resize Video - Qcut",
  description:
    "Change video dimensions with preset or custom resolutions. Free browser-based video resizer — no upload needed.",
})

export default function ResizePage() {
  return (
    <OperationLayout>
      <ResizeScreen />
    </OperationLayout>
  )
}
