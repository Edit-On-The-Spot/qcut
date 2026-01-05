import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "@/components/header"
import { FFmpegLoader } from "@/components/ffmpeg-loader"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "qcut.app - Swiss Army Knife Video Editor",
  description: "Simple, powerful video editing powered by FFmpeg",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "qcut",
  },
  icons: {
    icon: "/qcut-logo.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ServiceWorkerRegistration />
        <FFmpegLoader />
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
