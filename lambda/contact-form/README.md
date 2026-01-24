# Contact Form Lambda Function

This Lambda function handles contact form submissions from qcut.app and sends emails to support@editonthespot.com via AWS SES.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Node.js and npm installed
4. AWS SES configured with verified email addresses

## Setup

### 1. Verify Email Addresses in AWS SES

Before deploying, you need to verify the email addresses in AWS SES:

```bash
# Verify the FROM email address
aws ses verify-email-identity --email-address noreply@editonthespot.com

# Verify the TO email address
aws ses verify-email-identity --email-address support@editonthespot.com
```

Check your email inbox for verification emails and click the verification links.

### 2. Install Dependencies

```bash
cd lambda/contact-form
npm install
```

### 3. Build the Function

```bash
npm run build
```

### 4. Create the Lambda Function

#### Option A: Using AWS Console

1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Function name: `qcut-contact-form`
5. Runtime: Node.js 20.x
6. Architecture: x86_64
7. Create a new execution role with basic Lambda permissions
8. Click "Create function"
9. Add SES permissions to the Lambda execution role (see below)
10. Upload the function code (zip file)
11. Set environment variables (see below)

#### Option B: Using AWS CLI

First, create an IAM role for the Lambda function with SES permissions:

1. Create a trust policy file `trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

2. Create the role:

```bash
aws iam create-role \
  --role-name qcut-contact-form-lambda-role \
  --assume-role-policy-document file://trust-policy.json
```

3. Attach the basic Lambda execution policy:

```bash
aws iam attach-role-policy \
  --role-name qcut-contact-form-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

4. Create and attach a custom policy for SES (create `ses-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
aws iam put-role-policy \
  --role-name qcut-contact-form-lambda-role \
  --policy-name SESSendEmailPolicy \
  --policy-document file://ses-policy.json
```

5. Create the deployment package:

```bash
npm run package
```

6. Create the Lambda function:

```bash
aws lambda create-function \
  --function-name qcut-contact-form \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/qcut-contact-form-lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables="{FROM_EMAIL=noreply@editonthespot.com,TO_EMAIL=support@editonthespot.com,AWS_REGION=us-east-1}"
```

Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID.

### 5. Create API Gateway

1. Go to API Gateway Console
2. Click "Create API"
3. Choose "REST API" (not private)
4. Click "Build"
5. API name: `qcut-contact-api`
6. Click "Create API"
7. Click "Actions" > "Create Resource"
8. Resource name: `contact`
9. Enable CORS
10. Click "Create Resource"
11. Click "Actions" > "Create Method" > "POST"
12. Integration type: Lambda Function
13. Use Lambda Proxy integration: ✓
14. Lambda Function: `qcut-contact-form`
15. Click "Save"
16. Click "Actions" > "Enable CORS"
17. Click "Enable CORS and replace existing CORS headers"
18. Click "Actions" > "Deploy API"
19. Deployment stage: `prod` (create new stage)
20. Click "Deploy"
21. Copy the "Invoke URL" - this is your API endpoint

### 6. Update Frontend Environment Variable

Add the API Gateway URL to your frontend `.env.local` file:

```bash
NEXT_PUBLIC_CONTACT_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/contact
```

## Updating the Function

When you make changes to the Lambda function:

```bash
# Rebuild and repackage
npm run build
npm run package

# Update the Lambda function
aws lambda update-function-code \
  --function-name qcut-contact-form \
  --zip-file fileb://function.zip
```

## Environment Variables

The Lambda function uses the following environment variables:

- `FROM_EMAIL`: Email address to send from (default: `noreply@editonthespot.com`)
- `TO_EMAIL`: Email address to send to (default: `support@editonthespot.com`)
- `AWS_REGION`: AWS region for SES (default: `us-east-1`)

## Testing

You can test the function using AWS Lambda Console or AWS CLI:

```bash
aws lambda invoke \
  --function-name qcut-contact-form \
  --payload '{"body":"{\"name\":\"Test User\",\"email\":\"test@example.com\",\"subject\":\"Test Subject\",\"message\":\"Test message\"}"}' \
  response.json

cat response.json
```

## Monitoring

View logs in CloudWatch:

```bash
aws logs tail /aws/lambda/qcut-contact-form --follow
```

## Troubleshooting

### Emails Not Sending

1. Check that email addresses are verified in SES
2. Check Lambda execution role has SES permissions
3. Check CloudWatch logs for errors
4. If in SES sandbox, both sender and recipient must be verified

### CORS Errors

1. Ensure CORS is enabled on API Gateway
2. Check that Lambda returns proper CORS headers
3. Redeploy API Gateway after making CORS changes

### Lambda Timeout

If the function times out, increase the timeout value:

```bash
aws lambda update-function-configuration \
  --function-name qcut-contact-form \
  --timeout 60
```
