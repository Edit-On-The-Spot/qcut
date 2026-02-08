#!/bin/bash

# Deployment script for qcut contact form Lambda function
# Usage: ./deploy.sh [create|update]

set -e

FUNCTION_NAME="qcut-contact-form"
ROLE_NAME="qcut-contact-form-lambda-role"
REGION="${AWS_REGION:-us-east-1}"
FROM_EMAIL="${FROM_EMAIL:?FROM_EMAIL env var is required}"
TO_EMAIL="${TO_EMAIL:?TO_EMAIL env var is required}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== qcut Contact Form Lambda Deployment ===${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

# Build the function
echo -e "${YELLOW}Building function...${NC}"
npm run build

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
npm run package

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ "$1" == "create" ]; then
    echo -e "${YELLOW}Creating IAM role...${NC}"

    # Create trust policy
    cat > trust-policy.json <<EOF
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
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        || echo -e "${YELLOW}Role already exists${NC}"

    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        || echo -e "${YELLOW}Policy already attached${NC}"

    # Create SES policy
    cat > ses-policy.json <<EOF
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
EOF

    # Attach SES policy
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name SESSendEmailPolicy \
        --policy-document file://ses-policy.json

    # Wait for role to be ready
    echo -e "${YELLOW}Waiting for IAM role to be ready...${NC}"
    sleep 10

    # Create Lambda function
    echo -e "${YELLOW}Creating Lambda function...${NC}"
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 256 \
        --region $REGION \
        --environment Variables="{FROM_EMAIL=$FROM_EMAIL,TO_EMAIL=$TO_EMAIL}"

    echo -e "${GREEN}Lambda function created successfully!${NC}"

    # Clean up temp files
    rm -f trust-policy.json ses-policy.json

else
    # Update existing function
    echo -e "${YELLOW}Updating Lambda function code...${NC}"
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION

    echo -e "${GREEN}Lambda function updated successfully!${NC}"
fi

# Get function details
echo -e "${YELLOW}Getting function details...${NC}"
aws lambda get-function \
    --function-name $FUNCTION_NAME \
    --region $REGION \
    --query 'Configuration.FunctionArn' \
    --output text

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify email addresses in SES:"
echo "   aws ses verify-email-identity --email-address $FROM_EMAIL"
echo "   aws ses verify-email-identity --email-address $TO_EMAIL"
echo "2. Create API Gateway and configure it to use this Lambda function"
echo "3. Update .env.local with the API Gateway URL"
