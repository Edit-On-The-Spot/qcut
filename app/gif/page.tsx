import { GifScreen } from "@/components/operations/gif-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/gif")

export default function GifPage() {
  return (
    <OperationLayout>
      <GifScreen />
    </OperationLayout>
  )
}
