import { TrimScreen } from "@/components/operations/trim-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/trim")

export default function TrimPage() {
  return (
    <OperationLayout>
      <TrimScreen />
    </OperationLayout>
  )
}
