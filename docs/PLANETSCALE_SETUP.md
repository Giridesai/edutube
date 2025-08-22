# PlanetScale Connection Guide

## Step 1: Sign Up and Create Account

1. Go to [PlanetScale](https://planetscale.com/) 
2. Click "Sign up" or "Get started for free"
3. Sign up with GitHub (recommended) or email
4. Complete account verification

## Step 2: Create PlanetScale Database

1. **In PlanetScale Dashboard**: Look for "Create database" button (large button on main page)
2. **Database Settings**:
   - **Name**: `edutube` (or `edutube-production`)
   - **Region**: Choose closest to your users:
     - `us-east-1` (Virginia) - US East Coast, Europe
     - `us-west-2` (Oregon) - US West Coast  
     - `eu-west-1` (Ireland) - Europe
     - `ap-southeast-1` (Singapore) - Asia/Pacific
3. **Click "Create database"** - Takes 1-2 minutes

## Step 3: Get Connection String

1. **Click on your database name** in the dashboard to enter it
2. **Navigate to "Connect" tab** (top navigation)
3. **Configuration**:
   - **Connect with**: Select **"Prisma"** from dropdown
   - **Database**: Select **"main"** (default branch)
   - **Region**: Should show your selected region
4. **Copy the connection string** - it looks like:

```
DATABASE_URL="mysql://xxxxx:pscale_pw_xxxxx@xxxxx.us-east-1.psdb.cloud/edutube?sslaccept=strict"
```

**Important**: This connection string contains:
- Username (first part before `:`)
- Password (starts with `pscale_pw_`)
- Host (the `.psdb.cloud` domain)
- Database name
- SSL configuration

## Step 4: Test Connection Locally (Optional)

To test your PlanetScale connection locally:

1. **Update your schema for MySQL**:
   ```bash
   ./scripts/setup-database.sh planetscale
   ```

2. **Set the DATABASE_URL temporarily**:
   ```bash
   export DATABASE_URL="your-planetscale-connection-string"
   ```

3. **Test the connection**:
   ```bash
   npm run db:test
   ```

4. **Push your schema to PlanetScale**:
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
Use your PlanetScale connection string:
```bash
DATABASE_URL="mysql://xxxxx:pscale_pw_xxxxx@xxxxx.us-east-1.psdb.cloud/edutube?sslaccept=strict"
```

## Step 6: Deploy to Netlify

1. **In Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. **Add New Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PlanetScale connection string (from Step 3)
3. **Trigger a new deploy** - Your schema will automatically migrate!

## Troubleshooting

### Connection Issues:
- Ensure you selected "Prisma" in the connect dropdown
- Verify the connection string has `?sslaccept=strict` at the end
- Check that your database region is accessible

### Schema Issues:
- Run `./scripts/setup-database.sh planetscale` to update schema
- Use `npx prisma db push` to sync schema with PlanetScale
- Check that `relationMode = "prisma"` is in your schema

## PlanetScale Free Tier Limits:
- **Storage**: 5 GB
- **Reads**: 1 billion/month  
- **Writes**: 10 million/month
- **Branches**: 1 development branch
- **Perfect for most applications!**
