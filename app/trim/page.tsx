import { TrimScreen } from "@/components/operations/trim-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/trim", {
  title: "Trim & Cut Video - Qcut",
  description:
    "Cut and trim video segments directly in your browser. No upload required — fast, free, and private.",
})

export default function TrimPage() {
  return (
    <OperationLayout>
      <TrimScreen />
    </OperationLayout>
  )
}
