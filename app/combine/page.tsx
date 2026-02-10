import { CombineScreen } from "@/components/operations/combine-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/combine")

export default function CombinePage() {
  return (
    <OperationLayout>
      <CombineScreen />
    </OperationLayout>
  )
}
