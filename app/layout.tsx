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
        <Script id="schema-website" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: "https://qcut.app/",
            name: "Qcut",
            description:
              "Qcut is a lightning-fast in-browser video editor. Cut, trim, resize, convert formats, extract audio, create GIFs and export high-quality videos directly in your browser for free — no account, no upload, no watermarks.",
            publisher: {
              "@type": "Organization",
              name: "Edit on the Spot",
              url: "https://editonthespot.com/",
            },
            inLanguage: "en",
          })}
        </Script>
        <Script id="schema-software" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Qcut",
            url: "https://qcut.app/",
            description:
              "Free browser video editor that lets users cut, trim, convert and edit videos without creating an account or uploading files to a server.",
            applicationCategory: "MultimediaApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              url: "https://qcut.app/",
            },
            featureList: [
              "Trim & Cut unwanted parts of videos",
              "Convert video formats (MP4, WebM, MOV, AVI, MKV)",
              "Extract audio tracks (MP3, WAV)",
              "Resize & Crop video dimensions",
              "Compress videos to smaller file sizes",
              "Merge audio + video files",
              "Join multiple clips together",
              "Extract screenshots/frames",
              "Create GIFs from videos",
              "Normalize audio levels",
              "Rotate & flip videos",
              "Add Watermarks",
            ],
            publisher: {
              "@type": "Organization",
              name: "Edit on the Spot",
              url: "https://editonthespot.com/",
            },
            inLanguage: "en",
          })}
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
