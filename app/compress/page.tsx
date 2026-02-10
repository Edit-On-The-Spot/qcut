import { CompressScreen } from "@/components/operations/compress-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/compress")

export default function CompressPage() {
  return (
    <OperationLayout>
      <CompressScreen />
    </OperationLayout>
  )
}
