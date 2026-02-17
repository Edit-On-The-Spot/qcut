import { ConvertScreen } from "@/components/operations/convert-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/convert", {
  title: "Convert Video Format - Qcut",
  description:
    "Convert videos between MP4, WebM, AVI, MKV and more formats. Free browser-based video converter — no upload needed.",
})

export default function ConvertPage() {
  return (
    <OperationLayout>
      <ConvertScreen />
    </OperationLayout>
  )
}
