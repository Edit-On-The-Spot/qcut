import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "@/components/header"
import { FFmpegLoader } from "@/components/ffmpeg-loader"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "qcut.app - Swiss Army Knife Video Editor",
  description: "Simple, powerful video editing powered by FFmpeg",
  generator: "v0.app",
  icons: {
    icon: "/qcut-logo.png",
    apple: "/qcut-logo.png",
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
        <FFmpegLoader />
        <Header />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
