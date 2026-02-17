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
#   - CloudFront distribution: set via CLOUDFRONT_DISTRIBUTION_ID env var
#   - Domain: https://qcut.app
#   - ACM certificate: set via AWS console

set -e

# Source deploy config if available
if [ -f .deploy.env ]; then
  set -a
  source .deploy.env
  set +a
fi

AWS_PROFILE="${AWS_PROFILE:-editonthespot}"
S3_BUCKET="${S3_BUCKET:-qcut.app}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID env var is required}"

echo "=== qcut.app Deploy ==="
echo ""

DEPLOY_TAG="deploy-$(date +%Y%m%d-%H%M%S)"
echo "Deploy tag: $DEPLOY_TAG"
echo ""

echo "[1/7] Installing dependencies..."
CI=true pnpm install --frozen-lockfile

echo ""
echo "[2/7] Building Next.js static export..."
pnpm build

echo ""
echo "[3/7] Uploading HTML files to S3 (no-cache)..."
AWS_PROFILE=$AWS_PROFILE aws s3 sync out/ s3://$S3_BUCKET/ \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache" \
  --delete

echo ""
echo "[4/7] Uploading hashed assets to S3 (immutable cache)..."
AWS_PROFILE=$AWS_PROFILE aws s3 sync out/_next/static/ s3://$S3_BUCKET/_next/static/ \
  --cache-control "public, max-age=31536000, immutable"

echo ""
echo "[5/7] Uploading other static assets to S3 (1 day cache)..."
AWS_PROFILE=$AWS_PROFILE aws s3 sync out/ s3://$S3_BUCKET/ \
  --exclude "*.html" \
  --exclude "_next/static/*" \
  --cache-control "public, max-age=86400" \
  --delete

echo ""
echo "[6/7] Invalidating CloudFront cache..."
AWS_PROFILE=$AWS_PROFILE aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*" \
  --output text

echo ""
echo "[7/7] Tagging deployment in git..."
git tag "$DEPLOY_TAG"
git push origin "$DEPLOY_TAG"

echo ""
echo "=== Deploy complete! ==="
echo "Site: https://qcut.app"
echo "Tag:  $DEPLOY_TAG"
