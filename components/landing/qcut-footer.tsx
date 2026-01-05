import { Github, Twitter } from "lucide-react"
import Image from "next/image"

/**
 * Footer section for the landing page.
 * Displays logo, tagline, links, and copyright information.
 */
export const QcutFooter = () => {
  return (
    <footer className="py-12 px-6 border-t">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Image src="/qcut-logo.png" alt="QCut" width={90} height={40} className="h-10 w-auto" />
            <span className="text-sm text-muted-foreground text-center md:text-left">
              Simple video editing in your browser.
              <br />
              Your files. Your device. Your privacy.
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
            <div className="flex items-center gap-4 ml-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} QCut. All processing happens locally in your browser.
          </p>
        </div>
      </div>
    </footer>
  )
}
