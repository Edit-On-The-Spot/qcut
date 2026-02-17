import { CombineScreen } from "@/components/operations/combine-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/combine", {
  title: "Combine Video Clips - Qcut",
  description:
    "Concatenate multiple video clips into one file. Free browser-based video joiner — no upload needed.",
})

export default function CombinePage() {
  return (
    <OperationLayout>
      <CombineScreen />
    </OperationLayout>
  )
}
