#!/bin/bash

# Database Setup Script for EduTube
# Usage: ./scripts/setup-database.sh [planetscale|supabase|local]

set -e

DB_TYPE=${1:-"local"}

echo "🗄️  Setting up database for: $DB_TYPE"

case $DB_TYPE in
  "planetscale")
    echo "📦 Setting up PlanetScale (MySQL)..."
    cp prisma/schema.production.prisma prisma/schema.prisma
    echo "✅ Schema updated for MySQL/PlanetScale"
    echo ""
    echo "📝 Next steps:"
    echo "1. Create a database at https://planetscale.com/"
    echo "2. Get your connection string"
    echo "3. Set DATABASE_URL in your environment"
    echo "4. Run: npm run db:generate && npx prisma db push"
    ;;
    
  "supabase")
    echo "📦 Setting up Supabase (PostgreSQL)..."
    # Update the schema to use PostgreSQL
    sed 's/provider = "mysql"/provider = "postgresql"/' prisma/schema.production.prisma > prisma/schema.prisma
    sed -i '' '/relationMode = "prisma"/d' prisma/schema.prisma
    echo "✅ Schema updated for PostgreSQL/Supabase"
    echo ""
    echo "📝 Next steps:"
    echo "1. Create a project at https://supabase.com/"
    echo "2. Get your connection string from Settings → Database"
    echo "3. Set DATABASE_URL in your environment"
    echo "4. Run: npm run db:generate && npx prisma db push"
    ;;
    
  "local")
    echo "📦 Setting up local SQLite..."
    # Restore original SQLite schema
    git checkout HEAD -- prisma/schema.prisma 2>/dev/null || echo "Using current schema"
    echo "✅ Schema set for SQLite (development)"
    echo ""
    echo "📝 Next steps:"
    echo "1. Run: npm run db:generate"
    echo "2. Run: npx prisma db push (if needed)"
    ;;
    
  *)
    echo "❌ Unknown database type: $DB_TYPE"
    echo "Usage: $0 [planetscale|supabase|local]"
    exit 1
    ;;
esac

echo ""
echo "🔧 Running Prisma generate..."
npm run db:generate

echo ""
echo "🧪 Testing database connection..."
npm run db:test

echo ""
echo "🎉 Database setup complete for $DB_TYPE!"
