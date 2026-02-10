import { ExtractAudioScreen } from "@/components/operations/extract-audio-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/extract-audio")

export default function ExtractAudioPage() {
  return (
    <OperationLayout>
      <ExtractAudioScreen />
    </OperationLayout>
  )
}
