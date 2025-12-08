#!/bin/bash
# Deploy qcut to S3/CloudFront
# Builds the Next.js static export and syncs to S3
#
# Usage: ./deploy.sh
#
# Prerequisites:
#   - AWS CLI configured with 'editonthespot' profile
#   - pnpm installed
#
# Infrastructure:
#   - S3 bucket: qcut.app
#   - CloudFront distribution: REDACTED_CLOUDFRONT_ID
#   - Domain: https://qcut.app
#   - ACM certificate: arn:aws:acm:us-east-1:REDACTED_AWS_ACCOUNT_ID:certificate/REDACTED_CERT_UUID

set -e

AWS_PROFILE=editonthespot
S3_BUCKET=qcut.app
CLOUDFRONT_DISTRIBUTION_ID=REDACTED_CLOUDFRONT_ID

echo "=== qcut.app Deploy ==="
echo ""

echo "[1/4] Installing dependencies..."
CI=true pnpm install --frozen-lockfile

echo ""
echo "[2/4] Building Next.js static export..."
pnpm build

echo ""
echo "[3/4] Uploading to S3..."
AWS_PROFILE=$AWS_PROFILE aws s3 sync out/ s3://$S3_BUCKET/ --delete

echo ""
echo "[4/4] Invalidating CloudFront cache..."
AWS_PROFILE=$AWS_PROFILE aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*" \
  --output text

echo ""
echo "=== Deploy complete! ==="
echo "Site: https://qcut.app"
