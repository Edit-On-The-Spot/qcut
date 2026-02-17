import { CompressScreen } from "@/components/operations/compress-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/compress", {
  title: "Compress Video - Qcut",
  description:
    "Reduce video file size while maintaining quality. Adjust CRF and encoding preset. Free in-browser video compressor.",
})

export default function CompressPage() {
  return (
    <OperationLayout>
      <CompressScreen />
    </OperationLayout>
  )
}
