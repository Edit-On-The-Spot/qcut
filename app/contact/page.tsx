import { ContactForm } from "@/components/contact-form"

export const metadata = {
  title: "Contact Us - Qcut",
  description: "Get in touch with the Qcut team. We're here to help with questions, feedback, or support.",
}

/**
 * Contact page that displays the contact form.
 * Allows users to send messages to support@editonthespot.com.
 */
export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground">
            We'd love to hear from you. Whether you have a question, feedback, or need support,
            our team is here to help.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  )
}
