# PlanetScale Connection Guide

## Step 1: Create PlanetScale Database

1. Go to [PlanetScale](https://planetscale.com/) and sign up
2. Click "Create database"
3. Choose a name (e.g., "edutube-production")
4. Select a region close to your users

## Step 2: Get Connection String

1. In your PlanetScale dashboard, click on your database
2. Go to "Connect" tab
3. Select "Prisma" from the dropdown
4. Copy the connection string - it looks like:

```
DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
```

## Step 3: Update Prisma Schema

Your schema needs to be updated for MySQL. Here's what to change:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"  // Required for PlanetScale
}
```

## Step 4: Environment Variables

### For Local Development:
Keep SQLite in your `.env.local`:
```bash
DATABASE_URL="file:./dev.db"
```

### For Production (Netlify):
Use PlanetScale connection string:
```bash
DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
```

## Step 5: Deploy Schema

After updating your schema, run:
```bash
npx prisma db push
```

This will create all your tables in PlanetScale.
