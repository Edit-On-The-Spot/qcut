import { ActionsScreen } from "@/components/actions-screen"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata("/actions")

export default function ActionsPage() {
  return <ActionsScreen />
}
