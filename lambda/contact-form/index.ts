import { SES } from "@aws-sdk/client-ses";

// Use us-west-2 for SES since that's where the verified identity is configured
const ses = new SES({ region: process.env.SES_REGION || "us-west-2" });

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface LambdaEvent {
  body: string;
  headers?: { [key: string]: string };
}

interface LambdaResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

/**
 * Lambda handler for processing contact form submissions.
 * Sends emails to REDACTED_EMAIL via AWS SES.
 */
export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.headers && event.headers["X-HTTP-Method"] === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Parse request body
    const data: ContactFormData = JSON.parse(event.body);

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
      Source: process.env.FROM_EMAIL || "qcut@editonthespot.com",
      Destination: {
        ToAddresses: [process.env.TO_EMAIL || "REDACTED_EMAIL"],
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
