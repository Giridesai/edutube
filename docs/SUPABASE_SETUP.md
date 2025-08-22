# Supabase Connection Guide (FREE) ⭐

## Why Supabase?
- **✅ Truly Free**: 500MB database, no time limits
- **✅ PostgreSQL**: Robust, production-ready database
- **✅ Great for Learning**: Perfect for development and small projects
- **✅ Easy Setup**: Simple dashboard and great docs

## Step 1: Create Supabase Account

1. Go to [Supabase](https://supabase.com/) 
2. Click "Start your project"
3. Sign up with GitHub (recommended)
4. Verify your email

## Step 2: Create New Project

1. **In Supabase Dashboard**: Click "New project"
2. **Organization**: Select your personal organization
3. **Project Settings**:
   - **Name**: `edutube` (or `edutube-production`)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users:
     - `us-east-1` - US East Coast
     - `us-west-1` - US West Coast  
     - `eu-west-1` - Europe
     - `ap-southeast-1` - Asia
4. **Click "Create new project"** - Takes 2-3 minutes

## Step 3: Get Connection String

1. **In your project dashboard** → **Settings** (gear icon)
2. **Go to "Database" section** (left sidebar)
3. **Scroll down to "Connection string"**
4. **Select "URI"** tab
5. **Copy the connection string** - it looks like:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

6. **Replace `[YOUR-PASSWORD]`** with the password you created in Step 2

## Step 4: Test Connection Locally

1. **Update your schema for PostgreSQL**:
   ```bash
   ./scripts/setup-database.sh supabase
   ```

2. **Set the DATABASE_URL temporarily**:
   ```bash
   export DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
   ```

3. **Test the connection**:
   ```bash
   npm run db:test
   ```

4. **Push your schema to Supabase**:
   ```bash
   npx prisma db push
   ```

## Step 5: Environment Variables

### For Local Development:
Keep SQLite in your `.env.local`:
```bash
DATABASE_URL="file:./dev.db"
```

### For Production (Netlify):
Use your Supabase connection string:
```bash
DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
```

## Step 6: Deploy to Netlify

1. **In Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. **Add New Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Supabase connection string (from Step 3)
3. **Trigger a new deploy** - Your schema will automatically migrate!

## Supabase Free Tier Benefits:
- **Storage**: 500MB (plenty for most apps)
- **API requests**: 50,000/month
- **Auth users**: 50,000 monthly active users
- **Realtime**: Included
- **No time limits** - Free forever!

## Bonus Features (Optional):
- **Built-in Auth**: Can replace NextAuth.js if desired
- **Real-time subscriptions**: For live features
- **Storage**: For file uploads
- **Edge Functions**: Serverless functions
