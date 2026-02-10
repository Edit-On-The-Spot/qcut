"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const MAX_EMAIL_LENGTH = 254
const MAX_MESSAGE_LENGTH = 5000

const featureRequestSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(MAX_EMAIL_LENGTH, `Email must be ${MAX_EMAIL_LENGTH} characters or less`),
  message: z
    .string()
    .min(10, "Please describe the feature in at least 10 characters")
    .max(MAX_MESSAGE_LENGTH, `Description must be ${MAX_MESSAGE_LENGTH} characters or less`),
})

type FeatureRequestData = z.infer<typeof featureRequestSchema>

/**
 * Floating action button that opens a feature request dialog.
 * Submits to the same contact form API with auto-filled name and subject fields.
 */
export function FeatureRequestButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeatureRequestData>({
    resolver: zodResolver(featureRequestSchema),
  })

  const onSubmit = async (data: FeatureRequestData) => {
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_CONTACT_API_URL
      if (!apiUrl) {
        throw new Error("Contact form is not configured")
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Feature Request",
          email: data.email,
          subject: "Feature Request",
          message: data.message,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send feature request")
      }

      setSubmitStatus({
        type: "success",
        message: "Thank you for your suggestion! We'll review it soon.",
      })
      reset()
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Failed to send feature request. Please try again later.",
      })
      console.error("Feature request error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setSubmitStatus(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Request a feature"
        >
          <Lightbulb className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a Feature</DialogTitle>
          <DialogDescription>
            Have an idea for Qcut? We'd love to hear it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feature-email">Email</Label>
            <Input
              id="feature-email"
              type="email"
              placeholder="your.email@example.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature-message">What feature would you like?</Label>
            <textarea
              id="feature-message"
              placeholder="Describe the feature you'd like to see..."
              {...register("message")}
              disabled={isSubmitting}
              className="w-full min-h-[120px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.message && (
              <p className="text-sm text-red-500">{errors.message.message}</p>
            )}
          </div>

          {submitStatus && (
            <div
              className={`p-3 rounded-md text-sm ${
                submitStatus.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {submitStatus.message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Submit Feature Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
