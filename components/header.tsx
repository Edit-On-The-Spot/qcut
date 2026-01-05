"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Navigation header component.
 * Displays app logo with backdrop blur effect and theme toggle.
 */
export function Header() {
  const pathname = usePathname()
  const isLanding = pathname === "/"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/qcut-logo.png" alt="Qcut" width={80} height={36} className="h-9 w-auto" />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {!isLanding && (
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
