# Video editing UI

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/js-projects-ac9747ae/v0-video-editing-ui)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/lQ2r1cbKtfh)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/js-projects-ac9747ae/v0-video-editing-ui](https://vercel.com/js-projects-ac9747ae/v0-video-editing-ui)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/lQ2r1cbKtfh](https://v0.app/chat/lQ2r1cbKtfh)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Contact Form

The application includes a contact form at `/contact` that sends emails to `support@editonthespot.com`. The contact form uses a serverless AWS Lambda function to send emails via AWS SES.

### Setup

1. Deploy the Lambda function (see `lambda/contact-form/README.md` for detailed instructions)
2. Create an API Gateway endpoint pointing to the Lambda function
3. Create a `.env.local` file with the API Gateway URL:
   ```
   NEXT_PUBLIC_CONTACT_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/contact
   ```

For full deployment instructions, see `lambda/contact-form/README.md`.