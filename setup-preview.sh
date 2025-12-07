#!/bin/bash
# Creates a Convex preview deployment and configures .env.local

set -e

PREVIEW_NAME="${1:-preview-$(git branch --show-current | sed 's/[^a-z0-9-]/-/g')}"
CLERK_KEY="pk_test_d29ya2FibGUtZG9nLTkzLmNsZXJrLmFjY291bnRzLmRldiQ"

if [ -z "$CONVEX_DEPLOY_KEY" ]; then
    echo "Error: CONVEX_DEPLOY_KEY not set."
    exit 1
fi

echo "Creating/updating Convex preview deployment: $PREVIEW_NAME"

# Deploy and capture output to get the URL
OUTPUT=$(pnpx convex deploy --preview-create "$PREVIEW_NAME" 2>&1) || {
    # If preview already exists, use --preview-name instead
    OUTPUT=$(pnpx convex deploy --preview-name "$PREVIEW_NAME" 2>&1)
}

echo "$OUTPUT"

# Extract the Convex URL from output
CONVEX_URL=$(echo "$OUTPUT" | grep -oP 'https://[a-z0-9-]+\.convex\.cloud' | head -1)

if [ -z "$CONVEX_URL" ]; then
    echo "Error: Could not extract Convex URL from deploy output"
    exit 1
fi

echo ""
echo "Creating .env.local with:"
echo "  VITE_CONVEX_URL=$CONVEX_URL"

cat > .env.local << EOF
VITE_CLERK_PUBLISHABLE_KEY=$CLERK_KEY
VITE_CONVEX_URL=$CONVEX_URL
EOF

echo ""
echo "Done! Run 'pnpm run dev:frontend' to start the app."
