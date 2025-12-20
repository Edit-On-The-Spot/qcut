import {
  Scissors,
  FileOutput,
  Minimize2,
  Music,
  Merge,
  Image,
  Maximize2,
  Film,
  Layers,
} from "lucide-react"

const features = [
  {
    icon: FileOutput,
    title: "Convert Format",
    description: "MP4, WebM, MOV, AVI & more",
  },
  {
    icon: Minimize2,
    title: "Compress Video",
    description: "Reduce file size intelligently",
  },
  {
    icon: Scissors,
    title: "Cut / Trim",
    description: "Remove unwanted sections",
  },
  {
    icon: Music,
    title: "Extract Audio",
    description: "Get MP3, WAV, or AAC",
  },
  {
    icon: Merge,
    title: "Merge Audio+Video",
    description: "Combine separate tracks",
  },
  {
    icon: Image,
    title: "Create GIF",
    description: "Animated clips made easy",
  },
  {
    icon: Maximize2,
    title: "Resize Video",
    description: "Change dimensions & aspect",
  },
  {
    icon: Film,
    title: "Frame Extract",
    description: "Export as PNG or JPG",
  },
  {
    icon: Layers,
    title: "Combine Clips",
    description: "Merge multiple videos",
  },
]

/**
 * Features grid section for the landing page.
 * Displays all available video editing features.
 */
export const QcutFeatures = () => {
  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="heading-1">Everything you need</h2>
          <p className="body-large mt-3">Powered by FFmpeg. Runs entirely in your browser.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-5 rounded-xl bg-card border hover:border-primary/30 hover:shadow-md transition-all duration-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
