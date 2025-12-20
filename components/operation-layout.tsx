import type React from "react"

interface OperationLayoutProps {
  children: React.ReactNode
}

/**
 * Wrapper layout for operation screens.
 * Provides consistent padding and spacing for all operation pages.
 */
export function OperationLayout({ children }: OperationLayoutProps) {
  return (
    <div className="container mx-auto px-6 py-12 min-h-screen">
      {children}
    </div>
  )
}
