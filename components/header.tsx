"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * Navigation header component.
 * Displays app logo and step indicators based on current route.
 */
export function Header() {
  const pathname = usePathname()

  const isImport = pathname === "/"
  const isActions = pathname === "/actions" || pathname.match(/^\/(trim|convert|compress|extract-audio|merge|gif|resize|frame-extract|combine)$/)
  const isExport = pathname === "/export"

  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-accent rounded">
              <span className="text-accent-foreground font-bold text-sm">Q</span>
            </div>
            <h1 className="text-xl font-semibold">qcut.ai</h1>
          </Link>
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/"
              className={`px-3 py-1 rounded transition-colors ${isImport ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
            >
              1. Import
            </Link>
            <div className="w-6 h-px bg-border" />
            <Link
              href="/actions"
              className={`px-3 py-1 rounded transition-colors ${isActions ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
            >
              2. Actions
            </Link>
            <div className="w-6 h-px bg-border" />
            <Link
              href="/export"
              className={`px-3 py-1 rounded transition-colors ${isExport ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
            >
              3. Export
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
