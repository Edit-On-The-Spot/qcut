import { NormalizeAudioScreen } from "@/components/operations/normalize-audio-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/normalize-audio")

export default function NormalizeAudioPage() {
  return (
    <OperationLayout>
      <NormalizeAudioScreen />
    </OperationLayout>
  )
}
