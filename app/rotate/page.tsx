import { RotateScreen } from "@/components/operations/rotate-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/rotate")

export default function RotatePage() {
  return (
    <OperationLayout>
      <RotateScreen />
    </OperationLayout>
  )
}
