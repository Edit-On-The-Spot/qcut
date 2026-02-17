import { MergeScreen } from "@/components/operations/merge-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/merge", {
  title: "Merge Audio & Video - Qcut",
  description:
    "Combine separate audio and video files into one. Free browser-based audio-video merger.",
})

export default function MergePage() {
  return (
    <OperationLayout>
      <MergeScreen />
    </OperationLayout>
  )
}
