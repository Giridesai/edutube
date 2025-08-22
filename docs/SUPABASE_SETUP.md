# Supabase Connection Guide

## Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up
2. Click "New project"
3. Choose a name (e.g., "edutube-production")
4. Set a strong database password
5. Select a region

## Step 2: Get Connection String

1. In your Supabase dashboard, go to Settings → Database
2. Scroll down to "Connection String"
3. Copy the URI - it looks like:

```
DATABASE_URL="postgresql://postgres:your-password@host:5432/postgres"
```

## Step 3: Update Prisma Schema

For PostgreSQL, your schema should use:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Step 4: Environment Variables

### For Production (Netlify):
```bash
DATABASE_URL="postgresql://postgres:your-password@host:5432/postgres"
```

## Advantages of Supabase:
- Free tier with 500MB database
- Real-time subscriptions
- Built-in authentication (if you want to replace NextAuth)
- Auto-generated APIs
- Built-in storage for files
