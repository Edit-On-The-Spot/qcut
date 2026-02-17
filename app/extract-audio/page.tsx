import { ExtractAudioScreen } from "@/components/operations/extract-audio-screen"
import { OperationLayout } from "@/components/operation-layout"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/extract-audio", {
  title: "Extract Audio from Video - Qcut",
  description:
    "Extract audio tracks from video as MP3 or WAV. Free browser-based audio extractor — no upload needed.",
})

export default function ExtractAudioPage() {
  return (
    <OperationLayout>
      <ExtractAudioScreen />
    </OperationLayout>
  )
}
