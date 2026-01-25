"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { markSpaNavigation } from "@/lib/use-require-video"

interface BackButtonProps {
  /** The path to navigate to. Default: "/actions" */
  href?: string
  /** The label to display. Default: "Back" */
  label?: string
  /** Additional class name */
  className?: string
}

/**
 * Reusable back button component for navigation.
 */
export function BackButton({
  href = "/actions",
  label = "Back",
  className,
}: BackButtonProps) {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      onClick={() => {
        markSpaNavigation()
        router.push(href)
      }}
      className={className}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
