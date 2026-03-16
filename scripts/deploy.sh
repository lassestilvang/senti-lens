#!/bin/bash
set -euo pipefail

# ─── SentiLens Deployment Script ───────────────────────────────────────
# This script deploys the application to Firebase Hosting and configures GCP.
# Prerequisites: Firebase CLI installed and logged in.
#
# Usage: ./scripts/deploy.sh
# ───────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  SentiLens — Automated Deployment (Firebase/GCP)"
echo "════════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Verify Prerequisites ──────────────────────────────────────

echo "🔍 Checking prerequisites..."

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with 'npm install -g firebase-tools'"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found."
    exit 1
fi

echo "   ✓ Firebase CLI found: $(firebase --version)"
echo "   ✓ Node.js found: $(node --version)"

# Check Firebase login
if ! firebase projects:list &> /dev/null; then
    echo "❌ Firebase not logged in. Run 'firebase login' first."
    exit 1
fi

echo ""

# ─── Step 2: Build & Validate ──────────────────────────────────────────

echo "🔨 Step 1/3: Validating and building..."
cd "$PROJECT_DIR"

if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Deployment aborted."
    exit 1
fi

# Extract API Key to verify it's not empty
API_KEY=$(grep "NEXT_PUBLIC_GOOGLE_API_KEY" .env.local | cut -d '=' -f2)
if [ -z "$API_KEY" ]; then
    echo "❌ NEXT_PUBLIC_GOOGLE_API_KEY is missing in .env.local."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "   📦 Installing app dependencies..."
    npm install --silent
fi

npm run build

# ─── Step 3: Deploy to Firebase ─────────────────────────────────────────

echo "🚀 Step 2/3: Deploying Hosting & Firestore..."

firebase deploy --only hosting,firestore

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Ensure GOOGLE_API_KEY is set in your environment or Secret Manager."
echo "  2. Configure Firestore rules for SentiLensSessions collection."
echo "  3. Access your app at the hosting URL provided by Firebase."
echo ""
echo "  To run locally:  npm run dev"
echo ""
