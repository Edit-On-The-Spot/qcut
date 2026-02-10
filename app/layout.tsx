import type React from "react"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"
import { Header } from "@/components/header"
import { FFmpegLoader } from "@/components/ffmpeg-loader"
import { NavigationGuard } from "@/components/navigation-guard"
import { BuildInfo } from "@/components/build-info"
import { AnalyticsTracker } from "@/components/analytics-tracker"
import { FeatureRequestButton } from "@/components/feature-request-button"
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
  title: "Qcut - Lightning-fast in-browser video editor",
  description: "Simple, powerful video editing powered by FFmpeg",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Qcut",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8508P87GEX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8508P87GEX');
          `}
        </Script>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <BuildInfo />
        <FFmpegLoader />
        <NavigationGuard />
        <Header />
        {children}
        <FeatureRequestButton />
      </body>
    </html>
  )
}
