import { OverlayScreen } from "@/components/operations/overlay-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/overlay")

export default function OverlayPage() {
  return (
    <OperationLayout>
      <OverlayScreen />
    </OperationLayout>
  )
}
