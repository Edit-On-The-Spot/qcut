"use client"

/**
 * Why Qcut section for the landing page.
 * Explains the value proposition and unique selling points.
 */
export const WhyQcutSection = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="heading-1">Why Qcut?</h2>
        <p className="heading-3 mt-4 text-muted-foreground">Edit videos without the headache.</p>
        <p className="body-large mt-6 text-muted-foreground leading-relaxed">
          No confusing timelines. No subscription fees. No privacy concerns. Qcut runs entirely in
          your browser, so your videos never touch our servers.
        </p>
        <p className="text-muted-foreground mt-4 italic">
          Perfect for quick edits when you don&apos;t want to open heavyweight software.
        </p>
      </div>
    </section>
  )
}
