# Production Database Setup Guide

## Option 1: PlanetScale (Recommended - Free Tier Available)

1. **Sign up at [PlanetScale](https://planetscale.com/)**
2. **Create a new database**
3. **Get connection string**:
   ```
   DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
   ```

## Option 2: Supabase (PostgreSQL - Free Tier Available)

1. **Sign up at [Supabase](https://supabase.com/)**
2. **Create a new project**
3. **Get connection string from Settings → Database**:
   ```
   DATABASE_URL="postgresql://postgres:password@host:5432/postgres"
   ```

## Option 3: Railway (PostgreSQL)

1. **Sign up at [Railway](https://railway.app/)**
2. **Deploy PostgreSQL**
3. **Get connection string**:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/database"
   ```

## Database Migration Steps

1. **Update your production DATABASE_URL in Netlify**
2. **The build process will automatically run migrations**:
   - `npx prisma generate` (generates Prisma client)
   - `npx prisma db push` (applies schema to production DB)

## Prisma Schema Compatibility

Your current schema in `prisma/schema.prisma` uses SQLite. For production databases:

### For MySQL (PlanetScale):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

### For PostgreSQL (Supabase/Railway):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
