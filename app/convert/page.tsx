import { ConvertScreen } from "@/components/operations/convert-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/convert")

export default function ConvertPage() {
  return (
    <OperationLayout>
      <ConvertScreen />
    </OperationLayout>
  )
}
