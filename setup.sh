#!/bin/bash
set -e

echo ""
echo "📚 Setting up Archivd..."
echo ""

# Install root deps (concurrently)
echo "→ Installing root dependencies..."
npm install

# Install server deps
echo ""
echo "→ Installing server dependencies..."
cd server && npm install && cd ..

# Install client deps
echo ""
echo "→ Installing client dependencies..."
cd client && npm install && cd ..

# Seed demo data
echo ""
echo "→ Seeding demo data..."
cd server && node seed.js && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start Archivd, run:"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
echo "Demo login:"
echo "  Email:    demo@archivd.app"
echo "  Password: archivd"
echo ""
