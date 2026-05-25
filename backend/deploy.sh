#!/bin/bash
# Quick deploy to Railway

echo "🚀 CoachApp Backend - Quick Deploy Script"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Copy .env.example to .env and fill in your variables:"
    echo "   cp .env.example .env"
    exit 1
fi

echo "✅ .env file found"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Build
echo ""
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "⚠️  Migration warning (might already be up to date)"
fi

echo ""
echo "✅ All steps complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy to Railway:"
echo "     - Push code: git push origin main"
echo "     - Railway auto-detects Dockerfile and builds"
echo "  2. Or run locally:"
echo "     - npm run start:prod"
echo ""
