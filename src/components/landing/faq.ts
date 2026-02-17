import type { Component } from "../../types"

interface FAQ {
  question: string
  answer: string
  category: string
}

const faqs: FAQ[] = [
  { category: "Getting started", question: "What is Qcut and who is it for?", answer: "Qcut is an online video and audio editor that runs in your browser and helps you turn long recordings into clean, shareable clips in minutes. It is designed for creators, marketers, educators, and teams who want professional results without learning complex editing software." },
  { category: "Getting started", question: "Do I need to install anything?", answer: "No. Qcut runs fully in your browser, so there are no downloads or plugins to install. Just open the site, upload a file, and start editing." },
  { category: "Getting started", question: "Do I need an account to use Qcut?", answer: "No account is required. You can start editing immediately without creating a profile or providing an email address. Qcut runs locally in your browser with no login barrier." },
  { category: "Getting started", question: "Is Qcut free?", answer: "Qcut is completely free to use, has no hidden premium tier, and does not add watermarks. It's also open source." },
  { category: "Getting started", question: "Which file types does Qcut support?", answer: "Qcut supports common video and audio formats such as MP4, MOV, WebM, MKV, AVI, and MP3. For best performance, use H.264 MP4 files in standard resolutions like 1080p." },
  { category: "Uploading & performance", question: "How do I upload a video or audio file?", answer: "Drag and drop your file onto the Qcut page or click the upload button to choose a file from your computer." },
  { category: "Uploading & performance", question: "Is there a maximum file size or length?", answer: "Qcut is optimized for typical webinars, meetings, podcasts, and event recordings, with practical limits based on your browser memory. If a file is too large, Qcut will guide you to trim, compress, or process it in parts." },
  { category: "Uploading & performance", question: "My upload is slow or stuck. What can I do?", answer: "Slow uploads are usually caused by large files or an underpowered computer (e.g. insufficient RAM). Try a smaller file or close other browser tabs to free up memory." },
  { category: "Uploading & performance", question: "Why is playback choppy in my browser?", answer: "Choppy playback is usually related to your device or browser performance, not the final export. Try closing other tabs, using a modern browser, or lowering preview quality — your exported file will still be rendered at the chosen settings." },
  { category: "Uploading & performance", question: "My video failed to upload or process. What should I do?", answer: "Most failures come from unsupported codecs, large files, or connection drops. Try exporting from your recording tool with recommended settings (MP4, H.264), then re-upload. If the problem persists, contact support with the file details." },
  { category: "Editing basics", question: "How do I cut or trim parts of my video?", answer: "Use the timeline at the bottom of Qcut, move the playhead to where you want to start, set an in-point, then move to the end and set an out-point. You can delete unwanted parts or turn selected ranges into clips with one click." },
  { category: "Editing basics", question: "Can I split a video into multiple clips and export them separately?", answer: "Yes. You can mark multiple segments, give each one a name, and export them all at once as separate files. This is ideal for cutting webinars into highlights, lessons, or social snippets." },
  { category: "Editing basics", question: "Can I merge clips into a single video?", answer: "You can combine segments or separate uploads into one timeline and export them as a single continuous video. This is useful when you want a supercut from several takes." },
  { category: "Editing basics", question: "Why is my cut not exactly where I set it?", answer: "Most lossless editors cut at keyframes, which can be a little before or after your chosen point. Qcut can offer both fast lossless-style cuts and more precise smart re-encode cuts, and will explain which mode you are using so results are predictable." },
  { category: "Quality & exports", question: "Does Qcut keep my original quality?", answer: "When possible, Qcut follows a lossless-style approach: it trims without re-encoding, so your video keeps its original quality and exports very quickly. When you use advanced effects, Qcut may re-encode parts of the video but will clearly indicate this." },
  { category: "Quality & exports", question: "Why does my exported file look or sound different?", answer: "Changes in resolution, bitrate, or codec can affect how your export looks and sounds. Qcut provides recommended export presets so you can balance quality, file size, and compatibility for platforms like YouTube, TikTok, and LinkedIn." },
  { category: "Quality & exports", question: "Can I export audio only?", answer: "Yes. You can export just the audio track as a podcast-friendly file when you only need sound. This is useful for turning webinars, talks, or video interviews into audio episodes." },
  { category: "Timeline, audio & visual tools", question: "Does Qcut show waveforms and thumbnails?", answer: "Qcut displays audio waveforms and optional video thumbnails on the timeline, so it is easy to find pauses, spikes, or visual changes. This makes trimming long recordings much faster." },
  { category: "Timeline, audio & visual tools", question: "Can I fix audio issues like noise or uneven volume?", answer: "Qcut includes tools to normalize audio across audio and video files which will even out the volume between speakers. However it doesn't fix noise issues." },
  { category: "Timeline, audio & visual tools", question: "Can I crop or change the aspect ratio of my video?", answer: "Yes. Qcut lets you crop your frame and switch between horizontal, vertical, and square formats to match platforms like TikTok, Reels, and YouTube." },
  { category: "Privacy & security", question: "Are my videos private and secure?", answer: "Your video files never leave your computer as they are processed entirely in your browser." },
  { category: "Privacy & security", question: "Does Qcut use my content to train AI?", answer: "No. Your files are processed locally in your browser and never sent to any server." },
  { category: "Support", question: "How can I contact Qcut support or request a feature?", answer: "You can reach Qcut support directly from within the app and submit bug reports or feature requests through a simple form." },
]

/** Groups FAQs by category, preserving insertion order. */
function groupByCategory(items: FAQ[]): Map<string, FAQ[]> {
  const groups = new Map<string, FAQ[]>()
  for (const item of items) {
    const existing = groups.get(item.category)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(item.category, [item])
    }
  }
  return groups
}

/**
 * FAQ section for the landing page.
 * Uses native <details>/<summary> instead of Radix Accordion.
 */
export function createFAQ(): Component {
  const groups = groupByCategory(faqs)

  let html = ""
  for (const [category, items] of groups) {
    html += `<div class="mb-8 last:mb-0">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">${category}</h3>`

    for (const faq of items) {
      html += `
      <details class="border-b border-border/50 group">
        <summary class="flex items-center justify-between cursor-pointer py-5 text-left hover:text-primary transition-colors">
          <span class="font-medium">${faq.question}</span>
          <svg class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </summary>
        <div class="text-muted-foreground pb-5">${faq.answer}</div>
      </details>`
    }

    html += `</div>`
  }

  const section = document.createElement("section")
  section.className = "py-24 px-6 bg-muted/30"
  section.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="heading-1">Questions? Answered.</h2>
      </div>
      ${html}
    </div>
  `

  return { element: section, destroy: () => {} }
}
