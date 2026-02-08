import { SES } from "@aws-sdk/client-ses";

// Use us-west-2 for SES since that's where the verified identity is configured
const ses = new SES({ region: process.env.SES_REGION || "us-west-2" });

// Allowed origins for CORS - restrict to production and local development
const ALLOWED_ORIGINS = [
  "https://qcut.app",
  "https://www.qcut.app",
  "https://qcut.ai",
  "https://www.qcut.ai",
  "http://localhost:3000",
  "http://localhost:3001",
];

// Input length limits to prevent abuse
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 limit
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface LambdaEvent {
  body: string | null;
  headers?: { [key: string]: string };
  httpMethod?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
}

interface LambdaResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

/**
 * Gets the allowed origin from the request if it matches our allowlist.
 * Returns the specific origin if allowed, otherwise returns the first allowed origin.
 */
function getAllowedOrigin(requestOrigin?: string): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0]; // Default to production origin
}

/**
 * Lambda handler for processing contact form submissions.
 * Sends emails via AWS SES using FROM_EMAIL and TO_EMAIL env vars.
 */
export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  if (!process.env.FROM_EMAIL || !process.env.TO_EMAIL) {
    throw new Error("FROM_EMAIL and TO_EMAIL environment variables are required");
  }

  // Determine origin from request for CORS
  const requestOrigin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  // CORS headers - restricted to allowed origins
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  // Check both httpMethod and requestContext.http.method for compatibility
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Validate body exists before parsing
    if (typeof event.body !== "string" || !event.body.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid or missing request body",
        }),
      };
    }

    // Parse request body
    let data: ContactFormData;
    try {
      data = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid JSON in request body",
        }),
      };
    }

    // Validate parsed data is an object
    if (typeof data !== "object" || data === null) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Request body must be a JSON object",
        }),
      };
    }

    // Validate required fields
    if (!data.name || !data.email || !data.subject || !data.message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields",
        }),
      };
    }

    // Validate field types are strings
    if (
      typeof data.name !== "string" ||
      typeof data.email !== "string" ||
      typeof data.subject !== "string" ||
      typeof data.message !== "string"
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "All fields must be strings",
        }),
      };
    }

    // Validate input lengths to prevent abuse
    if (data.name.length > MAX_NAME_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Name must be ${MAX_NAME_LENGTH} characters or less`,
        }),
      };
    }
    if (data.email.length > MAX_EMAIL_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
        }),
      };
    }
    if (data.subject.length > MAX_SUBJECT_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or less`,
        }),
      };
    }
    if (data.message.length > MAX_MESSAGE_LENGTH) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less`,
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid email format",
        }),
      };
    }

    // Prepare email content
    const emailParams = {
      Source: process.env.FROM_EMAIL!,
      Destination: {
        ToAddresses: [process.env.TO_EMAIL!],
      },
      Message: {
        Subject: {
          Data: `[qcut.app Contact] ${data.subject}`,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #0a0a0a; color: white; padding: 20px; text-align: center; }
                  .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                  .field { margin-bottom: 15px; }
                  .label { font-weight: bold; color: #555; }
                  .value { margin-top: 5px; }
                  .message { white-space: pre-wrap; background-color: white; padding: 15px; border-left: 3px solid #0a0a0a; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2>New Contact Form Submission</h2>
                  </div>
                  <div class="content">
                    <div class="field">
                      <div class="label">From:</div>
                      <div class="value">${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;</div>
                    </div>
                    <div class="field">
                      <div class="label">Subject:</div>
                      <div class="value">${escapeHtml(data.subject)}</div>
                    </div>
                    <div class="field">
                      <div class="label">Message:</div>
                      <div class="message">${escapeHtml(data.message)}</div>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
            Charset: "UTF-8",
          },
          Text: {
            Data: `
New Contact Form Submission from qcut.app

From: ${data.name} <${data.email}>
Subject: ${data.subject}

Message:
${data.message}
            `,
            Charset: "UTF-8",
          },
        },
      },
      ReplyToAddresses: [data.email],
    };

    // Send email via SES
    await ses.sendEmail(emailParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Message sent successfully",
      }),
    };
  } catch (error) {
    console.error("Error processing contact form:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to send message",
      }),
    };
  }
};

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
