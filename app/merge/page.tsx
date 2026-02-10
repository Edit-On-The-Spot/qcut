import { MergeScreen } from "@/components/operations/merge-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/merge")

export default function MergePage() {
  return (
    <OperationLayout>
      <MergeScreen />
    </OperationLayout>
  )
}
