import { NormalizeAudioScreen } from "@/components/operations/normalize-audio-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/normalize-audio", {
  title: "Normalize Audio - Qcut",
  description:
    "Adjust audio levels for consistent loudness. Set target LUFS, true peak, and loudness range. Free in-browser audio normalizer.",
})

export default function NormalizeAudioPage() {
  return (
    <OperationLayout>
      <NormalizeAudioScreen />
    </OperationLayout>
  )
}
