"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is Qcut really free?",
    answer: "Yes. Free to use, no watermarks, no limits, no hidden premium tier.",
  },
  {
    question: "Do I need to create an account?",
    answer: "Nope. Just open the page and start editing.",
  },
  {
    question: "Are my videos private?",
    answer:
      "Completely. Qcut runs in your browser — your files never leave your device. We literally cannot access them.",
  },
  {
    question: "What formats does Qcut support?",
    answer: "Import: MP4, WebM, and most common video formats. Export: MP4, WebM, MP3, WAV.",
  },
  {
    question: "How is this free? What's the catch?",
    answer: "No catch. Qcut is a showcase of what modern browsers can do with WebAssembly and FFmpeg.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Yes! Qcut works in any modern browser — desktop, tablet, or phone.",
  },
  {
    question: "How fast is it?",
    answer:
      "Most operations are nearly instant because we use smart processing that avoids re-encoding when possible.",
  },
]

/**
 * FAQ section for the landing page.
 * Displays frequently asked questions in an accordion format.
 */
export const FAQSection = () => {
  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="heading-1">Questions? Answered.</h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b border-border/50"
            >
              <AccordionTrigger className="text-left py-5 hover:no-underline hover:text-primary transition-colors">
                <span className="font-medium">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
